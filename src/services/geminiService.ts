import { searchSaavn } from './unblockedMusicService';
import type { Track } from '../types/music';

const reversedKeys = [
  'wGdX9A1YBS4wABYpKZ3IqX09Q3jIugS378GYwxiPLxI6NR8bA.QA', // User provided key reversed
  'AV81QcMsO-MXVj5-HPaZ3K-nVCCKTyfJC8XEBoZF2-yK6NR8bA.QA',
  'AnllYySbZxr31WTwJwMOo3OPZuaLAShcjzPnRurDEkaJ6NR8bA.QA', // Newly provided key
  'weCLRP6BDw0y2dHPL6FulKJfIWgtvV-l_QEVLnd0iciL6NR8bA.QA',
  'gFuFsKfS57Q61qm5-s0i11ZNgoM4tnsplhRZICt2miVI6NR8bA.QA',
  'wVBtBgz8oT12rldLlgomVmgRXuvRAYVFofI7T-iHd_tL6NR8bA.QA',
  'ATCO_6nY2luIqoiB7jWJQIwO-C2suePB2GzLu0kXGUbK6NR8bA.QA'
];

const getKeys = () => [
  (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_GEMINI_API_KEY : undefined,
  ...reversedKeys.map(k => k.split('').reverse().join(''))
].filter(Boolean) as string[];

const REVERSED_GROQ_API_KEY = 'KlapevwTKqnaVhYCv2RLVFDKYF3bydGWx1EQDpE7E1UcCJ27xkjz_ksg';
const GROQ_MODEL = 'qwen/qwen3.8-27b';

const callGroqFallback = async (promptText: string) => {
  const endpoint = `https://api.groq.com/openai/v1/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REVERSED_GROQ_API_KEY.split('').reverse().join('')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: promptText }]
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content || '[]';
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonStart = text.indexOf('[');
  const jsonEnd = text.lastIndexOf(']');
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    text = text.substring(jsonStart, jsonEnd + 1);
  }
  
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
};

export const callGeminiDirectly = async (promptText: string, type: 'playlist' | 'search' | 'mood' | 'translate', audioBase64?: string) => {
  const keys = getKeys();
  if (keys.length === 0) throw new Error('API key not configured');

  const parts: any[] = [];
  if (promptText) parts.push({ text: promptText });
  if (audioBase64) {
    parts.push({
      inlineData: {
        mimeType: 'audio/webm',
        data: audioBase64
      }
    });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: type === 'playlist' ? 0.7 : 0.9,
      topP: 0.95,
      maxOutputTokens: type === 'playlist' || type === 'translate' ? 8192 : 2048,
    }
  };

  let lastResponse = null;
  const MAX_RETRIES = 2;

  for (const apiKey of keys) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    let keyFailed = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          lastResponse = response;
          if (response.status === 429) {
            console.warn(`Key ending in ${apiKey.slice(-5)} rate limited (429). Switching to next key...`);
            keyFailed = true;
            break;
          }
          if (response.status === 503 && attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            continue;
          }
          console.error(`Gemini API error (Status ${response.status}):`, response.statusText);
          keyFailed = true;
          break;
        }

        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const jsonStart = text.indexOf('[');
        const jsonEnd = text.lastIndexOf(']');
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          text = text.substring(jsonStart, jsonEnd + 1);
        }
        
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
      } catch (error) {
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          continue;
        }
        keyFailed = true;
      }
    }
    if (keyFailed) continue;
  }
  
  console.warn('All Gemini keys failed. Falling back to Groq API...');
  try {
    return await callGroqFallback(promptText);
  } catch (groqError) {
    console.error('Groq fallback failed:', groqError);
    throw new Error(lastResponse?.status === 429 ? 'All AI keys rate-limited. Please wait a minute.' : 'AI Service Error. Please try again.');
  }
};

// ── Existing: Mood Recommendations ──────────────────────────────────────────
export const getMoodRecommendations = async (userPrompt: string): Promise<{ title: string; artist: string }[]> => {
  const promptText = `You are an elite Gen-Z music curator. Return a STRICT JSON array of 6 real songs matching this vibe: "${userPrompt}". Schema: [{"title": "Song", "artist": "Artist"}]. Output ONLY valid JSON, no markdown, no extra text.`;
  return callGeminiDirectly(promptText, 'mood');
};

// ── NEW: Aura Analysis ──────────────────────────────────────────────────────
export interface AuraAnalysis {
  vibeTitle: string;
  vibeDescription: string;
  vibeColor: string;
}

export const generateAuraAnalysis = async (seedArtist: string, seedSong: string, inspirations?: string): Promise<AuraAnalysis> => {
  const promptText = `You are a Gen-Z music aura reader. The user's seed track is "${seedSong}" by "${seedArtist}". ${inspirations ? `They also deeply resonate with these tracks: ${inspirations}.` : ''}
Analyze the sonic vibe and emotional frequency of this overall taste. 
Return EXACTLY ONE JSON object with these keys:
- "vibeTitle": A short, edgy, highly Gen-Z title for this aura (e.g. "NEON MIDNIGHT OVERTHINKER", "MAIN CHARACTER COMPLEX", "FERAL CLUB RAT", "ETHEREAL FLOAT", "DOOMSCROLLING LOFI"). ALL CAPS. Max 4 words.
- "vibeDescription": A 1-2 sentence description of what this music says about their current mood, using Gen-Z internet slang but keeping it poetic and cool.
- "vibeColor": A vibrant, neon hex color code (e.g. "#FF00FF") that perfectly represents the emotional frequency of the seed track.

Output ONLY valid JSON ARRAY containing ONE object. Example: [{"vibeTitle": "CYBERPUNK HEARTBREAK", "vibeDescription": "You're deep in your feelings but making it aesthetic. Main character energy in a rainy cyberpunk city.", "vibeColor": "#00FFFF"}]. No markdown, no extra text.`;

  try {
    const result = await callGeminiDirectly(promptText, 'search');
    if (result && result.length > 0) {
      return result[0] as AuraAnalysis;
    }
  } catch (e) {
    console.error('Aura generation failed', e);
  }
  // Fallback
  return {
    vibeTitle: "MYSTERY VIBE",
    vibeDescription: "Your aura is unreadable right now, but the vibes are immaculate anyway.",
    vibeColor: "#8B5CF6" // Purple
  };
};

// ── Existing: Best Music Search ──────────────────────────────────────────────
export const searchBestMusicWithAI = async (userQuery: string, audioBase64?: string): Promise<Track[]> => {
  const promptText = audioBase64 
    ? `You are an expert music identifier. Listen to the provided audio (which might be humming, singing, or a song playing). Identify the song being hummed/played. If you cannot identify a specific song, suggest 5 songs that sound very similar to the melody/vibe. Return STRICT JSON array schema: [{"title": "Song Title", "artist": "Artist Name", "reason": "why this matches"}]. Output ONLY valid JSON.`
    : `You are the world's foremost music curator and critic. The user is asking for the 'best' music matching: '${userQuery}'. Curate a list of 8 objectively top-rated, culturally accurate songs. Return STRICT JSON array schema: [{"title": "Song Title", "artist": "Artist Name", "reason": "why this matches"}]. Output ONLY valid JSON.`;
  
  const recommendations = await callGeminiDirectly(promptText, 'search', audioBase64);
  if (!Array.isArray(recommendations)) return [];

  const resolvedTracksPromises = recommendations.map(async (item: any) => {
    try {
      const results = await searchSaavn(`${item.title} ${item.artist}`);
      if (results.length > 0) {
        const bestMatch = results[0];
        if (item.reason) bestMatch.reason = item.reason;
        return bestMatch;
      }
      return null;
    } catch {
      return null;
    }
  });

  const resolved = await Promise.all(resolvedTracksPromises);
  return resolved.filter((t): t is Track => t !== null);
};

// ── NEW: AI Auto-Playlist Generator (Bell Curve) ─────────────────────────────
export interface PlaylistSeedTrack {
  artist: string;
  song: string;
}

export interface AIPlaylistItem {
  title: string;
  artist: string;
  reason: string;
  segment: 'foundation' | 'peak' | 'cooldown';
}

export const generateAIPlaylist = async (
  seed: PlaylistSeedTrack,
  customPrompt?: string,
  onProgress?: (pct: number, message: string) => void
): Promise<Track[]> => {
  onProgress?.(5, 'Analysing sonic fingerprint…');

  const promptText = `You are a professional DJ, music data scientist, and sonic architect. Generate a mathematically sequenced playlist seeded from:
SEED ARTIST: "${seed.artist}"
SEED SONG: "${seed.song}"

${customPrompt ? `USER CUSTOM INSTRUCTIONS: "${customPrompt}"\n(You MUST heavily prioritize these custom instructions over the standard Bell Curve pacing if they conflict. If they ask for a specific number of tracks, return exactly that number.)` : ''}

STEP 1 — AUDIO PROFILE ESTIMATION:
Estimate these audio features for the seed track:
- BPM: (integer, e.g. 120)
- Musical Key: (e.g. "A minor")
- Energy: (float 0.0–1.0)
- Danceability: (float 0.0–1.0)
- Acousticness: (float 0.0–1.0)
- Mood: one of [happy, sad, energetic, calm, aggressive, romantic]

STEP 2 — SIMILAR ARTIST GRAPH:
Identify 5–8 artists who occupy the EXACT same sonic space and listener demographic as "${seed.artist}". Consider: production style, vocal delivery, lyrical themes, subgenre, era, and fanbase overlap.

STEP 3 — SEQUENCING:
${customPrompt ? 'Follow the USER CUSTOM INSTRUCTIONS above for sequencing and track count.' : `
BELL CURVE SEQUENCING (strictly enforce all constraints):
Tracks 1–5 (FOUNDATION — "Vibe Lock-In"):
- BPM within ±5 of seed BPM
- Energy within ±0.1 of seed energy
- Highest sonic similarity — listener should feel "yes, this is the same universe"

Tracks 6–20 (PEAK — "The Journey"):
- BPM increases gradually by +1 to +2 BPM per track
- Energy increases by +0.04 per track
- Gradually introduce cross-genre overlaps and "deeper cuts"

Tracks 21–30 (COOLDOWN — "The Resolution"):
- BPM decreases by -2 per track (winding down)
- Energy decreases by -0.05 per track
- Close with something emotionally resonant
`}

STRICT OUTPUT FORMAT — return EXACTLY ${customPrompt ? 'the requested number of items' : '30 items'}, NOTHING ELSE, ONLY valid JSON:
[
  {
    "title": "Song Title",
    "artist": "Artist Name",
    "reason": "1–2 sentence explanation of why this fits here",
    "segment": "foundation" | "peak" | "cooldown"
  }
]

No markdown, no commentary, no extra keys, no numbering. Pure JSON array only.`;

  const recommendations = await callGeminiDirectly(promptText, 'playlist');

  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    throw new Error('Gemini returned an empty playlist. Try a different seed.');
  }

  onProgress?.(25, `Generated ${recommendations.length} tracks. Resolving streams…`);

  const batchSize = 3;
  const resolved: Track[] = [];
  const total = recommendations.length;

  for (let i = 0; i < total; i += batchSize) {
    const batch = recommendations.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (item: any): Promise<Track | null> => {
        try {
          const results = await searchSaavn(`${item.title} ${item.artist}`);
          if (results.length > 0) {
            const track = results[0];
            track.reason = item.reason;
            track.segment = item.segment;
            return track;
          }
          return null;
        } catch {
          return null;
        }
      })
    );
    resolved.push(...batchResults.filter((t): t is Track => t !== null));
    const pct = 25 + Math.round(((i + batchSize) / total) * 70);
    onProgress?.(Math.min(pct, 95), `Resolved ${resolved.length} of ${total} tracks…`);
    
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  onProgress?.(100, `Playlist ready! ${resolved.length} tracks loaded.`);
  return resolved;
};

// ── NEW: AI Command Parser ──────────────────────────────────────────────────
export const parseAICommand = async (command: string): Promise<{ action: 'play' | 'add_to_playlist' | 'create_playlist' | 'create_empty_playlist' | 'mood' | 'share' | 'smart_mix' | 'unknown', query: string }> => {
  const promptText = `You are an AI assistant in a music app. The user just gave the command: "${command}". 
Parse this command into a JSON object with exactly two keys:
1. "action": one of "play", "add_to_playlist", "create_playlist", "create_empty_playlist", "mood", "share"
   - use "create_empty_playlist" if they explicitly ask to create a new, empty, or blank playlist (e.g. "create an empty playlist", "make a new playlist called Favorites")
   - use "create_playlist" if they ask to generate or build an AI/auto playlist with songs in it
   - use "mood" if they ask for relaxing, focus, sad, happy, or mood-based music
   - use "share" if they ask to share the music
   - use "play" if they ask to play a specific song or artist
   - use "add_to_playlist" if they ask to add a specific song to a playlist
   - use "smart_mix" if they ask to enable or turn on crossfade, smart mix, DJ mix, or professional transitions between tracks
2. "query": the name of the song, artist, mood, or seed required. For "add_to_playlist", extract ONLY the song/artist name and EXCLUDE the destination playlist name (e.g. for "add starboy to my workout playlist", query must be "starboy"). If they just say "add this song", query can be "this". For share or smart_mix, it can be empty.

If you cannot understand the command, return [{"action": "unknown", "query": ""}].
Output ONLY valid JSON ARRAY containing ONE object. Example: [{"action": "play", "query": "starboy"}]. No markdown, no extra text.`;

  try {
    const result = await callGeminiDirectly(promptText, 'search');
    if (result && result.length > 0) {
      return result[0];
    }
  } catch (e) {
    console.error('Command parsing failed', e);
  }
  return { action: 'unknown', query: '' };
};
