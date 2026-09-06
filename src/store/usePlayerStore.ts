import { create } from 'zustand';
import type { Track } from '../types/music';
import type { YouTubeEngineRef } from '../components/YouTubeAudioEngine';

// Global native audio instance for Direct CDNs
export const nativeAudio = new Audio();
// Cross-origin for audio context
nativeAudio.crossOrigin = "anonymous";

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  queue: Track[];
  isFullPlayerOpen: boolean;
  isLyricsOpen: boolean;
  isShareSnippetOpen: boolean;
  isConnectModalOpen: boolean;
  searchQuery: string;
  isSpeedWheelOpen: boolean;
  likedTracks: string[];
  repeatMode: 'off' | 'all' | 'one';
  
  // Autoplay Handling
  isAutoplayBlocked: boolean;
  resolveAutoplayBlock: () => void;
  
  isApiKeyModalOpen: boolean;
  setApiKeyModalOpen: (open: boolean) => void;
  
  // YouTube engine ref
  ytEngine: YouTubeEngineRef | null;
  setYtEngine: (engine: YouTubeEngineRef | null) => void;

  // Setters for syncing state from YT Player
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;

  // Actions
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setQueue: (tracks: Track[]) => void;
  setLyricsOpen: (open: boolean) => void;
  setShareSnippetOpen: (open: boolean) => void;
  setConnectModalOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setFullPlayerOpen: (open: boolean) => void;
  setSpeedWheelOpen: (open: boolean) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  toggleLikeTrack: (trackId: string) => void;
  setRepeatMode: (mode: 'off' | 'all' | 'one') => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Attach listeners to global native audio instance
  nativeAudio.addEventListener('timeupdate', () => {
    const state = get();
    if (state.currentTrack?.source === 'saavn') {
      set({ currentTime: nativeAudio.currentTime });
    }
  });

  nativeAudio.addEventListener('loadedmetadata', () => {
    const state = get();
    if (state.currentTrack?.source === 'saavn') {
      set({ duration: nativeAudio.duration });
    }
  });

  nativeAudio.addEventListener('ended', () => {
    get().nextTrack();
  });

  nativeAudio.addEventListener('error', (e) => {
    console.error('Native Audio playback error:', e);
    const { currentTrack, ytEngine } = get();
    // Self-healing recovery: If native CDN drops, attempt to fallback to YouTube Engine
    if (currentTrack && currentTrack.source === 'saavn' && navigator.onLine) {
       console.log('Attempting secondary stream recovery via YouTube...');
       if (ytEngine) {
         // Modify track source to use YouTube Search automatically
         currentTrack.source = 'invidious';
         currentTrack.streamUrl = `${currentTrack.title} ${currentTrack.artist}`;
         get().playTrack(currentTrack);
         return;
       }
    }
    get().nextTrack();
  });

  nativeAudio.addEventListener('play', () => {
    nativeAudio.playbackRate = get().playbackRate;
    set({ isPlaying: true, isAutoplayBlocked: false });
  });
  nativeAudio.addEventListener('pause', () => set({ isPlaying: false }));

  const attemptPlay = () => {
    const playPromise = nativeAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        if (error.name === 'NotAllowedError') {
          console.warn('Autoplay blocked. User interaction required.');
          set({ isAutoplayBlocked: true });
        } else {
          console.error('Playback error:', error);
        }
      });
    }
  };

  return {
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    queue: [],
    isFullPlayerOpen: false,
    isLyricsOpen: false,
    isShareSnippetOpen: false,
    isConnectModalOpen: false,
    searchQuery: '',
    isSpeedWheelOpen: false,
    likedTracks: [],
    repeatMode: 'off',
    ytEngine: null,
    isAutoplayBlocked: false,
    isApiKeyModalOpen: false,

    setApiKeyModalOpen: (open: boolean) => set({ isApiKeyModalOpen: open }),

    resolveAutoplayBlock: () => {
       const { isAutoplayBlocked } = get();
       if (isAutoplayBlocked) {
         set({ isAutoplayBlocked: false });
         attemptPlay();
       }
    },

    setYtEngine: (engine: YouTubeEngineRef | null) => set({ ytEngine: engine }),
    setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
    setCurrentTime: (time: number) => set({ currentTime: time }),
    setDuration: (duration: number) => set({ duration }),

    playTrack: async (track: Track) => {
      const { ytEngine } = get();
      
      // Ensure we have MusicBrainz cover art if possible
      if (track.source === 'saavn' || track.source === 'invidious') {
        import('../services/unblockedMusicService').then(async (module) => {
          const mbArt = await module.fetchMusicBrainzCoverArt(track.title, track.artist);
          if (mbArt && get().currentTrack?.id === track.id) {
            set((state) => ({
              currentTrack: state.currentTrack ? { ...state.currentTrack, thumbnail: mbArt } : null
            }));
          }
        });
      }

      set({ currentTrack: track, currentTime: 0, duration: track.duration || 0, isAutoplayBlocked: false });
      
      if (track.source === 'invidious' || track.sourceBadge === 'YouTube Music') {
        // Stop native audio
        nativeAudio.pause();
        nativeAudio.src = '';
        
        // Play via YT Engine
        if (ytEngine) {
          ytEngine.playVideo(track.streamUrl);
          ytEngine.setPlaybackRate(get().playbackRate);
        }
      } else {
        // Stop YT engine
        if (ytEngine) ytEngine.pause();
        
        // Play native
        nativeAudio.src = track.streamUrl;
        nativeAudio.playbackRate = get().playbackRate;
        attemptPlay();
      }
    },

    togglePlay: () => {
      const { currentTrack, isPlaying, ytEngine } = get();
      if (!currentTrack) return;
      
      const isYT = currentTrack.source === 'invidious' || currentTrack.sourceBadge === 'YouTube Music';

      if (isPlaying) {
        if (isYT && ytEngine) ytEngine.pause();
        else nativeAudio.pause();
      } else {
        if (isYT && ytEngine) ytEngine.resume();
        else attemptPlay();
      }
    },

    seek: (seconds: number) => {
      const { currentTrack, ytEngine } = get();
      if (!currentTrack) return;
      
      const isYT = currentTrack.source === 'invidious' || currentTrack.sourceBadge === 'YouTube Music';
      
      if (isYT && ytEngine) {
        ytEngine.seek(seconds);
      } else {
        nativeAudio.currentTime = seconds;
      }
      set({ currentTime: seconds });
    },

    nextTrack: () => {
      const { queue, currentTrack, playTrack } = get();
      if (!currentTrack || queue.length === 0) return;
      
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      if (currentIndex >= 0 && currentIndex < queue.length - 1) {
        playTrack(queue[currentIndex + 1]);
      } else {
        const { ytEngine } = get();
        nativeAudio.pause();
        nativeAudio.src = '';
        if (ytEngine) ytEngine.pause();
        set({ isPlaying: false, currentTime: 0 });
      }
    },

    prevTrack: () => {
      const { queue, currentTrack, playTrack, currentTime, ytEngine } = get();
      if (!currentTrack) return;
      
      const isYT = currentTrack.source === 'invidious' || currentTrack.sourceBadge === 'YouTube Music';

      if (currentTime > 3) {
        if (isYT && ytEngine) ytEngine.seek(0);
        else nativeAudio.currentTime = 0;
        return;
      }

      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      if (currentIndex > 0) {
        playTrack(queue[currentIndex - 1]);
      }
    },

    setQueue: (tracks: Track[]) => set({ queue: tracks }),
    setLyricsOpen: (open: boolean) => set({ isLyricsOpen: open }),
    setShareSnippetOpen: (open: boolean) => set({ isShareSnippetOpen: open }),
    setConnectModalOpen: (open: boolean) => set({ isConnectModalOpen: open }),
    setSearchQuery: (query: string) => set({ searchQuery: query }),
    setFullPlayerOpen: (open: boolean) => set({ isFullPlayerOpen: open }),
    setSpeedWheelOpen: (open: boolean) => set({ isSpeedWheelOpen: open }),

    toggleLikeTrack: (trackId: string) => set((state) => ({
      likedTracks: state.likedTracks.includes(trackId)
        ? state.likedTracks.filter(id => id !== trackId)
        : [...state.likedTracks, trackId]
    })),
    setRepeatMode: (mode: 'off' | 'all' | 'one') => set({ repeatMode: mode }),

    setVolume: (vol: number) => {
      const newVol = Math.max(0, Math.min(1, vol));
      const { ytEngine } = get();
      
      nativeAudio.volume = newVol;
      if (ytEngine) ytEngine.setVolume(newVol);
      
      set({ volume: newVol });
    },
    
    setPlaybackRate: (rate: number) => {
      const newRate = Math.max(0.5, Math.min(3, rate));
      const { ytEngine } = get();
      
      nativeAudio.playbackRate = newRate;
      if (ytEngine) ytEngine.setPlaybackRate(newRate);
      
      set({ playbackRate: newRate });
    }
  };
});
