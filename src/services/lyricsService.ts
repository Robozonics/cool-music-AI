import type { LyricLine } from '../types/music';

export const fetchLyrics = async (
  title: string,
  artist: string,
  duration?: number
): Promise<{ synced: LyricLine[] | null; plain: string | null }> => {
  try {
    let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
    if (duration) {
      url += `&duration=${Math.round(duration)}`;
    }

    let res = await fetch(url);
    let data;

    if (res.ok) {
      data = await res.json();
    } else {
      // Fallback search
      const fallbackUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(title + ' ' + artist)}`;
      const searchRes = await fetch(fallbackUrl);
      if (!searchRes.ok) return { synced: null, plain: null };
      
      const searchData = await searchRes.json();
      if (!searchData || searchData.length === 0) return { synced: null, plain: null };
      
      data = searchData[0]; // pick first
    }

    if (!data) return { synced: null, plain: null };

    if (data.syncedLyrics) {
      const synced = parseSyncedLyrics(data.syncedLyrics);
      return { synced, plain: data.plainLyrics || null };
    }

    return { synced: null, plain: data.plainLyrics || null };
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return { synced: null, plain: null };
  }
};

const parseSyncedLyrics = (lrc: string): LyricLine[] => {
  const lines = lrc.split('\n');
  const result: LyricLine[] = [];
  
  // Format: [mm:ss.xx] or [mm:ss.xxx] text
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      // Depending on whether it's 2 or 3 digits
      const millisecondsStr = match[3];
      const milliseconds = parseInt(millisecondsStr, 10) * (millisecondsStr.length === 2 ? 10 : 1);
      
      const time = (minutes * 60) + seconds + (milliseconds / 1000);
      const text = match[4].trim();
      
      if (text) {
         result.push({ time, text });
      } else {
         // Also push empty lines for instrumental breaks if desired
         result.push({ time, text: '...' });
      }
    }
  }

  // Sort by time just in case
  return result.sort((a, b) => a.time - b.time);
};
