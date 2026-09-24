import type { Track, DjEvent, MashupBlueprint } from '../types/music';
import { useMashupStore } from '../store/useMashupStore';
import { AdvancedMashupEngine } from './advancedMashupEngine';

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
  const allTracks = [anchorTrack, ...secondaryTracks];

  setStatus('extracting', 10);

  let analyzedTracks = [];

  try {
    // 1. AI Analysis & Stems via Gemini (Fast High-Level Prompt to avoid 504)
    setStatus('syncing', 30);
    
    const promptText = `You are a Grammy-winning DJ and Audio Data Scientist. 
Analyze these songs and determine their musical structure (BPM, Camelot Key) and exact timestamp markers (in seconds) for a mashup. 
The user wants you to decide how long the mashup should be and where the best drop/cut points are.

TRACKS:
1 (ANCHOR): ${anchorTrack.title} by ${anchorTrack.artist} (Duration: ${anchorTrack.duration}s)
${secondaryTracks.map((t, i) => `${i + 2}: ${t.title} by ${t.artist} (Duration: ${t.duration}s)`).join('\n')}

OUTPUT STRICT JSON ONLY:
[
  {
    "id": "track_id",
    "bpm": 120,
    "key": "8A",
    "markers": {
      "intro_end": 15,
      "verse_start": 15,
      "chorus_start": 45,
      "chorus_end": 75,
      "bridge_start": 120,
      "outro_end": 160
    }
  }
]
(Generate this object for EVERY track provided, using their actual track IDs: ${allTracks.map(t=>t.id).join(', ')}). Make sure markers fit within their duration.`;

    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'mashup', prompt: promptText }),
    });

    if (!res.ok) throw new Error(`Gemini API error: ${res.statusText}`);
    
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    let aiData = data.blueprint;
    if (!Array.isArray(aiData)) {
      throw new Error('Gemini did not return an array of analyzed tracks');
    }

    // Merge AI suggestions with our Track objects
    analyzedTracks = allTracks.map(t => {
      const ai = aiData.find((a: any) => a.id === t.id) || { bpm: 120, key: '8A', markers: {} };
      const d = t.duration || 180;
      return {
        ...t,
        bpm: ai.bpm || 120,
        key: ai.key || '8A',
        markers: {
          intro_end: ai.markers?.intro_end || d * 0.1,
          verse_start: ai.markers?.verse_start || d * 0.1,
          chorus_start: ai.markers?.chorus_start || d * 0.3,
          chorus_end: ai.markers?.chorus_end || d * 0.5,
          bridge_start: ai.markers?.bridge_start || d * 0.7,
          outro_end: ai.markers?.outro_end || d * 0.9,
        }
      };
    });

  } catch (e) {
    console.error('[Mashup] Gemini AI Analysis failed, falling back to algorithmic analysis:', e);
    analyzedTracks = await AdvancedMashupEngine.analyzeAndSeparateStems(allTracks);
  }

  try {
    // 2. Dynamic Timeline Generation based on AI Markers
    setStatus('mastering', 80);
    const arrangement = AdvancedMashupEngine.calculateDynamicTimeline(analyzedTracks as any);
    
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
  } catch (e) {
    console.error('[Mashup] Engine timeline generation failed:', e);
    throw e;
  }
};
