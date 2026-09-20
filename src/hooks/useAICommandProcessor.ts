import { useState } from 'react';
import { parseAICommand, getMoodRecommendations, generateAIPlaylist } from '../services/geminiService';
import { searchSaavn } from '../services/unblockedMusicService';
import { usePlayerStore } from '../store/usePlayerStore';

export const useAICommandProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Feedback removed per user request

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
          let track = null;
          const q = parsed.query?.toLowerCase() || '';
          
          if (!q || q.includes('this') || q.includes('current') || q.includes('playing') || q === 'it') {
            track = usePlayerStore.getState().currentTrack;
          } else {
            const results = await searchSaavn(parsed.query);
            if (results && results.length > 0) track = results[0];
          }

          if (track) {
            const state = usePlayerStore.getState();
            const playlists = state.savedPlaylists;
            let playlistName = "My AI Playlist";
            if (playlists.length > 0) {
              const latestPlaylist = playlists[playlists.length - 1];
              state.addTrackToPlaylist(latestPlaylist.id, track);
              playlistName = latestPlaylist.name;
            } else {
              state.savePlaylist(playlistName, [track]);
            }
          }
          break;
        }
        case 'share': {
          usePlayerStore.getState().setShareSnippetOpen(true);
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
          let seedArtist = 'Various Artists';
          let seedTitle = parsed.query || 'Hits';
          if (parsed.query) {
            const results = await searchSaavn(parsed.query);
            if (results && results.length > 0) {
              seedArtist = results[0].artist || seedArtist;
              seedTitle = results[0].title || seedTitle;
            }
          }
          const tracks = await generateAIPlaylist({ artist: seedArtist, song: seedTitle });
          if (tracks.length > 0) {
            const playlistName = `AI Mix: ${seedTitle}`;
            usePlayerStore.getState().savePlaylist(playlistName, tracks);
            usePlayerStore.getState().setQueue(tracks);
            usePlayerStore.getState().playTrack(tracks[0]);
          }
          break;
        }
        case 'create_empty_playlist': {
          const playlistName = parsed.query || 'New AI Playlist';
          usePlayerStore.getState().savePlaylist(playlistName, []);
          break;
        }
        case 'smart_mix': {
          const state = usePlayerStore.getState();
          if (!state.isCrossfadeEnabled) {
            state.toggleCrossfade();
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
