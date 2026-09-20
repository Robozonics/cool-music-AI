import { useState } from 'react';
import { parseAICommand, getMoodRecommendations, generateAIPlaylist } from '../services/geminiService';
import { searchSaavn } from '../services/unblockedMusicService';
import { usePlayerStore } from '../store/usePlayerStore';

export const useAICommandProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processCommand = async (command: string, openAICommandBox?: () => void) => {
    if (!command.trim()) return;
    setIsProcessing(true);
    
    try {
      const parsed = await parseAICommand(command);
      
      switch (parsed.action) {
        case 'play': {
          if (parsed.query) {
            const results = await searchSaavn(parsed.query);
            if (results && results.length > 0) {
              const track = results[0];
              usePlayerStore.getState().setQueue([track]);
              usePlayerStore.getState().playTrack(track);
            }
          }
          break;
        }
        case 'add_to_playlist': {
          if (parsed.query) {
            const results = await searchSaavn(parsed.query);
            if (results && results.length > 0) {
              usePlayerStore.getState().openAddToPlaylistModal(results[0]);
            }
          }
          break;
        }
        case 'share': {
          if (usePlayerStore.getState().currentTrack) {
            usePlayerStore.getState().setShareSnippetOpen(true);
          }
          break;
        }
        case 'mood': {
          if (parsed.query) {
            const results = await getMoodRecommendations(parsed.query);
            if (results && results.length > 0) {
              const tracks = await Promise.all(
                results.map(async r => {
                  const searchRes = await searchSaavn(`${r.title} ${r.artist}`);
                  return searchRes.length > 0 ? searchRes[0] : null;
                })
              );
              const validTracks = tracks.filter((t): t is NonNullable<typeof t> => t !== null);
              if (validTracks.length > 0) {
                usePlayerStore.getState().setQueue(validTracks);
                usePlayerStore.getState().playTrack(validTracks[0]);
              }
            }
          }
          break;
        }
        case 'create_playlist': {
          if (parsed.query) {
            // For a simple seamless experience, we extract seed roughly
            // Or we could trigger AIPlaylistModal, but user asked it to do it directly.
            // Let's just generate directly if we have a seed. 
            // We assume query contains the seed (e.g. "Starboy by The Weeknd").
            // We'll just search it, grab the first result as seed.
            const results = await searchSaavn(parsed.query);
            if (results && results.length > 0) {
              const seedTrack = results[0];
              const tracks = await generateAIPlaylist({ artist: seedTrack.artist, song: seedTrack.title });
              if (tracks.length > 0) {
                usePlayerStore.getState().setQueue(tracks);
                usePlayerStore.getState().playTrack(tracks[0]);
              }
            }
          }
          break;
        }
        default:
          if (openAICommandBox) {
            // If unknown and wake word triggered, open the box to let the user see it
            openAICommandBox();
          }
          break;
      }
    } catch (e) {
      console.error('Command processing failed', e);
      if (openAICommandBox) openAICommandBox();
    } finally {
      setIsProcessing(false);
    }
  };

  return { isProcessing, processCommand };
};
