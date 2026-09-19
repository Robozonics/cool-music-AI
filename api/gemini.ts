import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, type, seed, lyrics, targetLanguage } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'Missing type' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // ── Build prompt text per request type ─────────────────────────────────────
  let promptText = '';

  if (type === 'mood') {
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    promptText = `You are an elite Gen-Z music curator. Return a STRICT JSON array of 6 real songs matching this vibe: "${prompt}". Schema: [{"title": "Song", "artist": "Artist"}]. Output ONLY valid JSON, no markdown, no extra text.`;

  } else if (type === 'search') {
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    promptText = `You are the world's foremost music curator and critic. The user is asking for the 'best' music matching: '${prompt}'. Curate a list of 8 objectively top-rated, culturally accurate songs. Return STRICT JSON array schema: [{"title": "Song Title", "artist": "Artist Name", "reason": "why this matches"}]. Output ONLY valid JSON.`;

  } else if (type === 'playlist') {
    // ── AI Auto-Playlist: Bell Curve sequencing with audio features ──────────
    if (!seed?.artist || !seed?.song) {
      return res.status(400).json({ error: 'Missing seed artist/song for playlist generation' });
    }

    promptText = `You are a professional DJ, music data scientist, and sonic architect. Generate a mathematically sequenced 30-song playlist seeded from:
SEED ARTIST: "${seed.artist}"
SEED SONG: "${seed.song}"

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

STEP 3 — BELL CURVE SEQUENCING (strictly enforce all constraints):

Tracks 1–5 (FOUNDATION — "Vibe Lock-In"):
- BPM within ±5 of seed BPM
- Energy within ±0.1 of seed energy
- Same or extremely close genre/subgenre
- Highest sonic similarity — listener should feel "yes, this is the same universe"
- Include 2–3 songs BY the seed artist themselves if they have enough catalog

Tracks 6–20 (PEAK — "The Journey"):
- BPM increases gradually by +1 to +2 BPM per track
- Energy increases by +0.04 per track
- Introduce artist variety: pull from the similar artist graph
- Gradually introduce cross-genre overlaps and "deeper cuts" — fan favorites, B-sides, cult hits
- By track 15, energy should peak at max(0.95, seed_energy + 0.4)

Tracks 21–30 (COOLDOWN — "The Resolution"):
- BPM decreases by -2 per track (winding down)
- Energy decreases by -0.05 per track
- Gradually shift toward acoustic, instrumental, or slower variants
- Close with something emotionally resonant — the "perfect ending" track

STRICT OUTPUT FORMAT — return EXACTLY 30 items, NOTHING ELSE, ONLY valid JSON:
[
  {
    "title": "Song Title",
    "artist": "Artist Name",
    "reason": "1–2 sentence explanation of why this fits here",
    "segment": "foundation" | "peak" | "cooldown"
  }
]

No markdown, no commentary, no extra keys, no numbering. Pure JSON array only.`;

  } else if (type === 'translate') {
    // ── Live Lyrics Translation ──────────────────────────────────────────────
    if (!lyrics || !targetLanguage) {
      return res.status(400).json({ error: 'Missing lyrics or targetLanguage' });
    }

    promptText = `You are a professional translator specializing in song lyrics. Translate the following song lyrics into ${targetLanguage}.
Rules:
- Preserve poetic meaning, not just literal word translation
- Preserve the emotional intent and cultural nuance
- Keep the translated text roughly similar in length to each original line
- Do NOT add notes, footnotes, or explanations

Input JSON (array of lyric lines with time offsets):
${JSON.stringify(lyrics)}

Return the EXACT SAME JSON array structure, with a "translation" field added to each object.
Schema: [{"time": number, "text": "original text", "translation": "translated text"}]
Output ONLY valid JSON. No markdown, no commentary.`;

  } else {
    return res.status(400).json({ error: `Unknown type: ${type}` });
  }

  // ── Call Gemini ─────────────────────────────────────────────────────────────
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [{ text: promptText }]
        }
      ],
      generationConfig: {
        temperature: type === 'playlist' ? 0.7 : 0.9,
        topP: 0.95,
        maxOutputTokens: type === 'playlist' || type === 'translate' ? 8192 : 2048,
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.statusText);
      return res.status(response.status).json({ error: 'Gemini API error' });
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Strip markdown code blocks if Gemini wraps them
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    // Sometimes Gemini prepends stray text before the JSON — find the first [
    const jsonStart = text.indexOf('[');
    if (jsonStart > 0) text = text.slice(jsonStart);

    const parsed = JSON.parse(text);

    return res.status(200).json({
      success: true,
      recommendations: Array.isArray(parsed) ? parsed : [],
      translated: type === 'translate' ? parsed : undefined,
    });

  } catch (error) {
    console.error('Gemini proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
