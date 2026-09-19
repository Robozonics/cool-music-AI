import { searchSaavn } from './unblockedMusicService';
import type { Track } from '../types/music';

// ── Existing: Mood Recommendations ──────────────────────────────────────────
export const getMoodRecommendations = async (userPrompt: string): Promise<{ title: string; artist: string }[]> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userPrompt, type: 'mood' })
    });
    if (!response.ok) {
      let errorMsg = 'API error';
      try {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
        if (errorMsg === 'API key not configured') throw new Error('MISSING_API_KEY');
      } catch {
        throw new Error(`AI Service error (${response.status}). Please try again.`);
      }
      throw new Error(errorMsg);
    }
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      if (!response.ok) throw new Error('AI Service timed out. Please try again.');
      throw new Error('Invalid response from AI Service.');
    }
    return data.recommendations || [];
  } catch (error) {
    console.error('Gemini Service Error:', error);
    throw error;
  }
};

// ── Existing: Best Music Search ──────────────────────────────────────────────
export const searchBestMusicWithAI = async (userQuery: string): Promise<Track[]> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userQuery, type: 'search' })
    });
    if (!response.ok) {
      let errorMsg = 'API error';
      try {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
        if (errorMsg === 'API key not configured') throw new Error('MISSING_API_KEY');
      } catch {
        throw new Error(`AI Service error (${response.status}). Please try again.`);
      }
      throw new Error(errorMsg);
    }
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      if (!response.ok) throw new Error('AI Service timed out. Please try again.');
      throw new Error('Invalid response from AI Service.');
    }
    const recommendations = data.recommendations || [];
    if (!Array.isArray(recommendations)) return [];

    const resolvedTracksPromises = recommendations.map(async (item: { title: string; artist: string; reason?: string }) => {
      const results = await searchSaavn(`${item.title} ${item.artist}`);
      if (results.length > 0) {
        const bestMatch = results[0];
        if (item.reason) bestMatch.reason = item.reason;
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

/**
 * Generates a 30-track Bell Curve playlist from a seed artist + song.
 * Calls /api/gemini with type:'playlist', then resolves each track via Saavn search.
 * Reports progress via the optional onProgress callback (0–100).
 */
export const generateAIPlaylist = async (
  seed: PlaylistSeedTrack,
  customPrompt?: string,
  onProgress?: (pct: number, message: string) => void
): Promise<Track[]> => {
  onProgress?.(5, 'Analysing sonic fingerprint…');

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'playlist', seed, customPrompt })
  });

  if (!response.ok) {
    let errorMsg = 'Playlist generation failed';
    try {
      const error = await response.json();
      errorMsg = error.error || errorMsg;
      if (errorMsg === 'API key not configured') throw new Error('MISSING_API_KEY');
    } catch {
      throw new Error(`AI Service overloaded (${response.status} Timeout). Please try again.`);
    }
    throw new Error(errorMsg);
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    throw new Error('AI Service is overloaded (504 Gateway Timeout). Please try again in a moment.');
  }
  const recommendations: AIPlaylistItem[] = data.recommendations || [];

  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    throw new Error('Gemini returned an empty playlist. Try a different seed.');
  }

  onProgress?.(25, `Generated ${recommendations.length} tracks. Resolving streams…`);

  // Resolve tracks in batches of 3 to avoid rate limits and track progress
  const batchSize = 3;
  const resolved: Track[] = [];
  const total = recommendations.length;

  for (let i = 0; i < total; i += batchSize) {
    const batch = recommendations.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (item): Promise<Track | null> => {
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
    
    // Sleep to prevent main thread blocking and Saavn API 429 Rate Limits
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  onProgress?.(100, `Playlist ready! ${resolved.length} tracks loaded.`);
  return resolved;
};
