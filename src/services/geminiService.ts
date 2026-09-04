import { getGeminiKey } from './keyManager';
import { searchSaavn } from './unblockedMusicService';
import type { Track } from '../types/music';

export const getMoodRecommendations = async (userPrompt: string): Promise<{ title: string; artist: string }[]> => {
  const apiKey = await getGeminiKey();

  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: `You are an elite Gen-Z music curator. Return a STRICT JSON array of 6 real songs matching this vibe: "${userPrompt}". Schema: [{"title": "Song", "artist": "Artist"}]. Output ONLY valid JSON.` }
        ]
      }
    ]
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Gemini API error', response.statusText);
      return [];
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Strip markdown code blocks if Gemini returns them
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Gemini Service Error:', error);
    return [];
  }
};

export const searchBestMusicWithAI = async (userQuery: string): Promise<Track[]> => {
  const apiKey = await getGeminiKey();

  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: `You are the world's foremost music curator and critic. The user is asking for the 'best' music matching: '${userQuery}'. Curate a list of 8 objectively top-rated, culturally acclaimed, or most iconic songs that match this vibe. Return a STRICT JSON array: [{"title": "Song Title", "artist": "Artist Name", "reason": "One punchy line explaining why it's the best"}]. No markdown backticks, output ONLY valid JSON.` }
        ]
      }
    ]
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Gemini API error', response.statusText);
      return [];
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];

    // Resolve songs concurrently via unblockedMusicService
    const resolvedTracksPromises = parsed.map(async (item: { title: string; artist: string; reason: string }) => {
      const searchQuery = `${item.title} ${item.artist}`;
      // We only search Saavn for AI curated tracks to get rich metadata/cover art instantly
      const results = await searchSaavn(searchQuery);
      if (results.length > 0) {
        const bestMatch = results[0];
        bestMatch.reason = item.reason;
        return bestMatch;
      }
      return null;
    });

    const resolved = await Promise.all(resolvedTracksPromises);
    return resolved.filter((t): t is Track => t !== null);
  } catch (error) {
    console.error('Gemini Best Music Error:', error);
    return [];
  }
};
