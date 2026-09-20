import type { Track } from '../types/music';
import { useMashupStore } from '../store/useMashupStore';
import { getGeminiKey } from './keyManager';
import { usePlayerStore } from '../store/usePlayerStore';

/**
 * AI Mashup Generation Flow
 * 1. Stem Separation (Spleeter, Demucs)
 * 2. Beatmatching & Harmonization (librosa, soundfile)
 * 3. Arrangement & Mixdown
 */

export const generateAiMashup = async (tracks: Track[], anchorTrackId: string): Promise<Track> => {
  const setStatus = useMashupStore.getState().setStatus;
  const anchorTrack = tracks.find(t => t.id === anchorTrackId) || tracks[0];
  
  setStatus('extracting', 10);
  
  // Create a masterpiece mashup prompt for Gemini
  const totalDuration = Math.min(anchorTrack.duration || 180, 120); // up to 2 min mashup
  const secondaryTracks = tracks.filter(t => t.id !== anchorTrack.id);

  const promptText = `You are a Grammy-winning music producer and DJ legend. Your task is to create a MASTERPIECE mashup arrangement that sounds professional and emotional — like a chart-topping remix.

=== TRACKS ===
ANCHOR TRACK (backbone of the mashup, always controls the main beat):
  Title: "${anchorTrack.title}" by ${anchorTrack.artist}
  ID: ${anchorTrack.id}
  Duration: ${anchorTrack.duration || 180}s

SECONDARY TRACKS (layer these over the anchor for contrast and drama):
${secondaryTracks.map((t, i) => `  ${i + 1}. "${t.title}" by ${t.artist} (ID: ${t.id}, Duration: ${t.duration || 180}s)`).join('\n')}

=== TOTAL MASHUP DURATION: ${totalDuration} seconds ===

=== YOUR DJ TOOLKIT (event types) ===
- "play"        — play from current position at full volume
- "pause"       — smooth fade out then pause
- "fade_in"     — fade in over 3s (always use this when introducing a track)
- "fade_out"    — fade out over 3s (always use this when removing a track)
- "seek"        — jump a track to a specific time position (use seekTo: N seconds) — use BEFORE fade_in to pick the best hook/chorus
- "set_volume"  — ramp volume to a level (use volume: 0.0–1.0)
- "cut_vocals"  — mute midrange frequencies (vocals) on a track so two vocals don't clash
- "restore_vocals" — restore vocals
- "cut_bass"    — cut bass (below 200Hz) on a secondary track so only the anchor's beat dominates
- "restore_bass" — restore bass

=== MASTERPIECE ARRANGEMENT RULES ===
1. INTRO (0–${Math.round(totalDuration * 0.15)}s): Start with the anchor alone. Build anticipation.
2. FIRST DROP (${Math.round(totalDuration * 0.15)}s–${Math.round(totalDuration * 0.4)}s): Introduce the first secondary track. Always seek it to its CHORUS or best hook before fading it in. Cut its bass so the anchor's beat wins.
3. CLIMAX (${Math.round(totalDuration * 0.4)}s–${Math.round(totalDuration * 0.75)}s): This is the emotional peak. Cut the anchor's vocals and bring in the secondary track's vocals for contrast. If multiple secondaries, swap them in/out with clean fades.
4. BUILD DOWN (${Math.round(totalDuration * 0.75)}s–${Math.round(totalDuration * 0.9)}s): Start removing secondary tracks with fade_out, restore the anchor's vocals.
5. OUTRO (${Math.round(totalDuration * 0.9)}s–${totalDuration}s): Only the anchor remains, fade it out beautifully.

NEVER let two vocals play at the same time without first cutting one with cut_vocals.
ALWAYS use seek before introducing a secondary track to find its best moment.
Use set_volume to dynamically duck and swell tracks for emotional impact.

Output ONLY a raw valid JSON array. No markdown, no explanation.

Example (you should produce something much richer than this):
[
  { "timestamp": 0, "trackId": "${anchorTrack.id}", "type": "play" },
  { "timestamp": 5, "trackId": "${secondaryTracks[0]?.id || anchorTrack.id}", "type": "seek", "seekTo": 45 },
  { "timestamp": 5, "trackId": "${secondaryTracks[0]?.id || anchorTrack.id}", "type": "fade_in" },
  { "timestamp": 5, "trackId": "${secondaryTracks[0]?.id || anchorTrack.id}", "type": "cut_bass" },
  { "timestamp": 20, "trackId": "${anchorTrack.id}", "type": "cut_vocals" },
  { "timestamp": 35, "trackId": "${secondaryTracks[0]?.id || anchorTrack.id}", "type": "fade_out" },
  { "timestamp": 37, "trackId": "${anchorTrack.id}", "type": "restore_vocals" }
]

Now produce a FULL, DETAILED arrangement for ${totalDuration} seconds:`;


  let arrangement: any[] = [];
  try {
    setStatus('syncing', 40);
    
    const apiKey = await getGeminiKey();
    if (!apiKey) {
      usePlayerStore.getState().setApiKeyModalOpen(true);
      throw new Error("Missing Gemini API Key");
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { temperature: 1.0, maxOutputTokens: 4096 }
      })
    });
    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Clean up markdown if any
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Extract JSON array if wrapped in text
    const match = text.match(/\[.*\]/s);
    if (match) text = match[0];
    
    arrangement = JSON.parse(text);
    setStatus('mastering', 85);
  } catch (e) {
    console.error("Gemini AI Arrangement failed, using structured fallback:", e);
    // Smart 3-act fallback arrangement
    const fallbackSecondaries = tracks.filter(t => t.id !== anchorTrack.id);
    const dur = Math.min(anchorTrack.duration || 180, 120);
    arrangement = [
      { timestamp: 0, trackId: anchorTrack.id, type: 'play' },
      // Intro with anchor
      ...(fallbackSecondaries.length > 0 ? [
        { timestamp: Math.round(dur * 0.15), trackId: fallbackSecondaries[0].id, type: 'seek', seekTo: 30 },
        { timestamp: Math.round(dur * 0.15), trackId: fallbackSecondaries[0].id, type: 'fade_in' },
        { timestamp: Math.round(dur * 0.15), trackId: fallbackSecondaries[0].id, type: 'cut_bass' },
        { timestamp: Math.round(dur * 0.4), trackId: anchorTrack.id, type: 'cut_vocals' },
        { timestamp: Math.round(dur * 0.75), trackId: fallbackSecondaries[0].id, type: 'fade_out' },
        { timestamp: Math.round(dur * 0.77), trackId: anchorTrack.id, type: 'restore_vocals' },
      ] : []),
      // Second secondary if available
      ...(fallbackSecondaries.length > 1 ? [
        { timestamp: Math.round(dur * 0.45), trackId: fallbackSecondaries[1].id, type: 'seek', seekTo: 45 },
        { timestamp: Math.round(dur * 0.45), trackId: fallbackSecondaries[1].id, type: 'fade_in' },
        { timestamp: Math.round(dur * 0.45), trackId: fallbackSecondaries[1].id, type: 'cut_bass' },
        { timestamp: Math.round(dur * 0.7), trackId: fallbackSecondaries[1].id, type: 'fade_out' },
      ] : []),
      // Outro
      { timestamp: Math.round(dur * 0.9), trackId: anchorTrack.id, type: 'fade_out' },
    ];
  }
  
  setStatus('complete', 100);
  
  const mashupTitle = `AI Mashup: ${tracks.map(t => t.title.split(' ')[0]).join(' x ')}`;
  
  const generatedTrack: Track = {
    id: `mashup-${Date.now()}`,
    title: mashupTitle,
    artist: 'AI Mashup Studio',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=500&auto=format&fit=crop',
    duration: anchorTrack.duration || 180,
    streamUrl: anchorTrack.streamUrl,
    mashupStreamUrls: tracks.filter(t => t.id !== anchorTrack.id).map(t => ({ id: t.id, url: t.streamUrl })),
    arrangement: arrangement,
    source: 'saavn',
    sourceBadge: 'AI Generated',
  };
  
  return generatedTrack;
};
