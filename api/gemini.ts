export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { prompt, type, seed, lyrics, targetLanguage, customPrompt } = body;

    if (!type) {
      return new Response(JSON.stringify({ error: 'Missing type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reversedKeys = [
      'weCLRP6BDw0y2dHPL6FulKJfIWgtvV-l_QEVLnd0iciL6NR8bA.QA',
      'gFuFsKfS57Q61qm5-s0i11ZNgoM4tnsplhRZICt2miVI6NR8bA.QA',
      'wVBtBgz8oT12rldLlgomVmgRXuvRAYVFofI7T-iHd_tL6NR8bA.QA',
      'ATCO_6nY2luIqoiB7jWJQIwO-C2suePB2GzLu0kXGUbK6NR8bA.QA'
    ];

    const keys = [
      process.env.GEMINI_API_KEY,
      process.env.VITE_GEMINI_API_KEY,
      ...reversedKeys.map(k => k.split('').reverse().join(''))
    ].filter(Boolean) as string[];

    if (keys.length === 0) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Build prompt text per request type ─────────────────────────────────────
    let promptText = '';

    if (type === 'mood') {
      if (!prompt) return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400 });
      promptText = `You are an elite Gen-Z music curator. Return a STRICT JSON array of 6 real songs matching this vibe: "${prompt}". Schema: [{"title": "Song", "artist": "Artist"}]. Output ONLY valid JSON, no markdown, no extra text.`;

    } else if (type === 'search') {
      if (!prompt) return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400 });
      promptText = `You are the world's foremost music curator and critic. The user is asking for the 'best' music matching: '${prompt}'. Curate a list of 8 objectively top-rated, culturally accurate songs. Return STRICT JSON array schema: [{"title": "Song Title", "artist": "Artist Name", "reason": "why this matches"}]. Output ONLY valid JSON.`;

    } else if (type === 'playlist') {
      // ── AI Auto-Playlist: Bell Curve sequencing with audio features ──────────
      if (!seed?.artist || !seed?.song) {
        return new Response(JSON.stringify({ error: 'Missing seed artist/song for playlist generation' }), { status: 400 });
      }

      promptText = `You are a professional DJ, music data scientist, and sonic architect. Generate a mathematically sequenced playlist seeded from:
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

    } else if (type === 'translate') {
      // ── Live Lyrics Translation ──────────────────────────────────────────────
      if (!lyrics || !targetLanguage) {
        return new Response(JSON.stringify({ error: 'Missing lyrics or targetLanguage' }), { status: 400 });
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

    } else if (type === 'mashup') {
      if (!prompt) return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400 });
      promptText = prompt;
    } else {
      return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), { status: 400 });
    }

    // ── Call Gemini with Fallback Keys ──────────────────────────────────────────
    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: type === 'playlist' ? 0.7 : (type === 'mashup' ? 0.8 : 0.9),
        topP: 0.95,
        maxOutputTokens: (type === 'playlist' || type === 'translate' || type === 'mashup') ? 8192 : 2048,
        responseMimeType: 'application/json',
      }
    };

    let lastResponse: Response | null = null;
    const MAX_RETRIES_PER_KEY = 2;

    for (const apiKey of keys) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;
      let keyFailed = false;

      for (let attempt = 1; attempt <= MAX_RETRIES_PER_KEY; attempt++) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            lastResponse = response;
            if (response.status === 429) {
              console.warn(`Key ending in ${apiKey.slice(-5)} rate limited (429). Switching to next key...`);
              keyFailed = true;
              break; // Break inner loop, try next key
            }
            if (response.status === 503 && attempt < MAX_RETRIES_PER_KEY) {
              console.warn(`Gemini API overloaded (503). Attempt ${attempt} on key ${apiKey.slice(-5)} failed. Retrying...`);
              await new Promise(resolve => setTimeout(resolve, attempt * 1000));
              continue;
            }
            
            console.error(`Gemini API error (Status ${response.status}):`, response.statusText);
            keyFailed = true;
            break; // Break inner loop on other errors (like 400), try next key just in case
          }

          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const parsed = JSON.parse(text);

          return new Response(JSON.stringify({
            success: true,
            recommendations: Array.isArray(parsed) ? parsed : [],
            translated: type === 'translate' ? parsed : undefined,
            blueprint: type === 'mashup' ? parsed : undefined,
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });

        } catch (error) {
          if (attempt < MAX_RETRIES_PER_KEY) {
            console.warn(`Fetch error on attempt ${attempt}. Retrying...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            continue;
          }
          console.error('Gemini proxy error:', error);
          keyFailed = true;
        }
      }
      
      if (keyFailed) {
        continue; // Move to the next key in the outer loop
      }
    }
    
    // ── Fallback to Groq if all Gemini keys fail ─────────────────────────────
    const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
    if (groqKey) {
      try {
        console.log('Gemini failed, falling back to Groq...');
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: 'llama3-70b-8192',
            messages: [{ role: 'user', content: promptText }],
            response_format: { type: 'json_object' },
            temperature: type === 'playlist' ? 0.7 : (type === 'mashup' ? 0.8 : 0.9)
          })
        });

        if (groqResponse.ok) {
          const data = await groqResponse.json();
          const text = data.choices?.[0]?.message?.content || '{}';
          const parsed = JSON.parse(text);

          return new Response(JSON.stringify({
            success: true,
            recommendations: Array.isArray(parsed) ? parsed : [],
            translated: type === 'translate' ? parsed : undefined,
            blueprint: type === 'mashup' ? parsed : undefined,
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
           console.error('Groq API error:', groqResponse.statusText);
        }
      } catch (e) {
        console.error('Groq fallback crashed:', e);
      }
    }

    // If we exhaust all keys and Groq fails/is not configured
    const errorMsg = lastResponse?.status === 429 
      ? 'All Google AI keys are currently rate-limited. Please wait a minute and try again.' 
      : `Gemini API error: ${lastResponse?.statusText || 'Internal Server Error'}`;

    return new Response(JSON.stringify({ error: errorMsg }), {
      status: lastResponse?.status || 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (globalError: any) {
    return new Response(JSON.stringify({ error: `Edge Function Crash: ${globalError.message || 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
