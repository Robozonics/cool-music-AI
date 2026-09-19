import type { LyricLine, TranslatedLyricLine } from '../types/music';

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

      data = searchData[0];
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
      const millisecondsStr = match[3];
      const milliseconds = parseInt(millisecondsStr, 10) * (millisecondsStr.length === 2 ? 10 : 1);

      const time = (minutes * 60) + seconds + (milliseconds / 1000);
      const text = match[4].trim();

      if (text) {
        result.push({ time, text });
      } else {
        result.push({ time, text: '...' });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
};

// ── Live Lyrics Translation (Feature 5b) ────────────────────────────────────
// Translates an array of LyricLine objects to the target language via Gemini.
// Preserves the exact time offsets so translation stays millisecond-synced.
const translationCache = new Map<string, TranslatedLyricLine[]>();

export const translateLyrics = async (
  lines: LyricLine[],
  targetLanguage: string,
  trackId: string
): Promise<TranslatedLyricLine[]> => {
  const cacheKey = `${trackId}__${targetLanguage}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Send only non-instrumental lines to reduce token usage
  const nonEmpty = lines.filter(l => l.text !== '...');
  if (nonEmpty.length === 0) return lines.map(l => ({ ...l }));

  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'translate',
        lyrics: nonEmpty,
        targetLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error('Translation API request failed');
    }

    const data = await response.json();
    const translated: TranslatedLyricLine[] = data.translated || data.recommendations || [];

    if (!Array.isArray(translated) || translated.length === 0) {
      throw new Error('Empty translation response');
    }

    // Build a map of time → translation for fast lookup
    const translationMap = new Map<number, string>();
    translated.forEach(l => {
      if (l.translation) translationMap.set(l.time, l.translation);
    });

    // Merge translations back into the full lines array (including '...' lines)
    const merged: TranslatedLyricLine[] = lines.map(line => ({
      ...line,
      translation: translationMap.get(line.time) ?? undefined,
    }));

    translationCache.set(cacheKey, merged);
    return merged;
  } catch (error) {
    console.error('translateLyrics error:', error);
    // Return original lines without translation on failure
    return lines.map(l => ({ ...l }));
  }
};
