import type { Track, DjEvent, MashupBlueprint } from '../types/music';
import { useMashupStore } from '../store/useMashupStore';

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

// ── Safe Track ID & Alias Resolver ───────────────────────────────────────────
export const resolveTrack = (rawIdOrTitle: any, allTracks: Track[]): Track => {
  if (!allTracks || allTracks.length === 0) {
    return { id: 'fallback', title: 'Unknown', artist: '', thumbnail: '', duration: 180, streamUrl: '', source: 'saavn' };
  }
  if (rawIdOrTitle === null || rawIdOrTitle === undefined) {
    return allTracks[0];
  }
  const query = String(rawIdOrTitle).trim();
  const lower = query.toLowerCase();

  // 1. Direct ID match (exact or case-insensitive)
  const exact = allTracks.find(t => t.id === query || t.id.toLowerCase() === lower);
  if (exact) return exact;

  // 2. Numeric 1-based index (e.g., "1" or 1 refers to track 1, "2" to track 2)
  const num = parseInt(query, 10);
  if (!isNaN(num) && String(num) === query && num >= 1 && num <= allTracks.length) {
    return allTracks[num - 1];
  }

  // 3. Anchor / primary / secondary aliases
  if (lower.includes('anchor') || lower.includes('primary') || lower.includes('main')) {
    return allTracks[0];
  }
  if ((lower.includes('secondary') || lower.includes('second')) && allTracks.length > 1) {
    return allTracks[1];
  }

  // 4. Substring / Title match
  const titleMatch = allTracks.find(t => {
    const tTitle = t.title.toLowerCase();
    return tTitle.includes(lower) || lower.includes(tTitle);
  });
  if (titleMatch) return titleMatch;

  // 5. Artist match
  const artistMatch = allTracks.find(t => {
    const tArtist = (t.artist || '').toLowerCase();
    return tArtist.length > 0 && (tArtist.includes(lower) || lower.includes(tArtist));
  });
  if (artistMatch) return artistMatch;

  // Fallback
  return allTracks[0];
};

// ── dB to linear volume ───────────────────────────────────────────────────────
export const dbToLinear = (db: any): number => {
  if (db === null || db === undefined) return 1;
  let val: number;
  if (typeof db === 'string') {
    const cleaned = db.replace(/[^\d.-]/g, '');
    val = parseFloat(cleaned);
  } else {
    val = Number(db);
  }
  if (!Number.isFinite(val) || isNaN(val)) {
    return 1;
  }
  const clampedDb = Math.min(6, Math.max(-60, val));
  return Math.pow(10, clampedDb / 20);
};

// ── Blueprint → DjEvent[] converter ──────────────────────────────────────────
export const blueprintToDjEvents = (
  blueprint: MashupBlueprint,
  allTracks: Track[]
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
    const blockTrackIds = new Set(
      block.active_stems.map(s => resolveTrack(s.track_id, allTracks).id)
    );

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
        const matched = resolveTrack(stem.track_id, allTracks);
        events.push({
          timestamp: blockStartSec,
          trackId: matched.id,
          type: 'highpass',
          filterHz: block.effects.filter_cutoff_hz,
        });
        // Clear filter halfway through block
        events.push({
          timestamp: (blockStartSec + blockEndSec) / 2,
          trackId: matched.id,
          type: 'filter_reset',
        });
      }
    } else if (block.effects?.transition_type === 'low_pass_sweep' && block.effects.filter_cutoff_hz) {
      for (const stem of block.active_stems) {
        const matched = resolveTrack(stem.track_id, allTracks);
        events.push({
          timestamp: blockStartSec,
          trackId: matched.id,
          type: 'lowpass',
          filterHz: block.effects.filter_cutoff_hz,
        });
        events.push({
          timestamp: (blockStartSec + blockEndSec) / 2,
          trackId: matched.id,
          type: 'filter_reset',
        });
      }
    }

    // Process stems in this block
    for (const stem of block.active_stems) {
      const matched = resolveTrack(stem.track_id, allTracks);
      const tid = matched.id;
      const linearVol = Math.min(1, Math.max(0, dbToLinear(stem.volume_db)));

      if (!activeTrackIds.has(tid)) {
        // New track entering
        
        // Find if this track has EVER played before in the timeline
        const hasPlayedBefore = events.some(e => e.trackId === tid && (e.type === 'play' || e.type === 'fade_in'));
        
        if (!hasPlayedBefore) {
          // Absolute first time it enters, seek to 0
          events.push({
            timestamp: Math.max(0, blockStartSec - 0.1),
            trackId: tid,
            type: 'seek',
            seekTo: 0,
          });

          // Sync tempo with the final bpm
          const trackBpm = blueprint.mashup_metadata.track_bpms?.[tid] || final_bpm;
          const playbackRate = final_bpm / trackBpm;
          
          events.push({
            timestamp: Math.max(0, blockStartSec - 0.1),
            trackId: tid,
            type: 'set_tempo',
            playbackRate: playbackRate,
          });
        }
        
        const transType = block.effects?.transition_type;
        events.push({
          timestamp: blockStartSec,
          trackId: tid,
          type: transType === 'crossfade' ? 'fade_in' : 'play',
          volume: linearVol,
        });

        // Apply pitch shift approximation via a note in volume (handled natively now if preservesPitch is toggled, but leaving for legacy)
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

      // Extreme EQ for pseudo-stem isolation (since we only have full tracks)
      if (stem.stem_type === 'vocals') {
        // Isolate vocals: Cut the lows (bass/kick) aggressively
        events.push({ timestamp: blockStartSec, trackId: tid, type: 'highpass', filterHz: 300 });
      } else if (stem.stem_type === 'instrumental' || stem.stem_type === 'drums' || stem.stem_type === 'bass') {
        // Isolate instrumental: Cut the mids (vocals) aggressively
        events.push({ timestamp: blockStartSec, trackId: tid, type: 'cut_vocals' });
      } else {
        // Full track or 'other': reset filters
        events.push({ timestamp: blockStartSec, trackId: tid, type: 'filter_reset' });
      }
    }
  }

  // Final fade out for all remaining tracks
  const lastBlock = blocks[blocks.length - 1];
  const totalSec = lastBlock ? barToSeconds(lastBlock.bar_end + 1, final_bpm) : barToSeconds(64, final_bpm);
  for (const tid of activeTrackIds) {
    events.push({ timestamp: Math.max(0, totalSec - 6), trackId: tid, type: 'fade_out' });
  }

  // Sort all events by timestamp
  return events.sort((a, b) => a.timestamp - b.timestamp);
};

// ── Silent Audio Generator ──────────────────────────────────────────────────
export const generateSilentAudio = (durationInSeconds: number): string => {
  const sampleRate = 8000;
  const numSamples = Math.ceil(sampleRate * durationInSeconds);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  
  view.setUint32(0, 1380533830, false); // RIFF
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 1463899717, false); // WAVE
  view.setUint32(12, 1718449184, false); // fmt 
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 1684108385, false); // data
  view.setUint32(40, numSamples * 2, true);
  
  const blob = new Blob([view], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

// ── Main mashup generator ─────────────────────────────────────────────────────
export const generateAiMashup = async (tracks: Track[], anchorTrackId: string): Promise<Track> => {
  const setStatus = useMashupStore.getState().setStatus;
  const anchorTrack = tracks.find(t => t.id === anchorTrackId) || tracks[0];
  const secondaryTracks = tracks.filter(t => t.id !== anchorTrack.id);
  const allTracks = [anchorTrack, ...secondaryTracks];

  setStatus('extracting', 10);

  try {
    // 1. AI Analysis & Blueprint Generation via Gemini
    setStatus('syncing', 30);
    
    const promptText = `You are a Grammy-winning DJ, music producer, and Audio Data Scientist. 
The user wants a highly emotional, beautifully intertwined mashup (like the viral Saiyara x Sahiba mashup).
You must sequence these tracks musically over a bar-based timeline. 
Instead of a rigid drop, interweave the vocals and instrumentals. For example:
- Start with a moody instrumental intro from the anchor track.
- Bring in the verse vocals of Track 2 over the anchor's instrumental.
- Blend the choruses, perhaps cutting the bass or mids of one track to make room for the other.
- Create a climax where elements from both tracks play off each other.
- End with a beautiful, echoing cooldown.

CRITICAL AUDIO ENGINEERING RULES:
1. **Key Clashing:** We cannot shift the pitch of the audio. If the two tracks are in incompatible musical keys, DO NOT layer their melodies/vocals together simultaneously! Instead, use one track purely for its "drums" (which have no key) while the other plays "vocals" or "instrumental". 
2. **Frequency Clashing:** Since this is an automated Web Audio engine, playing two "full" tracks at the same time will cause a loud, muddy mess. 
   - You MUST use the \`stem_type\` field to isolate frequencies.
   - If a track is providing the beat/melody, set its \`stem_type\` to "instrumental" or "drums" (this completely scoops out its vocal frequencies).
   - If a track is providing the singing, set its \`stem_type\` to "vocals" (this aggressively cuts its bass/kick drum).
3. NEVER have two tracks active with \`stem_type: "full"\` at the same time unless one is heavily faded out.
4. **Mastering:** I have added a Master Glue Compressor to the engine. If you isolate the stems properly, the compressor will perfectly duck the instrumental when the vocals hit, creating a studio-quality sidechain effect.

TRACKS:
1 (ANCHOR): ${anchorTrack.title} by ${anchorTrack.artist} (Duration: ${anchorTrack.duration}s)
${secondaryTracks.map((t, i) => `${i + 2}: ${t.title} by ${t.artist} (Duration: ${t.duration}s)`).join('\n')}

Assume a fitting tempo (e.g., final_bpm around 100-120 depending on the songs). 1 bar = 4 beats. 
You must return a STRICT JSON object representing a 'MashupBlueprint'. Do not wrap it in an array.
Keep the arrangement concise (exactly 32 bars long) to ensure fast generation.
Track IDs MUST match the ones provided.

SCHEMA:
{
  "mashup_metadata": {
    "final_bpm": 110,
    "total_duration_bars": 32,
    "target_key": "8A",
    "track_bpms": {
      "${anchorTrack.id}": 110
    }
  },
  "timeline_blocks": [
    {
      "bar_start": 1,
      "bar_end": 8,
      "active_stems": [
        { "track_id": "${anchorTrack.id}", "stem_type": "instrumental", "volume_db": 0, "pitch_shift_semitones": 0 }
      ],
      "effects": { "transition_type": "none" }
    }
  ]
}

Return ONLY the valid JSON object. No markdown formatting.`;

    let blueprint: any = null;
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'mashup', prompt: promptText }),
    });

    const data = await res.json().catch(() => null);
    
    if (!res.ok) {
      throw new Error(data?.error || `Gemini API error: ${res.status || res.statusText}`);
    }
    
    if (data?.error) throw new Error(data.error);

    blueprint = data.blueprint;
    
    // In gemini.ts, if it's parsed, we get it directly. If it was inside an array, extract it.
    if (Array.isArray(blueprint)) {
      blueprint = blueprint[0];
    }
    
    if (!blueprint || !blueprint.timeline_blocks) {
      throw new Error('Gemini did not return a valid MashupBlueprint');
    }

    setStatus('mastering', 80);
    const arrangement = blueprintToDjEvents(blueprint, allTracks);
    
    setStatus('complete', 100);

    const mashupTitle = `🎛️ ${tracks.map(t => t.title.split(' ')[0]).join(' × ')}`;
    
    const lastEvent = arrangement[arrangement.length - 1];
    const combinedDuration = lastEvent ? lastEvent.timestamp + 5 : 180;

    // Map all required pseudo-stems so the player can load them
    const mashupStreamUrls = allTracks.flatMap(t => [
      { id: t.id, url: t.streamUrl, playbackRate: 1 },
      { id: `${t.id}_inst`, url: t.streamUrl, playbackRate: 1 },
      { id: `${t.id}_vocal`, url: t.streamUrl, playbackRate: 1 }
    ]);

    const generatedTrack: Track = {
      id: `mashup-${Date.now()}`,
      title: mashupTitle,
      artist: `AI DJ Engine`,
      thumbnail: anchorTrack.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=500',
      duration: combinedDuration,
      streamUrl: generateSilentAudio(combinedDuration),
      mashupStreamUrls,
      arrangement,
      source: 'saavn',
      sourceBadge: `AI DJ ENGINE`,
    };

    console.log('[Mashup] Final arrangement:', arrangement.length, 'events over', generatedTrack.duration.toFixed(0), 'seconds');
    return generatedTrack;
  } catch (e: any) {
    console.error('[Mashup] Engine timeline generation failed:', e.message || e);
    throw e;
  }
};
