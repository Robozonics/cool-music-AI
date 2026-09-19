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
      const error = await response.json();
      if (error.error === 'API key not configured') throw new Error('MISSING_API_KEY');
      throw new Error(error.error || 'API error');
    }
    const data = await response.json();
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
      const error = await response.json();
      if (error.error === 'API key not configured') throw new Error('MISSING_API_KEY');
      throw new Error(error.error || 'API error');
    }
    const data = await response.json();
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
    const error = await response.json();
    if (error.error === 'API key not configured') throw new Error('MISSING_API_KEY');
    throw new Error(error.error || 'Playlist generation failed');
  }

  const data = await response.json();
  const recommendations: AIPlaylistItem[] = data.recommendations || [];

  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    throw new Error('Gemini returned an empty playlist. Try a different seed.');
  }

  onProgress?.(25, `Generated ${recommendations.length} tracks. Resolving streams…`);

  // Resolve tracks in batches of 5 to avoid rate limits and track progress
  const batchSize = 5;
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
    
    // Sleep to prevent main thread blocking / network pane freezing
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  onProgress?.(100, `Playlist ready! ${resolved.length} tracks loaded.`);
  return resolved;
};
