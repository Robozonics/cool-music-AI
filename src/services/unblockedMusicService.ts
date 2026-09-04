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

export const decryptSaavnUrl = (url: string) => {
  try {
    const key = CryptoJS.enc.Utf8.parse(SAAVN_KEY);
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(url) } as CryptoJS.lib.CipherParams,
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    return decrypted.toString(CryptoJS.enc.Utf8).replace('_96.mp4', '_320.mp4');
  } catch (error) {
    console.error('Error decrypting URL', error);
    return '';
  }
};

export const searchSaavn = async (query: string): Promise<Track[]> => {
  try {
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
    for (const key in detailsData) {
      const song = detailsData[key];
      // Skip invalid metadata objects that might be returned alongside the songs
      if (!song || typeof song !== 'object' || !song.song) continue;
      
      let streamUrl = song.media_preview_url || '';
      if (song.encrypted_media_url) {
        streamUrl = decryptSaavnUrl(song.encrypted_media_url);
      }
      
      const trackId = song.id || key;
      if (!trackId) continue;

      let thumbnailUrl = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&q=80';
      if (typeof song.image === 'string') {
        thumbnailUrl = song.image.replace('150x150', '500x500');
      } else if (Array.isArray(song.image) && song.image.length > 0) {
        const img = song.image[song.image.length - 1];
        thumbnailUrl = (img.link || img.url || thumbnailUrl).replace('150x150', '500x500');
      }

      tracks.push({
        id: `saavn-${trackId}`,
        title: song.song || song.title || 'Unknown Title',
        artist: song.singers || song.primary_artists || 'Unknown Artist',
        thumbnail: thumbnailUrl,
        duration: parseInt(song.duration, 10),
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
