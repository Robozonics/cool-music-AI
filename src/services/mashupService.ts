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
  
  // Create prompt for Gemini
  const promptText = `
You are an expert DJ creating a mashup arrangement. I am providing you a list of tracks.
Anchor Track (Sets the main tempo/beat): ${anchorTrack.title} by ${anchorTrack.artist} (ID: ${anchorTrack.id})
Other Tracks:
${tracks.filter(t => t.id !== anchorTrack.id).map(t => `- ${t.title} by ${t.artist} (ID: ${t.id})`).join('\n')}

Generate a JSON array of DJ events to control playback over a 60-second mashup.
Valid event types: "play", "pause", "fade_in", "fade_out", "cut_vocals", "restore_vocals", "cut_bass", "restore_bass".

CRITICAL DJ RULES TO PREVENT CLASHING:
1. NEVER mix vocals together. If a secondary track plays, you MUST apply "cut_vocals" to the Anchor track so they don't clash.
2. NEVER mix heavy backgrounds together. If a secondary track has a strong beat, apply "cut_bass" to it to let the Anchor track's beat dominate.
3. Ensure smooth transitions using "fade_in" and "fade_out".
4. Output ONLY raw valid JSON array, no markdown formatting or backticks.

Example format:
[
  { "timestamp": 0, "trackId": "${anchorTrack.id}", "type": "play" },
  { "timestamp": 15, "trackId": "other_id", "type": "fade_in" },
  { "timestamp": 15, "trackId": "other_id", "type": "cut_bass" },
  { "timestamp": 30, "trackId": "${anchorTrack.id}", "type": "cut_vocals" }
]
  `;

  let arrangement: any[] = [];
  try {
    setStatus('syncing', 40);
    
    const apiKey = await getGeminiKey();
    if (!apiKey) {
      usePlayerStore.getState().setApiKeyModalOpen(true);
      throw new Error("Missing Gemini API Key");
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.7 }
      })
    });
    const data = await res.json();
    let text = data.candidates[0].content.parts[0].text;
    
    // Clean up markdown if any
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    arrangement = JSON.parse(text);
    setStatus('mastering', 85);
  } catch (e) {
    console.error("Gemini AI Arrangement failed, falling back to basic play:", e);
    // Fallback arrangement if API fails
    arrangement = tracks.map(t => ({ timestamp: 0, trackId: t.id, type: 'play' }));
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
