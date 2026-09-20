import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track, SavedPlaylist } from '../types/music';

// Global native audio instance for Direct CDNs
export const nativeAudio = new Audio();
// Cross-origin for audio context
nativeAudio.crossOrigin = "anonymous";

// Secondary audio instance for crossfade — lives here at module scope so it persists
export const crossfadeAudio = new Audio();
crossfadeAudio.crossOrigin = "anonymous";

// Auxiliary audio instances for AI Mashup Studio (playing multiple tracks simultaneously)
export let auxAudios: HTMLAudioElement[] = [];

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean; // true when audio is stalled waiting for data (network latency)
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  queue: Track[];
  isLyricsOpen: boolean;
  isShareSnippetOpen: boolean;
  isConnectModalOpen: boolean;
  searchQuery: string;
  isSpeedWheelOpen: boolean;
  likedTracks: string[];
  repeatMode: 'off' | 'all' | 'one';
  isCrossfadeEnabled: boolean;
  isCrossfading: boolean; // actively crossfading right now
  isVideoMode: boolean;
  toggleVideoMode: () => void;

  // Autoplay Handling
  isAutoplayBlocked: boolean;
  resolveAutoplayBlock: () => void;

  isQueueOpen: boolean;
  setQueueOpen: (open: boolean) => void;

  isFullPlayerOpen: boolean;
  setFullPlayerOpen: (open: boolean) => void;

  isApiKeyModalOpen: boolean;
  setApiKeyModalOpen: (open: boolean) => void;

  // Setters for syncing state
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;

  // Actions
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  closePlayer: () => void;
  seek: (seconds: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  handleTrackEnd: () => void; // single entry-point that respects repeatMode
  setQueue: (tracks: Track[]) => void;
  reorderQueue: (tracks: Track[]) => void;
  setLyricsOpen: (open: boolean) => void;
  setShareSnippetOpen: (open: boolean) => void;
  setConnectModalOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSpeedWheelOpen: (open: boolean) => void;
  setVolume: (volume: number) => void;
  audioAnalyzer: any;
  setAudioAnalyzer: (analyzer: any) => void;
  audioDataArray: Uint8Array | null;
  setAudioDataArray: (data: Uint8Array) => void;
  theme: 'default' | 'cyberpunk' | 'midnight' | 'sunset' | 'aura';
  setTheme: (theme: 'default' | 'cyberpunk' | 'midnight' | 'sunset' | 'aura') => void;
  removeFromQueue: (index: number) => void;
  playNext: (track: Track) => void;
  setPlaybackRate: (rate: number) => void;
  toggleLikeTrack: (trackId: string) => void;
  setRepeatMode: (mode: 'off' | 'all' | 'one') => void;
  toggleCrossfade: () => void;
  
  // Saved Playlists
  savedPlaylists: SavedPlaylist[];
  savePlaylist: (name: string, tracks: Track[]) => string;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  reorderPlaylist: (playlistId: string, newTracks: Track[]) => void;
  deletePlaylist: (id: string) => void;

  // Add to Playlist Modal
  isAddToPlaylistModalOpen: boolean;
  trackToAddToPlaylist: Track | null;
  openAddToPlaylistModal: (track: Track) => void;
  closeAddToPlaylistModal: () => void;

  // Discover Weekly
  discoverWeekly: { tracks: Track[], generatedAt: number, vibeTitle?: string, vibeDescription?: string, vibeColor?: string } | null;
  setDiscoverWeekly: (tracks: Track[], generatedAt: number, vibeTitle?: string, vibeDescription?: string, vibeColor?: string) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => {
  // ─────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────

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
    
    // Attempt to play all auxiliary mashup tracks
    auxAudios.forEach(a => {
       const p = a.play();
       if (p !== undefined) p.catch(() => {}); // Ignore aux autoplay errors
    });
  };

  // Smooth volume ramp via requestAnimationFrame
  const rampVolume = (
    audio: HTMLAudioElement,
    from: number,
    to: number,
    durationMs: number,
    onComplete?: () => void
  ) => {
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      audio.volume = from + (to - from) * progress;
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        audio.volume = to;
        onComplete?.();
      }
    };
    requestAnimationFrame(tick);
  };

  // ─────────────────────────────────────────────
  // Native audio event listeners
  // ─────────────────────────────────────────────

  nativeAudio.addEventListener('timeupdate', () => {
    const state = get();
    const t = nativeAudio.currentTime;
    set({ currentTime: t });

    // ── Crossfade trigger: 3s before end ──
    if (
      state.isCrossfadeEnabled &&
      !state.isCrossfading &&
      state.duration > 0 &&
      state.duration - t <= 3 &&
      state.duration - t > 0 &&
      state.repeatMode !== 'one'
    ) {
      const { queue, currentTrack } = get();
      const currentIndex = queue.findIndex(tr => tr.id === currentTrack!.id);
      const nextIndex =
        state.repeatMode === 'all' && currentIndex >= queue.length - 1
          ? 0
          : currentIndex + 1;

      if (nextIndex < queue.length) {
        const nextTrk = queue[nextIndex];
        set({ isCrossfading: true });

        crossfadeAudio.src = nextTrk.streamUrl;
        crossfadeAudio.volume = 0;
        crossfadeAudio.playbackRate = get().playbackRate;
        const cfPlay = crossfadeAudio.play();
        if (cfPlay) cfPlay.catch(console.error);

        // Fade OUT main, fade IN crossfade
        rampVolume(nativeAudio, get().volume, 0, 3000);
        rampVolume(crossfadeAudio, 0, get().volume, 3000, () => {
          // Swap: crossfadeAudio becomes main, reset nativeAudio
          nativeAudio.pause();
          nativeAudio.src = nextTrk.streamUrl;
          nativeAudio.volume = get().volume;
          nativeAudio.currentTime = crossfadeAudio.currentTime;
          crossfadeAudio.pause();
          crossfadeAudio.src = '';
          set({
            currentTrack: nextTrk,
            currentTime: nativeAudio.currentTime,
            duration: nativeAudio.duration || nextTrk.duration || 0,
            isCrossfading: false,
          });
        });
      }
    }
  });

  nativeAudio.addEventListener('loadedmetadata', () => {
    set({ duration: nativeAudio.duration });
  });

  nativeAudio.addEventListener('ended', () => {
    get().handleTrackEnd();
  });

  nativeAudio.addEventListener('error', () => {
    console.warn('Track playback failed (likely CORS or network error), skipping to next track.');
    get().nextTrack();
  });

  nativeAudio.addEventListener('play', () => {
    nativeAudio.playbackRate = get().playbackRate;
    set({ isAutoplayBlocked: false });
    
    // Sync auxiliary tracks
    auxAudios.forEach(a => {
       a.playbackRate = get().playbackRate;
       const p = a.play();
       if (p !== undefined) p.catch(() => {});
    });
  });

  nativeAudio.addEventListener('playing', () => {
    set({ isPlaying: true, isBuffering: false });
  });

  nativeAudio.addEventListener('waiting', () => {
    set({ isBuffering: true });
  });

  nativeAudio.addEventListener('canplay', () => {
    set({ isBuffering: false });
  });

  nativeAudio.addEventListener('pause', () => {
    set({ isPlaying: false, isBuffering: false });
    auxAudios.forEach(a => a.pause());
  });

  // ─────────────────────────────────────────────
  // Store
  // ─────────────────────────────────────────────
  return {
    currentTrack: null,
    isPlaying: false,
    isBuffering: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    queue: [],
    isQueueOpen: false,
    setQueueOpen: (open: boolean) => set({ isQueueOpen: open }),
    isFullPlayerOpen: false,
    setFullPlayerOpen: (open: boolean) => set({ isFullPlayerOpen: open }),
    isLyricsOpen: false,
    isShareSnippetOpen: false,
    isConnectModalOpen: false,
    searchQuery: '',
    isSpeedWheelOpen: false,
    likedTracks: [],
    savedPlaylists: [],
    repeatMode: 'off',
    isCrossfadeEnabled: false,
    isCrossfading: false,
    isVideoMode: false,
    toggleVideoMode: () => set(state => ({ isVideoMode: !state.isVideoMode })),
    isAutoplayBlocked: false,
    isApiKeyModalOpen: false,

    setApiKeyModalOpen: (open: boolean) => set({ isApiKeyModalOpen: open }),

    discoverWeekly: null,
    setDiscoverWeekly: (tracks: Track[], generatedAt: number, vibeTitle?: string, vibeDescription?: string, vibeColor?: string) => 
      set({ discoverWeekly: { tracks, generatedAt, vibeTitle, vibeDescription, vibeColor } }),

    resolveAutoplayBlock: () => {
       const { isAutoplayBlocked } = get();
       if (isAutoplayBlocked) {
         set({ isAutoplayBlocked: false });
         attemptPlay();
       }
    },

    setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
    setCurrentTime: (time: number) => set({ currentTime: time }),
    audioAnalyzer: null,
    setAudioAnalyzer: (a) => set({ audioAnalyzer: a }),
    audioDataArray: null,
    setAudioDataArray: (d) => set({ audioDataArray: d }),
    theme: 'default',
    setTheme: (theme) => {
      set({ theme });
      if (theme === 'default') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', theme);
      }
    },
    
    removeFromQueue: (index: number) => {
      set(state => {
        const newQueue = [...state.queue];
        newQueue.splice(index, 1);
        return { queue: newQueue };
      });
    },

    playNext: (track: Track) => {
      set(state => {
        const newQueue = [track, ...state.queue];
        return { queue: newQueue };
      });
    },

    setDuration: (duration: number) => set({ duration }),

    playTrack: async (track: Track) => {
      set({ currentTrack: track, currentTime: 0, duration: track.duration || 0, isAutoplayBlocked: false, isBuffering: false, isCrossfading: false });

      // Abort any in-progress crossfade
      crossfadeAudio.pause();
      crossfadeAudio.src = '';
      
      // Clear previous auxiliary audios
      auxAudios.forEach(a => { a.pause(); a.src = ''; });
      auxAudios = [];
      
      // Setup new auxiliary audios for mashups
      if (track.mashupStreamUrls && track.mashupStreamUrls.length > 0) {
        track.mashupStreamUrls.forEach(url => {
           const aux = new Audio(url);
           aux.crossOrigin = "anonymous";
           aux.volume = get().volume;
           aux.playbackRate = get().playbackRate;
           auxAudios.push(aux);
        });
      }

      nativeAudio.src = track.streamUrl;
      nativeAudio.volume = get().volume;
      nativeAudio.playbackRate = get().playbackRate;
      attemptPlay();
    },

    handleTrackEnd: () => {
      const { repeatMode, currentTrack, queue, playTrack } = get();

      // LOOP ONE: restart the exact same track
      if (repeatMode === 'one') {
        nativeAudio.currentTime = 0;
        attemptPlay();
        return;
      }

      // LOOP ALL: wrap around to the beginning
      if (repeatMode === 'all') {
        if (!currentTrack || queue.length === 0) return;
        const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
        const nextIndex = (currentIndex + 1) % queue.length;
        playTrack(queue[nextIndex]);
        return;
      }

      // Default: advance linearly
      get().nextTrack();
    },

    togglePlay: () => {
      const { currentTrack, isPlaying } = get();
      if (!currentTrack) return;
      if (isPlaying) {
        nativeAudio.pause();
      } else {
        attemptPlay();
      }
    },

    closePlayer: () => {
      nativeAudio.pause();
      nativeAudio.src = '';
      crossfadeAudio.pause();
      crossfadeAudio.src = '';
      auxAudios.forEach(a => { a.pause(); a.src = ''; });
      auxAudios = [];
      set({ 
        currentTrack: null, 
        isPlaying: false, 
        currentTime: 0, 
        isFullPlayerOpen: false,
        isLyricsOpen: false,
        isVideoMode: false
      });
    },

    seek: (seconds: number) => {
      const { currentTrack } = get();
      if (!currentTrack) return;
      nativeAudio.currentTime = seconds;
      auxAudios.forEach(a => a.currentTime = seconds);
      set({ currentTime: seconds });
    },

    nextTrack: () => {
      const { queue, currentTrack, playTrack, repeatMode } = get();
      if (!currentTrack || queue.length === 0) return;
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      if (currentIndex >= 0 && currentIndex < queue.length - 1) {
        playTrack(queue[currentIndex + 1]);
      } else if (repeatMode === 'all' && queue.length > 0) {
        // Wrap around to beginning
        playTrack(queue[0]);
      } else {
        nativeAudio.pause();
        nativeAudio.src = '';
        set({ isPlaying: false, currentTime: 0 });
      }
    },

    prevTrack: () => {
      const { queue, currentTrack, playTrack, currentTime } = get();
      if (!currentTrack) return;
      if (currentTime > 3) {
        nativeAudio.currentTime = 0;
        return;
      }
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      if (currentIndex > 0) {
        playTrack(queue[currentIndex - 1]);
      }
    },

    setQueue: (tracks: Track[]) => set({ queue: tracks }),
    reorderQueue: (tracks: Track[]) => set({ queue: tracks }),
    setLyricsOpen: (open: boolean) => set({ isLyricsOpen: open }),
    setShareSnippetOpen: (open: boolean) => set({ isShareSnippetOpen: open }),
    setConnectModalOpen: (open: boolean) => set({ isConnectModalOpen: open }),
    setSearchQuery: (query: string) => set({ searchQuery: query }),
    setSpeedWheelOpen: (open: boolean) => set({ isSpeedWheelOpen: open }),

    toggleLikeTrack: (trackId: string) => set((state) => ({
      likedTracks: state.likedTracks.includes(trackId)
        ? state.likedTracks.filter(id => id !== trackId)
        : [...state.likedTracks, trackId]
    })),

    setRepeatMode: (mode: 'off' | 'all' | 'one') => {
      nativeAudio.loop = (mode === 'one');
      set({ repeatMode: mode });
    },

    toggleCrossfade: () => set(state => ({ isCrossfadeEnabled: !state.isCrossfadeEnabled })),

    setVolume: (vol: number) => {
      const newVol = Math.max(0, Math.min(1, vol));
      nativeAudio.volume = newVol;
      auxAudios.forEach(a => a.volume = newVol);
      set({ volume: newVol });
    },

    setPlaybackRate: (rate: number) => {
      const newRate = Math.max(0.5, Math.min(3, rate));
      nativeAudio.playbackRate = newRate;
      auxAudios.forEach(a => a.playbackRate = newRate);
      set({ playbackRate: newRate });
    },

    isAddToPlaylistModalOpen: false,
    trackToAddToPlaylist: null,
    
    openAddToPlaylistModal: (track: Track) => set({ isAddToPlaylistModalOpen: true, trackToAddToPlaylist: track }),
    closeAddToPlaylistModal: () => set({ isAddToPlaylistModalOpen: false, trackToAddToPlaylist: null }),

    savePlaylist: (name: string, tracks: Track[]) => {
      const id = Math.random().toString(36).substring(2, 9);
      set(state => ({
        savedPlaylists: [
          ...state.savedPlaylists,
          { id, name, tracks }
        ]
      }));
      return id;
    },

    addTrackToPlaylist: (playlistId: string, track: Track) => set(state => ({
      savedPlaylists: state.savedPlaylists.map(p => 
        p.id === playlistId 
          ? { ...p, tracks: [...p.tracks, track] }
          : p
      )
    })),

    removeTrackFromPlaylist: (playlistId: string, trackId: string) => set(state => ({
      savedPlaylists: state.savedPlaylists.map(p =>
        p.id === playlistId
          ? { ...p, tracks: p.tracks.filter(t => t.id !== trackId) }
          : p
      )
    })),

    reorderPlaylist: (playlistId: string, newTracks: Track[]) => set(state => ({
      savedPlaylists: state.savedPlaylists.map(p =>
        p.id === playlistId
          ? { ...p, tracks: newTracks }
          : p
      )
    })),

    deletePlaylist: (id: string) => set(state => ({
      savedPlaylists: state.savedPlaylists.filter(p => p.id !== id)
    })),
  };
    },
    {
      name: 'musify-storage',
      partialize: (state) => ({ 
        savedPlaylists: state.savedPlaylists,
        likedTracks: state.likedTracks,
        theme: state.theme,
        discoverWeekly: state.discoverWeekly
      }),
    }
  )
);
