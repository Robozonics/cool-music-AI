import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, type } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            {
              text: type === 'mood'
                ? `You are an elite Gen-Z music curator. Return a STRICT JSON array of 6 real songs matching this vibe: "${prompt}". Schema: [{"title": "Song", "artist": "Artist"}]. Output ONLY valid JSON, no markdown, no extra text.`
                : `You are the world's foremost music curator and critic. The user is asking for the 'best' music matching: '${prompt}'. Curate a list of 8 objectively top-rated, culturally accurate songs. Return STRICT JSON array schema: [{"title": "Song Title", "artist": "Artist Name", "reason": "why this matches"}]. Output ONLY valid JSON.`
            }
          ]
        }
      ]
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.statusText);
      return res.status(response.status).json({ error: 'Gemini API error' });
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Strip markdown code blocks if Gemini returns them
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(text);

    return res.status(200).json({
      success: true,
      recommendations: Array.isArray(parsed) ? parsed : []
    });
  } catch (error) {
    console.error('Gemini proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
