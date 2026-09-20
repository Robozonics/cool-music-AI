import { useState } from 'react';
import { parseAICommand, getMoodRecommendations, generateAIPlaylist } from '../services/geminiService';
import { searchSaavn } from '../services/unblockedMusicService';
import { usePlayerStore } from '../store/usePlayerStore';

export const useAICommandProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const speakFeedback = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

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
              speakFeedback(`Playing ${track.title} by ${track.artist}`);
            } else {
              speakFeedback(`I couldn't find ${parsed.query}`);
            }
          }
          break;
        }
        case 'add_to_playlist': {
          let track = null;
          const q = parsed.query?.toLowerCase() || '';
          if (q.includes('this song') || q.includes('this track') || q.includes('current song')) {
            track = usePlayerStore.getState().currentTrack;
          } else if (parsed.query) {
            const results = await searchSaavn(parsed.query);
            if (results && results.length > 0) track = results[0];
          }

          if (track) {
            const state = usePlayerStore.getState();
            const playlists = state.savedPlaylists;
            let playlistName = "My AI Playlist";
            if (playlists.length > 0) {
              state.addTrackToPlaylist(playlists[0].id, track);
              playlistName = playlists[0].name;
            } else {
              state.savePlaylist(playlistName, [track]);
            }
            speakFeedback(`Added ${track.title} to ${playlistName}`);
          } else {
            speakFeedback(`I couldn't find the song to add.`);
          }
          break;
        }
        case 'share': {
          usePlayerStore.getState().setShareSnippetOpen(true);
          speakFeedback(`Opening share options`);
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
                speakFeedback(`Playing some mood music for you.`);
              }
            } else {
              speakFeedback(`I couldn't find any mood music for ${parsed.query}`);
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
            usePlayerStore.getState().setQueue(tracks);
            usePlayerStore.getState().playTrack(tracks[0]);
            speakFeedback(`I created an AI playlist based on ${seedTitle}. Playing it now.`);
          } else {
            speakFeedback(`I couldn't generate a playlist for ${seedTitle}.`);
          }
          break;
        }
        case 'create_empty_playlist': {
          const playlistName = parsed.query || 'New AI Playlist';
          usePlayerStore.getState().savePlaylist(playlistName, []);
          speakFeedback(`Empty playlist ${playlistName} is successfully created.`);
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
