import { searchSaavn } from './unblockedMusicService';
import type { Track } from '../types/music';

export const getMoodRecommendations = async (userPrompt: string): Promise<{ title: string; artist: string }[]> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: userPrompt,
        type: 'mood'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.error === 'API key not configured') {
        throw new Error('MISSING_API_KEY');
      }
      throw new Error(error.error || 'API error');
    }

    const data = await response.json();
    return data.recommendations || [];
  } catch (error) {
    console.error('Gemini Service Error:', error);
    throw error;
  }
};

export const searchBestMusicWithAI = async (userQuery: string): Promise<Track[]> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: userQuery,
        type: 'search'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.error === 'API key not configured') {
        throw new Error('MISSING_API_KEY');
      }
      throw new Error(error.error || 'API error');
    }

    const data = await response.json();
    const recommendations = data.recommendations || [];

    if (!Array.isArray(recommendations)) return [];

    // Resolve songs concurrently via unblockedMusicService
    const resolvedTracksPromises = recommendations.map(async (item: { title: string; artist: string; reason?: string }) => {
      const searchQuery = `${item.title} ${item.artist}`;
      const results = await searchSaavn(searchQuery);
      if (results.length > 0) {
        const bestMatch = results[0];
        if (item.reason) {
          bestMatch.reason = item.reason;
        }
        return bestMatch;
      }
      return null;
    });

    const resolved = await Promise.all(resolvedTracksPromises);
    return resolved.filter((t): t is Track => t !== null);
  } catch (error) {
    console.error('Gemini Best Music Error:', error);
    throw error;
  }
};
