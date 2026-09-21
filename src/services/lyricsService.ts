import type { LyricLine, TranslatedLyricLine } from '../types/music';
import { callGeminiDirectly } from './geminiService';
import { usePlayerStore } from '../store/usePlayerStore';

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

    if (!data || (!data.syncedLyrics && !data.plainLyrics)) {
      // AI Fallback for generating lyrics
      return await generateLyricsWithAI(title, artist);
    }

    if (data.syncedLyrics) {
      const synced = parseSyncedLyrics(data.syncedLyrics);
      return { synced, plain: data.plainLyrics || null };
    }

    return { synced: null, plain: data.plainLyrics || null };
  } catch (error) {
    console.error('Error fetching lyrics, attempting AI fallback:', error);
    return await generateLyricsWithAI(title, artist);
  }
};

const generateLyricsWithAI = async (title: string, artist: string): Promise<{ synced: LyricLine[] | null; plain: string | null }> => {
  try {
    const promptText = `You are a music expert. The user requested lyrics for the song "${title}" by ${artist}. 
Please provide the full, accurate plain text lyrics for this song. 
Do not include any formatting, markdown, or conversational filler. Just the lyrics text.
If you absolutely do not know the song, return nothing (an empty string).`;

    const result = await callGeminiDirectly(promptText, 'search', undefined, false);
    
    if (typeof result === 'string' && result.trim() !== '') {
      return { synced: null, plain: result.trim() };
    }

    return { synced: null, plain: null };
  } catch (error: any) {
    console.error('Error generating AI lyrics:', error);
    if (error.message && error.message.toLowerCase().includes('api key')) {
      usePlayerStore.getState().setApiKeyModalOpen(true);
    }
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
    const promptText = `You are a professional lyric translator. Translate the following lyrics into ${targetLanguage}. 
Return a STRICT JSON array with schema: [{"time": number, "translation": "string"}].
Do not include any original lyrics or explanations. ONLY output the valid JSON array.

LYRICS:
${JSON.stringify(nonEmpty.map(l => ({ time: l.time, text: l.text })))}
`;
    
    const translated = await callGeminiDirectly(promptText, 'translate');

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
    return lines.map(l => ({ ...l }));
  }
};

const plainTranslationCache = new Map<string, string>();

export const translatePlainLyrics = async (
  lyrics: string,
  targetLang: string,
  trackId: string
): Promise<string> => {
  const cacheKey = `${trackId}__${targetLang}__plain`;
  if (plainTranslationCache.has(cacheKey)) {
    return plainTranslationCache.get(cacheKey)!;
  }

  try {
    const promptText = `You are a professional lyric translator. Translate the following lyrics into ${targetLang}. 
Return exactly the translated plain text, maintaining line breaks and structure. Do not include any JSON formatting, original lyrics, or explanations. Just the translated text.

Lyrics to translate:
${lyrics}`;

    const translated = await callGeminiDirectly(promptText, 'translate', undefined, false);
    
    if (typeof translated === 'string' && translated.trim() !== '') {
      const finalTranslation = translated.trim();
      plainTranslationCache.set(cacheKey, finalTranslation);
      return finalTranslation;
    }
    
    throw new Error('Invalid translation format received');
  } catch (error) {
    console.error('translatePlainLyrics error:', error);
    return lyrics;
  }
};
