import CryptoJS from 'crypto-js';
import type { Track } from '../types/music';
import { Capacitor } from '@capacitor/core';

const SAAVN_BASE = 'https://www.jiosaavn.com/api.php';
const SAAVN_KEY = '38346591';

const proxifyUrl = (url: string, type: 'saavn' | 'youtube') => {
  if (Capacitor.isNativePlatform()) {
    return url;
  }
  
  // Use relative proxy path for both localhost (Vite) and Vercel deployments
  if (type === 'saavn') return url.replace('https://www.jiosaavn.com', '/api/saavn');
  if (type === 'youtube') return url.replace('https://suggestqueries.google.com', '/api/youtube');
  
  return url;
};

const decodeHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
};

const artworkCache = new Map<string, string>();

export const fetchAccurateArtwork = async (title: string, artist: string): Promise<string | null> => {
  const cleanTitle = title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
  const cleanArtist = artist.split(',')[0].replace(/feat\..*/i, '').trim();
  const cacheKey = `${cleanTitle.toLowerCase()} - ${cleanArtist.toLowerCase()}`;
  
  if (artworkCache.has(cacheKey)) {
    return artworkCache.get(cacheKey) || null;
  }

  try {
    const query = encodeURIComponent(`${cleanTitle} ${cleanArtist}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
        const hqUrl = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        artworkCache.set(cacheKey, hqUrl);
        return hqUrl;
      }
    }
  } catch (e) {
    console.warn('iTunes artwork fetch error:', e);
  }
  
  artworkCache.set(cacheKey, '');
  return null;
};

export const fetchMusicBrainzCoverArt = async (title: string, artist: string): Promise<string | null> => {
  try {
    const query = encodeURIComponent(`recording:"${title}" AND artist:"${artist}"`);
    const mbUrl = `https://musicbrainz.org/ws/2/recording?query=${query}&fmt=json&limit=5`;
    const res = await fetch(mbUrl, { headers: { 'User-Agent': 'VibeStream/1.0 (test@test.com)' } });
    if (!res.ok) return null;
    
    const data = await res.json();
    if (!data.recordings || data.recordings.length === 0) return null;
    
    // Find the first recording that has a release
    for (const recording of data.recordings) {
      if (recording.releases && recording.releases.length > 0) {
        const releaseId = recording.releases[0].id;
        return `https://coverartarchive.org/release/${releaseId}/front`;
      }
    }
  } catch (e) {
    console.error('Error fetching MusicBrainz cover art:', e);
  }
  return null;
};

export const decryptSaavnUrl = (url: string) => {
  try {
    const key = CryptoJS.enc.Utf8.parse(SAAVN_KEY);
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(url) } as CryptoJS.lib.CipherParams,
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    return decrypted.toString(CryptoJS.enc.Utf8)
      .replace(/_(96|160)\.mp4$/, '_320.mp4')
      .replace(/_(96|160)\.mp3$/, '_320.mp3')
      .replace(/_(96|160)\.m4a$/, '_320.m4a');
  } catch (error) {
    console.error('Error decrypting URL', error);
    return '';
  }
};

export const fetchFreshSaavnUrl = async (trackId: string): Promise<string> => {
  try {
    const rawId = trackId.replace('saavn-', '');
    const detailsUrl = `${SAAVN_BASE}?__call=song.getDetails&pids=${rawId}&_marker=0&ctx=android&_format=json`;
    const res = await fetch(proxifyUrl(detailsUrl, 'saavn'));
    if (!res.ok) return '';
    const data = await res.json();
    // Only pick the matching song to prevent audio-song mismatch
    const song = data[rawId] || (data[Object.keys(data)[0]]?.id === rawId ? data[Object.keys(data)[0]] : null);
    if (!song) return '';
    
    let streamUrl = song.media_preview_url || '';
    if (song.encrypted_media_url) {
      streamUrl = decryptSaavnUrl(song.encrypted_media_url);
    }
    
    // Proxy ALL streamUrls to bypass CORS for Web Audio API
    if (streamUrl && streamUrl.startsWith('http')) {
      try {
         if (Capacitor.isNativePlatform()) {
             // Do nothing for native, use direct URL
         } else {
             const urlObj = new URL(streamUrl);
             streamUrl = '/api/saavncdn' + urlObj.pathname + urlObj.search;
         }
      } catch (e) {}
    }
    return streamUrl;
  } catch (e) {
    console.error('Error refreshing Saavn URL:', e);
    return '';
  }
};

export const searchSaavn = async (query: string): Promise<Track[]> => {
  try {
    // 1. Try search.getResults first (returns relevant songs with accurate data and ordering)
    const directUrl = `${SAAVN_BASE}?__call=search.getResults&_marker=0&q=${encodeURIComponent(query)}&ctx=android&_format=json&p=1&n=20`;
    const directRes = await fetch(proxifyUrl(directUrl, 'saavn'));
    
    if (directRes.ok) {
      const directData = await directRes.json();
      const rawResults = directData.results || directData.songs?.data || [];
      if (Array.isArray(rawResults) && rawResults.length > 0) {
        const tracks: Track[] = [];
        for (const song of rawResults) {
          if (!song || typeof song !== 'object') continue;
          
          let streamUrl = song.media_preview_url || '';
          if (song.encrypted_media_url) {
            streamUrl = decryptSaavnUrl(song.encrypted_media_url);
          }
          
          if (streamUrl && streamUrl.startsWith('http')) {
            try {
              if (!Capacitor.isNativePlatform()) {
                const urlObj = new URL(streamUrl);
                streamUrl = '/api/saavncdn' + urlObj.pathname + urlObj.search;
              }
            } catch (e) {}
          }
          
          const trackId = song.id;
          if (!trackId) continue;
          
          const title = decodeHtml(song.song || song.title || 'Unknown Title');
          const artist = decodeHtml(song.singers || song.primary_artists || 'Unknown Artist');
          
          let thumbnailUrl = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&q=80';
          if (typeof song.image === 'string') {
            thumbnailUrl = song.image.replace(/150x150|50x50|250x250|100x100/g, '500x500');
          } else if (Array.isArray(song.image) && song.image.length > 0) {
            const img = song.image[song.image.length - 1];
            thumbnailUrl = (img.link || img.url || thumbnailUrl).replace(/150x150|50x50|250x250|100x100/g, '500x500');
          }

          // If the thumbnail looks like a generic compilation album or placeholder, fetch accurate cover
          const isGenericCover = /Viral-TikTok|Trending-Love|Various-Artists|editorial|unsplash\.com/i.test(thumbnailUrl);
          if (isGenericCover) {
            const accurateArt = await fetchAccurateArtwork(title, artist);
            if (accurateArt) {
              thumbnailUrl = accurateArt;
            }
          }
          
          tracks.push({
            id: `saavn-${trackId}`,
            title,
            artist,
            thumbnail: thumbnailUrl,
            duration: parseInt(song.duration, 10) || 180,
            streamUrl,
            source: 'saavn',
            sourceBadge: 'Studio 320k',
          });
        }
        
        if (tracks.length > 0) {
          return tracks;
        }
      }
    }

    // 2. Fallback to autocomplete.get
    const searchUrl = `${SAAVN_BASE}?__call=autocomplete.get&_marker=0&query=${encodeURIComponent(query)}&ctx=android&_format=json`;
    const res = await fetch(proxifyUrl(searchUrl, 'saavn'));
    
    if (!res.ok) throw new Error(`Saavn Search HTTP error! status: ${res.status}`);
    const data = await res.json();
    
    if (!data.songs?.data) return [];
    
    const songIds = data.songs.data.map((s: any) => s.id).join(',');
    const detailsUrl = `${SAAVN_BASE}?__call=song.getDetails&pids=${songIds}&_marker=0&ctx=android&_format=json`;
    const detailsRes = await fetch(proxifyUrl(detailsUrl, 'saavn'));
    
    if (!detailsRes.ok) throw new Error(`Saavn Details HTTP error! status: ${detailsRes.status}`);
    const detailsData = await detailsRes.json();
    
    const tracks: Track[] = [];
    for (const item of data.songs.data) {
      const song = detailsData[item.id] || detailsData[item.id?.toString()];
      if (!song || typeof song !== 'object' || !song.song) continue;
      
      let streamUrl = song.media_preview_url || '';
      if (song.encrypted_media_url) {
        streamUrl = decryptSaavnUrl(song.encrypted_media_url);
      }
      
      if (streamUrl && streamUrl.startsWith('http')) {
        try {
          if (!Capacitor.isNativePlatform()) {
            const urlObj = new URL(streamUrl);
            streamUrl = '/api/saavncdn' + urlObj.pathname + urlObj.search;
          }
        } catch (e) {}
      }
      
      const trackId = song.id || item.id;
      if (!trackId) continue;

      const title = decodeHtml(song.song || song.title || 'Unknown Title');
      const artist = decodeHtml(song.singers || song.primary_artists || 'Unknown Artist');

      let thumbnailUrl = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&q=80';
      if (typeof song.image === 'string') {
        thumbnailUrl = song.image.replace(/150x150|50x50|250x250|100x100/g, '500x500');
      } else if (Array.isArray(song.image) && song.image.length > 0) {
        const img = song.image[song.image.length - 1];
        thumbnailUrl = (img.link || img.url || thumbnailUrl).replace(/150x150|50x50|250x250|100x100/g, '500x500');
      }

      const isGenericCover = /Viral-TikTok|Trending-Love|Various-Artists|editorial|unsplash\.com/i.test(thumbnailUrl);
      if (isGenericCover) {
        const accurateArt = await fetchAccurateArtwork(title, artist);
        if (accurateArt) {
          thumbnailUrl = accurateArt;
        }
      }

      tracks.push({
        id: `saavn-${trackId}`,
        title,
        artist,
        thumbnail: thumbnailUrl,
        duration: parseInt(song.duration, 10) || 180,
        streamUrl,
        source: 'saavn',
        sourceBadge: 'Studio 320k',
      });
    }
    
    return tracks;
  } catch (err) {
    console.error('Saavn Search Error:', err);
    return [];
  }
};

export const searchYouTube = async (query: string): Promise<Track[]> => {
  try {
    const ytUrl = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
    const res = await fetch(proxifyUrl(ytUrl, 'youtube'));
    
    if (!res.ok) throw new Error(`YouTube Search HTTP error! status: ${res.status}`);
    const data = await res.json();
    
    const suggestions: string[] = data[1] || [];
    
    return suggestions.map((s, index) => ({
      id: `yt-search-${Date.now()}-${index}`,
      title: s,
      artist: 'YouTube Search',
      thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&q=80', // placeholder
      duration: 0,
      streamUrl: s, 
      source: 'invidious',
      sourceBadge: 'YouTube Music',
    }));
  } catch (err) {
    console.error('YouTube Search Error:', err);
    return [];
  }
};

export const searchUnblocked = async (query: string): Promise<Track[]> => {
  return await searchSaavn(query);
};
