import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import type { Track } from '../types/music';

const OFFLINE_KEY = 'offline_vault_tracks';

export const downloadTrack = async (track: Track): Promise<boolean> => {
  try {
    if (!track.streamUrl || track.source !== 'saavn') {
      console.warn('Track cannot be downloaded.');
      return false;
    }

    const isNative = Capacitor.isNativePlatform();
    console.log(`Starting download for ${track.title} [Native: ${isNative}]...`);
    
    const response = await fetch(track.streamUrl);
    
    if (isNative) {
      const blob = await response.blob();
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
          } else {
            reject(new Error('Failed to read blob as base64'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      await Filesystem.writeFile({
        path: `vibestream_downloads/${track.id}.m4a`,
        data: base64Data,
        directory: Directory.Data,
        recursive: true
      });
    } else {
      // Web: Use Cache API
      const cache = await caches.open('vibestream-offline');
      await cache.put(`/offline/${track.id}.m4a`, response);
    }

    // Save metadata
    let offlineTracks: Track[] = [];
    if (isNative) {
      const { value } = await Preferences.get({ key: OFFLINE_KEY });
      if (value) offlineTracks = JSON.parse(value);
    } else {
      const value = localStorage.getItem(OFFLINE_KEY);
      if (value) offlineTracks = JSON.parse(value);
    }
    
    if (!offlineTracks.find(t => t.id === track.id)) {
      offlineTracks.push(track);
      if (isNative) {
        await Preferences.set({ key: OFFLINE_KEY, value: JSON.stringify(offlineTracks) });
      } else {
        localStorage.setItem(OFFLINE_KEY, JSON.stringify(offlineTracks));
      }
    }

    alert(`Downloaded ${track.title} successfully!`);
    return true;
  } catch (error) {
    console.error('Download failed', error);
    alert('Failed to download track.');
    return false;
  }
};

export const getOfflineTracks = async (): Promise<Track[]> => {
  try {
    const isNative = Capacitor.isNativePlatform();
    let value: string | null = null;
    
    if (isNative) {
      const pref = await Preferences.get({ key: OFFLINE_KEY });
      value = pref.value;
    } else {
      value = localStorage.getItem(OFFLINE_KEY);
    }

    if (!value) return [];
    
    const tracks: Track[] = JSON.parse(value);
    
    // Resolve local paths
    for (const t of tracks) {
      try {
         if (isNative) {
           const uriResult = await Filesystem.getUri({
             directory: Directory.Data,
             path: `vibestream_downloads/${t.id}.m4a`
           });
           t.streamUrl = Capacitor.convertFileSrc(uriResult.uri);
           t.isOffline = true;
         } else {
           const cache = await caches.open('vibestream-offline');
           const cachedResponse = await cache.match(`/offline/${t.id}.m4a`);
           if (cachedResponse) {
             const blob = await cachedResponse.blob();
             t.streamUrl = URL.createObjectURL(blob);
             t.isOffline = true;
           }
         }
      } catch (e) {
         console.warn(`File missing for ${t.id}`);
      }
    }
    
    return tracks.filter(t => t.isOffline);
  } catch (e) {
    console.error('Error getting offline tracks', e);
    return [];
  }
};

export const deleteOfflineTrack = async (trackId: string): Promise<void> => {
  try {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      await Filesystem.deleteFile({
        directory: Directory.Data,
        path: `vibestream_downloads/${trackId}.m4a`
      });
    } else {
      const cache = await caches.open('vibestream-offline');
      await cache.delete(`/offline/${trackId}.m4a`);
    }
    
    let value: string | null = null;
    if (isNative) {
      const pref = await Preferences.get({ key: OFFLINE_KEY });
      value = pref.value;
    } else {
      value = localStorage.getItem(OFFLINE_KEY);
    }

    if (value) {
      const tracks: Track[] = JSON.parse(value);
      const filtered = tracks.filter(t => t.id !== trackId);
      if (isNative) {
        await Preferences.set({ key: OFFLINE_KEY, value: JSON.stringify(filtered) });
      } else {
        localStorage.setItem(OFFLINE_KEY, JSON.stringify(filtered));
      }
    }
  } catch (e) {
    console.error('Error deleting offline track', e);
  }
};
