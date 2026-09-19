import { create } from 'zustand';
import type { Track } from '../types/music';
import type { YouTubeEngineRef } from '../components/YouTubeAudioEngine';

// Global native audio instance for Direct CDNs
export const nativeAudio = new Audio();
// Cross-origin for audio context
nativeAudio.crossOrigin = "anonymous";

// Secondary audio instance for crossfade — lives here at module scope so it persists
export const crossfadeAudio = new Audio();
crossfadeAudio.crossOrigin = "anonymous";

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean; // true when audio is stalled waiting for data (network latency)
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
  isCrossfadeEnabled: boolean;
  isCrossfading: boolean; // actively crossfading right now

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
  handleTrackEnd: () => void; // BUG FIX: single entry-point that respects repeatMode
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
  toggleCrossfade: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
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
    if (state.currentTrack?.source === 'saavn') {
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
          if (nextTrk.source !== 'invidious' && nextTrk.sourceBadge !== 'YouTube Music') {
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
      }
    }
  });

  nativeAudio.addEventListener('loadedmetadata', () => {
    const state = get();
    if (state.currentTrack?.source === 'saavn') {
      set({ duration: nativeAudio.duration });
    }
  });

  // ── BUG FIX 1: 'ended' now routes to handleTrackEnd() ──
  nativeAudio.addEventListener('ended', () => {
    get().handleTrackEnd();
  });

  nativeAudio.addEventListener('error', (e) => {
    console.error('Native Audio playback error:', e);
    const { currentTrack, ytEngine } = get();
    // Self-healing recovery: If native CDN drops, attempt to fallback to YouTube Engine
    if (currentTrack && currentTrack.source === 'saavn' && navigator.onLine) {
       console.log('Attempting secondary stream recovery via YouTube...');
       if (ytEngine) {
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
    set({ isAutoplayBlocked: false });
  });

  // ── BUG FIX 3: Use 'playing' (data flowing) NOT 'play' (call issued) for isPlaying ──
  nativeAudio.addEventListener('playing', () => {
    set({ isPlaying: true, isBuffering: false });
  });

  // ── BUG FIX 3: Detect network stall → show buffering spinner ──
  nativeAudio.addEventListener('waiting', () => {
    set({ isBuffering: true });
  });

  nativeAudio.addEventListener('canplay', () => {
    set({ isBuffering: false });
  });

  nativeAudio.addEventListener('pause', () => set({ isPlaying: false, isBuffering: false }));

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
    isFullPlayerOpen: false,
    isLyricsOpen: false,
    isShareSnippetOpen: false,
    isConnectModalOpen: false,
    searchQuery: '',
    isSpeedWheelOpen: false,
    likedTracks: [],
    repeatMode: 'off',
    isCrossfadeEnabled: false,
    isCrossfading: false,
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
      set({ currentTrack: track, currentTime: 0, duration: track.duration || 0, isAutoplayBlocked: false, isBuffering: false, isCrossfading: false });

      // Abort any in-progress crossfade
      crossfadeAudio.pause();
      crossfadeAudio.src = '';

      if (track.source === 'invidious' || track.sourceBadge === 'YouTube Music') {
        nativeAudio.pause();
        nativeAudio.src = '';
        if (ytEngine) {
          ytEngine.playVideo(track.streamUrl);
          ytEngine.setPlaybackRate(get().playbackRate);
        }
      } else {
        if (ytEngine) ytEngine.pause();
        nativeAudio.src = track.streamUrl;
        nativeAudio.volume = get().volume;
        nativeAudio.playbackRate = get().playbackRate;
        attemptPlay();
      }
    },

    // ── BUG FIX 1: Central track-end handler that respects repeatMode ──
    handleTrackEnd: () => {
      const { repeatMode, currentTrack, queue, playTrack } = get();

      // LOOP ONE: restart the exact same track
      if (repeatMode === 'one') {
        if (currentTrack?.source !== 'invidious' && currentTrack?.sourceBadge !== 'YouTube Music') {
          nativeAudio.currentTime = 0;
          attemptPlay();
        } else {
          const { ytEngine } = get();
          if (ytEngine) {
            ytEngine.seek(0);
          }
        }
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

    toggleCrossfade: () => set(state => ({ isCrossfadeEnabled: !state.isCrossfadeEnabled })),

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
