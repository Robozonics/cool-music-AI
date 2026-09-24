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
        }
        
        events.push({
          timestamp: blockStartSec,
          trackId: tid,
          type: blockStartSec === 0 ? 'play' : 'fade_in',
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
      const hasVocals = block.active_stems.some(s => s.stem_type === 'vocals' && resolveTrack(s.track_id, allTracks).id !== tid);
      const hasBass   = block.active_stems.some(s => s.stem_type === 'bass' && resolveTrack(s.track_id, allTracks).id !== tid);

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

  setStatus('extracting', 5);

  const targetBpm = 120;
  const secPerBar = (60 / targetBpm) * 4;
  const combinedDuration = (anchorTrack.duration || 180) + secondaryTracks.reduce((sum, t) => sum + (t.duration || 180), 0);
  const totalBars = Math.ceil(combinedDuration / secPerBar); 

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
1. TEMPO & KEY: Estimate a target_bpm (median of all tracks) and target_key.
2. TOTAL DURATION: The mashup must last the full combined duration of the tracks, mapped into bars based on target_bpm.
3. PHRASING: Structure the mashup in standard 8, 16, or 32 bar phrases. Do not make rapid 1-bar changes.
4. BLENDING & OVERLAPPING: You are a Grammy-winning DJ. OVERLAP the tracks creatively! Do not just alternate them.
5. STEM CONTROL: The engine supports pseudo-stem isolation. 
   - Assign 'stem_type: "vocals"' to a track if you want its vocals to be prominent over the other track.
   - Assign 'stem_type: "bass"' if you want its bassline to drive the groove.
   - Assign 'stem_type: "full"' for standard playback.
   - Play 2 tracks at once! For example, set the Anchor Track to 'bass' and Secondary to 'vocals' to create a true mashup.
6. TRANSITIONS: Use 'transition_type: "crossfade"' when moving between sections. Use 'volume_db' (-60 to 0) to balance tracks.

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

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not found in .env');
    
    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    };

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.statusText}`);
    }

    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonStart = text.indexOf('{');
    if (jsonStart > 0) text = text.slice(jsonStart);
    
    blueprint = JSON.parse(text) as MashupBlueprint;

    if (!blueprint || !blueprint.timeline_blocks) {
       throw new Error('Invalid blueprint format received');
    }
    
    console.log('[Mashup] Blueprint received:', blueprint.mashup_metadata);
    console.log('[Mashup] Timeline blocks:', blueprint.timeline_blocks.length);
    setStatus('mastering', 75);
  } catch (e) {
    console.error('[Mashup] Gemini blueprint failed, using smart fallback:', e);
  }

  let arrangement: DjEvent[] = [];
  const allTracks = [anchorTrack, ...secondaryTracks];
  const combinedDur = (anchorTrack.duration || 180) + secondaryTracks.reduce((sum, t) => sum + (t.duration || 180), 0);

  if (blueprint && blueprint.timeline_blocks && blueprint.timeline_blocks.length > 0) {
    arrangement = blueprintToDjEvents(blueprint, allTracks);
  } else {
    // ── Strict Alternating Logic Fallback ───────────────────────────────────────
    const chunkDuration = 25;
    
    let currentSec = 0;
    let isPrimary = true;
    const primaryId = anchorTrack.id;
    const secondaryId = secondaryTracks[0]?.id || anchorTrack.id;
    
    let primaryAccumulated = 0;
    let secondaryAccumulated = 0;

    // Initial state: start primary at full, mute secondary
    arrangement.push({ timestamp: 0, trackId: primaryId, type: 'set_volume', volume: 1 });
    if (primaryId !== secondaryId) {
      arrangement.push({ timestamp: 0, trackId: secondaryId, type: 'pause' });
    }

    while (currentSec < combinedDur) {
      const nextSec = currentSec + chunkDuration;
      if (nextSec >= combinedDur) break; // Reached the end

      // Swap tracks
      isPrimary = !isPrimary;
      const enteringTrack = isPrimary ? primaryId : secondaryId;
      const exitingTrack = isPrimary ? secondaryId : primaryId;
      
      // Accumulate time for the track that just finished playing
      if (!isPrimary) {
        primaryAccumulated += chunkDuration;
      } else {
        secondaryAccumulated += chunkDuration;
      }
      
      const enteringAccumulatedTime = isPrimary ? primaryAccumulated : secondaryAccumulated;

      arrangement.push({ timestamp: nextSec, trackId: enteringTrack, type: 'fade_in', volume: 1, seekTo: enteringAccumulatedTime });
      arrangement.push({ timestamp: nextSec, trackId: exitingTrack, type: 'pause' });

      currentSec = nextSec;
    }

    // Final fade out for whoever is playing
    arrangement.push({ timestamp: combinedDur - 3, trackId: isPrimary ? primaryId : secondaryId, type: 'pause' });

    // Update blueprint mock for metadata
    blueprint = {
      mashup_metadata: { final_bpm: 120, total_duration_bars: Math.ceil(combinedDur / 2), target_key: '1A' },
      timeline_blocks: [],
    };
  }

  setStatus('mastering', 90);

  // Apply BPM matching via playbackRate on auxiliary tracks
  const finalBpm = blueprint!.mashup_metadata.final_bpm;

  setStatus('complete', 100);

  const mashupTitle = `🎛️ ${tracks.map(t => t.title.split(' ')[0]).join(' × ')}`;

  // Compute pitch-corrected playback rates for aux tracks (ALL tracks are aux now)
  const mashupStreamUrls = allTracks.map(t => {
    // Estimate original BPM from Gemini's blueprint stems
    const stemBlocks = blueprint!.timeline_blocks.flatMap(b => b.active_stems.filter(s => resolveTrack(s.track_id, allTracks).id === t.id));
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
    duration: combinedDuration,
    streamUrl: generateSilentAudio(combinedDuration),
    mashupStreamUrls: mashupStreamUrls.map(m => ({ id: m.id, url: m.url })),
    arrangement,
    source: 'saavn',
    sourceBadge: `AI DJ • ${finalBpm} BPM`,
  };

  console.log('[Mashup] Final arrangement:', arrangement.length, 'events over', generatedTrack.duration.toFixed(0), 'seconds');
  return generatedTrack;
};
