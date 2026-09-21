import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track, SavedPlaylist, DjEvent } from '../types/music';

// Global native audio instance for Direct CDNs
export const nativeAudio = new Audio();
nativeAudio.crossOrigin = "anonymous";

// Secondary audio instance for crossfade — lives here at module scope so it persists
export const crossfadeAudio = new Audio();
crossfadeAudio.crossOrigin = "anonymous";

// DJ Arrangement Web Audio State
export let audioCtx: AudioContext | null = null;
export let nativeAudioSource: MediaElementAudioSourceNode | null = null;
export let nativeAudioFilter: BiquadFilterNode | null = null;
export let nativeBassFilter: BiquadFilterNode | null = null;
export let normalGain: GainNode | null = null;
export let karaokeGain: GainNode | null = null;

interface AuxContext {
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode | null;
  filter: BiquadFilterNode | null;
  bassFilter: BiquadFilterNode | null;
  trackId: string;
}
export let auxContexts: AuxContext[] = [];

export let currentArrangement: DjEvent[] = [];
export let processedEvents: Set<string> = new Set();

const initAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    nativeAudioSource = audioCtx.createMediaElementSource(nativeAudio);
    
    nativeBassFilter = audioCtx.createBiquadFilter();
    nativeBassFilter.type = 'lowshelf';
    nativeBassFilter.frequency.value = 200;
    nativeBassFilter.gain.value = 0;

    nativeAudioFilter = audioCtx.createBiquadFilter();
    nativeAudioFilter.type = 'peaking';
    nativeAudioFilter.frequency.value = 1000;
    nativeAudioFilter.Q.value = 1.5;
    nativeAudioFilter.gain.value = 0; // 0 = no cut
    
    nativeAudioSource.connect(nativeBassFilter);
    nativeBassFilter.connect(nativeAudioFilter);
    
    // Normal Mix
    normalGain = audioCtx.createGain();
    normalGain.gain.value = 1;
    nativeAudioFilter.connect(normalGain);
    normalGain.connect(audioCtx.destination);

    // Karaoke Mix (Advanced Center Cancellation with Bass Preservation)
    karaokeGain = audioCtx.createGain();
    karaokeGain.gain.value = 0;
    
    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 300; // Keep bass below 300Hz
    
    const highpass = audioCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 300; // Vocals and mids above 300Hz

    nativeAudioFilter.connect(lowpass);
    nativeAudioFilter.connect(highpass);

    const splitter = audioCtx.createChannelSplitter(2);
    const merger = audioCtx.createChannelMerger(2);
    const inverter = audioCtx.createGain();
    inverter.gain.value = -1;

    highpass.connect(splitter);
    
    // Center cancellation on mids/highs (L - R)
    splitter.connect(merger, 0, 0);
    splitter.connect(merger, 0, 1);
    splitter.connect(inverter, 1, 0);
    inverter.connect(merger, 0, 0);
    inverter.connect(merger, 0, 1);
    
    // Recombine preserved bass and cancelled mids
    merger.connect(karaokeGain);
    lowpass.connect(karaokeGain);
    karaokeGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const rampVolume = (
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

const executeDjEvent = (evt: DjEvent, volume: number) => {
  let targetAudio: HTMLAudioElement | null = null;
  let targetFilter: BiquadFilterNode | null = null;
  let targetBassFilter: BiquadFilterNode | null = null;
  
  const isAux = auxContexts.find(x => x.trackId === evt.trackId);
  if (isAux) {
     targetAudio = isAux.audio;
     targetFilter = isAux.filter;
     targetBassFilter = isAux.bassFilter;
  } else {
     // If not an aux track, it must be the anchor/main track
     targetAudio = nativeAudio;
     targetFilter = nativeAudioFilter;
     targetBassFilter = nativeBassFilter;
  }
  
  if (!targetAudio) return;
  
  switch (evt.type) {
    case 'seek':
      if (evt.seekTo !== undefined) {
        targetAudio.currentTime = evt.seekTo;
      }
      break;
    case 'set_volume':
      if (evt.volume !== undefined) {
        rampVolume(targetAudio, targetAudio.volume, evt.volume * volume, 500);
      }
      break;
    case 'play':
      targetAudio.volume = volume;
      targetAudio.play().catch(() => {});
      break;
    case 'pause':
      rampVolume(targetAudio, targetAudio.volume, 0, 800, () => {
        targetAudio!.pause();
      });
      break;
    case 'fade_in':
      targetAudio.volume = 0;
      targetAudio.play().catch(() => {});
      rampVolume(targetAudio, 0, volume, 3000);
      break;
    case 'fade_out':
      rampVolume(targetAudio, targetAudio.volume, 0, 3000);
      break;
    case 'cut_vocals':
      if (targetFilter && audioCtx) {
        targetFilter.gain.setTargetAtTime(-24, audioCtx.currentTime, 0.5);
      }
      break;
    case 'restore_vocals':
      if (targetFilter && audioCtx) {
        targetFilter.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
      }
      break;
    case 'cut_bass':
      if (targetBassFilter && audioCtx) {
        targetBassFilter.gain.setTargetAtTime(-24, audioCtx.currentTime, 0.5);
      }
      break;
    case 'restore_bass':
      if (targetBassFilter && audioCtx) {
        targetBassFilter.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
      }
      break;
    case 'highpass':
      if (audioCtx) {
        // Apply a high-pass filter sweep to cut low-end on entry
        const hpFilter = audioCtx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.value = evt.filterHz ?? 800;
        hpFilter.Q.value = 0.5;
        // Sweep: ramp frequency from filterHz down to 20Hz over 4s
        hpFilter.frequency.setTargetAtTime(20, audioCtx.currentTime, 2.0);
      }
      break;
    case 'lowpass':
      if (audioCtx) {
        const lpFilter = audioCtx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.frequency.value = evt.filterHz ?? 1200;
        lpFilter.Q.value = 0.5;
        // Sweep: ramp frequency from filterHz up to 20000Hz over 4s
        lpFilter.frequency.setTargetAtTime(20000, audioCtx.currentTime, 2.0);
      }
      break;
    case 'filter_reset':
      // Restore filters to neutral
      if (targetFilter && audioCtx) {
        targetFilter.gain.setTargetAtTime(0, audioCtx.currentTime, 0.3);
      }
      if (targetBassFilter && audioCtx) {
        targetBassFilter.gain.setTargetAtTime(0, audioCtx.currentTime, 0.3);
      }
      break;
  }
};

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
  likedTrackDetails: Track[];
  repeatMode: 'off' | 'all' | 'one';
  isCrossfadeEnabled: boolean;
  isCrossfading: boolean; // actively crossfading right now
  isVideoMode: boolean;
  toggleVideoMode: () => void;

  // Autoplay Handling
  isAutoplayBlocked: boolean;
  resolveAutoplayBlock: () => void;

  isKaraokeMode: boolean;
  toggleKaraokeMode: () => void;

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
  toggleLikeTrack: (track: Track) => void;
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
    
    // Do NOT auto-play aux tracks here, wait for the 'play' event to unlock them
    // so they are started with a valid user gesture.
  };


  // ─────────────────────────────────────────────
  // Native audio event listeners
  // ─────────────────────────────────────────────

  nativeAudio.addEventListener('timeupdate', () => {
    const state = get();
    const t = nativeAudio.currentTime;
    set({ currentTime: t });

    // Process DJ Arrangement
    if (currentArrangement && currentArrangement.length > 0 && state.currentTrack) {
      currentArrangement.forEach((evt, idx) => {
        const eventId = `${idx}-${evt.timestamp}-${evt.type}-${evt.trackId}`;
        if (t >= evt.timestamp && !processedEvents.has(eventId)) {
          processedEvents.add(eventId);
          console.log(`[DJ] t=${t.toFixed(1)}s firing event:`, evt.type, 'track:', evt.trackId.slice(-8), evt.seekTo !== undefined ? `seekTo:${evt.seekTo}` : '');
          executeDjEvent(evt, state.volume);
        }
      });
    }

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
    console.warn('Track playback failed (likely CORS or network error).');
    set({ isPlaying: false, isBuffering: false });
  });

  nativeAudio.addEventListener('play', () => {
    nativeAudio.playbackRate = get().playbackRate;
    set({ isAutoplayBlocked: false });
    
    // Unlock auxiliary tracks for mobile autoplay policies and keep them synced!
    auxContexts.forEach(a => {
       a.audio.playbackRate = get().playbackRate;
       // Play them immediately so they stay in perfect sync with the master track.
       // Their initial volume is 0, and the DJ Events will fade them in when needed.
       if (a.audio.paused) {
         a.audio.play().catch(() => console.warn('Aux autoplay blocked'));
       }
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
    auxContexts.forEach(a => a.audio.pause());
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
    likedTrackDetails: [],
    savedPlaylists: [],
    repeatMode: 'off',
    isCrossfadeEnabled: false,
    isCrossfading: false,
    isVideoMode: false,
    toggleVideoMode: () => set(state => ({ isVideoMode: !state.isVideoMode })),
    isAutoplayBlocked: false,
    isApiKeyModalOpen: false,
    isKaraokeMode: false,

    setApiKeyModalOpen: (open: boolean) => set({ isApiKeyModalOpen: open }),

    toggleKaraokeMode: () => {
       const state = get();
       const newMode = !state.isKaraokeMode;
       set({ isKaraokeMode: newMode });
       if (normalGain && karaokeGain && audioCtx) {
         normalGain.gain.setTargetAtTime(newMode ? 0 : 1, audioCtx.currentTime, 0.1);
         karaokeGain.gain.setTargetAtTime(newMode ? 1 : 0, audioCtx.currentTime, 0.1);
       }
    },

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
      auxContexts.forEach(a => { a.audio.pause(); a.audio.src = ''; });
      auxContexts = [];
      processedEvents.clear();
      currentArrangement = track.arrangement || [];
      
      initAudioContext();
      if (normalGain && karaokeGain) {
         const mode = get().isKaraokeMode;
         normalGain.gain.value = mode ? 0 : 1;
         karaokeGain.gain.value = mode ? 1 : 0;
      }
      
      // Setup new auxiliary audios for mashups
      if (track.mashupStreamUrls && track.mashupStreamUrls.length > 0) {
        track.mashupStreamUrls.forEach(item => {
           const aux = new Audio(item.url);
           aux.crossOrigin = "anonymous";
           aux.volume = get().volume;
           aux.playbackRate = get().playbackRate;
           
           let source = null;
           let filter = null;
           let bassFilter = null;
           
           if (audioCtx) {
             source = audioCtx.createMediaElementSource(aux);

             bassFilter = audioCtx.createBiquadFilter();
             bassFilter.type = 'lowshelf';
             bassFilter.frequency.value = 200;
             bassFilter.gain.value = 0;

             filter = audioCtx.createBiquadFilter();
             filter.type = 'peaking';
             filter.frequency.value = 1000;
             filter.Q.value = 1.5;
             filter.gain.value = 0;

             source.connect(bassFilter);
             bassFilter.connect(filter);
             filter.connect(audioCtx.destination);
           }
           
           auxContexts.push({ audio: aux, source, filter, bassFilter, trackId: item.id });
           // Preload but do NOT auto-play — DJ arrangement controls when each track starts
           // Initialize silent so if the unlock strategy fails, it doesn't blast audio
           aux.volume = 0;
           aux.load();
        });
      }

      // If no arrangement or arrangement doesn't start secondaries, don't auto-play them
      // The DJ arrangement must contain explicit 'play' or 'fade_in' events for each track

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
      auxContexts.forEach(a => { a.audio.pause(); a.audio.src = ''; });
      auxContexts = [];
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
      auxContexts.forEach(a => a.audio.currentTime = seconds);
      processedEvents.clear(); // Reset processed events so it re-evaluates
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

    toggleLikeTrack: (track: Track) => set((state) => {
      const isLiked = state.likedTracks.includes(track.id);
      return {
        likedTracks: isLiked
          ? state.likedTracks.filter(id => id !== track.id)
          : [...state.likedTracks, track.id],
        likedTrackDetails: isLiked
          ? (state.likedTrackDetails || []).filter(t => t.id !== track.id)
          : [...(state.likedTrackDetails || []), track]
      };
    }),

    setRepeatMode: (mode: 'off' | 'all' | 'one') => {
      nativeAudio.loop = (mode === 'one');
      set({ repeatMode: mode });
    },

    toggleCrossfade: () => set(state => ({ isCrossfadeEnabled: !state.isCrossfadeEnabled })),

    setVolume: (vol: number) => {
      const newVol = Math.max(0, Math.min(1, vol));
      nativeAudio.volume = newVol;
      auxContexts.forEach(a => a.audio.volume = newVol);
      set({ volume: newVol });
    },

    setPlaybackRate: (rate: number) => {
      const newRate = Math.max(0.5, Math.min(3, rate));
      nativeAudio.playbackRate = newRate;
      auxContexts.forEach(a => a.audio.playbackRate = newRate);
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
}, {
  name: 'musify-storage',
  partialize: (state) => ({
    savedPlaylists: state.savedPlaylists,
    likedTracks: state.likedTracks,
    likedTrackDetails: state.likedTrackDetails,
    theme: state.theme,
    discoverWeekly: state.discoverWeekly
  }),
}));
