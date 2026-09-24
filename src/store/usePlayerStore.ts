import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track, SavedPlaylist, DjEvent } from '../types/music';
import { fetchFreshSaavnUrl } from '../services/unblockedMusicService';

// Global native audio instance for Direct CDNs
export const nativeAudio = new Audio();
nativeAudio.crossOrigin = "anonymous";
if ('preservesPitch' in nativeAudio) {
  (nativeAudio as any).preservesPitch = true;
} else if ('webkitPreservesPitch' in nativeAudio) {
  (nativeAudio as any).webkitPreservesPitch = true;
} else if ('mozPreservesPitch' in nativeAudio) {
  (nativeAudio as any).mozPreservesPitch = true;
}

// Secondary audio instance for crossfade — lives here at module scope so it persists
export const crossfadeAudio = new Audio();
crossfadeAudio.crossOrigin = "anonymous";
if ('preservesPitch' in crossfadeAudio) {
  (crossfadeAudio as any).preservesPitch = true;
} else if ('webkitPreservesPitch' in crossfadeAudio) {
  (crossfadeAudio as any).webkitPreservesPitch = true;
} else if ('mozPreservesPitch' in crossfadeAudio) {
  (crossfadeAudio as any).mozPreservesPitch = true;
}

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

const initAudioContext = (forceKaraokeMode?: boolean) => {
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
    
    const isKaraoke = forceKaraokeMode ?? false;

    // Normal Mix
    normalGain = audioCtx.createGain();
    normalGain.gain.value = isKaraoke ? 0 : 1;
    nativeAudioFilter.connect(normalGain);
    normalGain.connect(audioCtx.destination);

    // Karaoke Mix: Maximum Vocal Suppression Engine
    karaokeGain = audioCtx.createGain();
    karaokeGain.gain.value = isKaraoke ? 1 : 0;

    // 1. Sub-Bass Channel (Steep 24dB/oct @ 90Hz Butterworth lowpass to isolate pure kick & sub-bass without vocal bleed)
    const bassLp1 = audioCtx.createBiquadFilter();
    bassLp1.type = 'lowpass';
    bassLp1.frequency.value = 90;
    bassLp1.Q.value = 0.707;

    const bassLp2 = audioCtx.createBiquadFilter();
    bassLp2.type = 'lowpass';
    bassLp2.frequency.value = 90;
    bassLp2.Q.value = 0.707;

    nativeAudioFilter.connect(bassLp1);
    bassLp1.connect(bassLp2);

    const bassGain = audioCtx.createGain();
    bassGain.gain.value = 1.0;
    bassLp2.connect(bassGain);
    bassGain.connect(karaokeGain);

    // 2. Highpass filter to isolate vocal & instrumental spectrum above sub-bass
    const midHighpass = audioCtx.createBiquadFilter();
    midHighpass.type = 'highpass';
    midHighpass.frequency.value = 90;
    midHighpass.Q.value = 0.707;

    nativeAudioFilter.connect(midHighpass);

    // 3. Stereo Side Matrix Cancellation (L - R)
    // Subtracts center channel completely, eliminating lead center vocals
    const splitter = audioCtx.createChannelSplitter(2);
    const merger = audioCtx.createChannelMerger(2);

    const inverterR = audioCtx.createGain();
    inverterR.gain.value = -1;

    midHighpass.connect(splitter);

    // Invert Right channel: produces -R
    splitter.connect(inverterR, 1, 0);

    // Left channel output: L + (-R) = L - R
    splitter.connect(merger, 0, 0);
    inverterR.connect(merger, 0, 0);

    // Right channel output: L + (-R) = L - R (in-phase with left to prevent mono cancellation and headphone suction)
    splitter.connect(merger, 0, 1);
    inverterR.connect(merger, 0, 1);

    // 4. Multi-Stage Vocal Reverb & Formant Notches
    // Suppresses stereo vocal reverb tails, delays, harmonies, and wide vocal reflections:
    // Formant 1: Lower vocal throat warmth / reverb boom (420Hz, Q=1.2, -10dB)
    const vocalDip1 = audioCtx.createBiquadFilter();
    vocalDip1.type = 'peaking';
    vocalDip1.frequency.value = 420;
    vocalDip1.Q.value = 1.2;
    vocalDip1.gain.value = -10;

    // Formant 2: Vocal core intelligibility & nasal body (1100Hz, Q=1.4, -14dB)
    const vocalDip2 = audioCtx.createBiquadFilter();
    vocalDip2.type = 'peaking';
    vocalDip2.frequency.value = 1100;
    vocalDip2.Q.value = 1.4;
    vocalDip2.gain.value = -14;

    // Formant 3: Singer's formant / vocal presence & projection (2700Hz, Q=1.5, -12dB)
    const vocalDip3 = audioCtx.createBiquadFilter();
    vocalDip3.type = 'peaking';
    vocalDip3.frequency.value = 2700;
    vocalDip3.Q.value = 1.5;
    vocalDip3.gain.value = -12;

    // Formant 4: Vocal sibilance & breathiness attenuation (6500Hz, high-shelf, -8dB)
    const vocalShelf = audioCtx.createBiquadFilter();
    vocalShelf.type = 'highshelf';
    vocalShelf.frequency.value = 6500;
    vocalShelf.gain.value = -8;

    // Side gain to restore backing track loudness
    const sideGain = audioCtx.createGain();
    sideGain.gain.value = 1.35;

    merger.connect(vocalDip1);
    vocalDip1.connect(vocalDip2);
    vocalDip2.connect(vocalDip3);
    vocalDip3.connect(vocalShelf);
    vocalShelf.connect(sideGain);
    sideGain.connect(karaokeGain);

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
  const safeFrom = Number.isFinite(from) ? Math.min(1, Math.max(0, from)) : 0;
  const safeTo = Number.isFinite(to) ? Math.min(1, Math.max(0, to)) : 1;
  const startTime = performance.now();
  const tick = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / Math.max(1, durationMs), 1);
    audio.volume = Math.min(1, Math.max(0, safeFrom + (safeTo - safeFrom) * progress));
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      audio.volume = safeTo;
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
      if (evt.seekTo !== undefined && Number.isFinite(evt.seekTo)) {
        targetAudio.currentTime = Math.max(0, evt.seekTo);
      }
      break;
    case 'set_volume':
      if (evt.volume !== undefined) {
        const safeVol = Number.isFinite(evt.volume) ? evt.volume : 1;
        const targetVol = Math.min(1, Math.max(0, safeVol * (Number.isFinite(volume) ? volume : 1)));
        rampVolume(targetAudio, targetAudio.volume, targetVol, 500);
      }
      break;
    case 'play':
      const rawPlayVol = evt.volume !== undefined ? evt.volume * volume : volume;
      const targetVol = Math.min(1, Math.max(0, Number.isFinite(rawPlayVol) ? rawPlayVol : volume));
      targetAudio.volume = targetVol;
      targetAudio.play().catch((err) => {
        if (err.name === 'NotAllowedError') {
          usePlayerStore.setState({ isAutoplayBlocked: true });
          nativeAudio.pause();
        }
      });
      break;
    case 'pause':
      rampVolume(targetAudio, targetAudio.volume, 0, 3000, () => {
        targetAudio!.pause();
      });
      break;
    case 'fade_in':
      if (evt.seekTo !== undefined && Number.isFinite(evt.seekTo)) {
        targetAudio.currentTime = Math.max(0, evt.seekTo);
      }
      targetAudio.volume = 0;
      targetAudio.play().catch((err) => {
        if (err.name === 'NotAllowedError') {
          usePlayerStore.setState({ isAutoplayBlocked: true });
          nativeAudio.pause();
        }
      });
      const rawFadeVol = evt.volume !== undefined ? evt.volume * volume : volume;
      const finalFadeVol = Math.min(1, Math.max(0, Number.isFinite(rawFadeVol) ? rawFadeVol : volume));
      rampVolume(targetAudio, 0, finalFadeVol, 3000);
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
    case 'set_tempo':
      if (evt.playbackRate !== undefined && Number.isFinite(evt.playbackRate)) {
        targetAudio.playbackRate = evt.playbackRate * (Number.isFinite(get().playbackRate) ? get().playbackRate : 1);
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

export const normalizeStreamUrl = (url?: string): string => {
  if (!url) return '';
  if (url.includes('aac.saavncdn.com')) {
    try {
      const u = new URL(url);
      return '/api/saavncdn' + u.pathname + u.search;
    } catch {
      return url;
    }
  }
  return url;
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => {
  // ─────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────

  const attemptPlay = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    const playPromise = nativeAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        if (error.name === 'NotAllowedError') {
          console.warn('Autoplay blocked. User interaction required.');
          set({ isAutoplayBlocked: true });
        } else if (error.name === 'AbortError') {
          // Play transitioned by new track or load; safe to ignore without breaking user gesture
          console.log('Play transitioned by track change.');
        } else {
          console.error('Playback error:', error);
        }
      });
    }
  };

  const syncMediaSession = (track: Track | null, isPlaying: boolean) => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    if (!track) {
      navigator.mediaSession.playbackState = 'none';
      return;
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: 'Musify',
        artwork: track.thumbnail ? [
          { src: track.thumbnail, sizes: '96x96', type: 'image/jpeg' },
          { src: track.thumbnail, sizes: '128x128', type: 'image/jpeg' },
          { src: track.thumbnail, sizes: '192x192', type: 'image/jpeg' },
          { src: track.thumbnail, sizes: '256x256', type: 'image/jpeg' },
          { src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' },
        ] : []
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (e) {
      console.warn('MediaSession sync error:', e);
    }
  };

  if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        get().togglePlay();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        get().togglePlay();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        get().nextTrack();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        get().prevTrack();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && Number.isFinite(details.seekTime)) {
          get().seek(details.seekTime);
        }
      });
    } catch (e) {
      console.warn('MediaSession handlers init error:', e);
    }
  }

  // ─────────────────────────────────────────────
  // Native audio event listeners
  // ─────────────────────────────────────────────

  nativeAudio.addEventListener('timeupdate', () => {
    const state = get();
    const t = nativeAudio.currentTime;
    set({ currentTime: t });

    // Update mediaSession position state if supported
    if (typeof window !== 'undefined' && 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      if (Number.isFinite(nativeAudio.duration) && nativeAudio.duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: nativeAudio.duration,
            playbackRate: nativeAudio.playbackRate || 1,
            position: Math.min(t, nativeAudio.duration)
          });
        } catch (_) {}
      }
    }

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
    console.warn('Track playback error encountered.');
    const state = get();
    const track = state.currentTrack;

    if (track && track.source === 'saavn' && !track.isOffline && track.id.startsWith('saavn-')) {
      if (!(nativeAudio as any)._isRecovering) {
        (nativeAudio as any)._isRecovering = true;
        fetchFreshSaavnUrl(track.id).then(freshUrl => {
          if (freshUrl) {
            const safeFresh = normalizeStreamUrl(freshUrl);
            nativeAudio.crossOrigin = "anonymous";
            nativeAudio.src = safeFresh;
            attemptPlay();
          } else {
            set({ isPlaying: false, isBuffering: false });
          }
          (nativeAudio as any)._isRecovering = false;
        }).catch(() => {
          set({ isPlaying: false, isBuffering: false });
          (nativeAudio as any)._isRecovering = false;
        });
        return;
      }
    }
    
    (nativeAudio as any)._isRecovering = false;
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
    syncMediaSession(get().currentTrack, true);
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
    syncMediaSession(get().currentTrack, false);
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
       initAudioContext(newMode);
       if (audioCtx) {
         if (audioCtx.state === 'suspended') {
           audioCtx.resume().catch(e => console.warn('AudioContext resume failed:', e));
         }
         const t = audioCtx.currentTime;
         if (normalGain) {
           normalGain.gain.cancelScheduledValues(t);
           normalGain.gain.setValueAtTime(normalGain.gain.value, t);
           normalGain.gain.linearRampToValueAtTime(newMode ? 0 : 1, t + 0.05);
         }
         if (karaokeGain) {
           karaokeGain.gain.cancelScheduledValues(t);
           karaokeGain.gain.setValueAtTime(karaokeGain.gain.value, t);
           karaokeGain.gain.linearRampToValueAtTime(newMode ? 1 : 0, t + 0.05);
         }
       }
    },

    discoverWeekly: null,
    setDiscoverWeekly: (tracks: Track[], generatedAt: number, vibeTitle?: string, vibeDescription?: string, vibeColor?: string) => 
      set({ discoverWeekly: { tracks, generatedAt, vibeTitle, vibeDescription, vibeColor } }),

    resolveAutoplayBlock: () => {
       const { isAutoplayBlocked } = get();
       if (isAutoplayBlocked) {
         set({ isAutoplayBlocked: false });
         
         // Bless auxiliary audio elements for Mashups
         auxContexts.forEach(a => {
           a.audio.play().catch(e => console.warn('Aux bless failed', e));
         });

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

    playTrack: (track: Track) => {
      set({ currentTrack: track, currentTime: 0, duration: track.duration || 0, isAutoplayBlocked: false, isBuffering: false, isCrossfading: false });

      // Reset recovering state for the new track
      (nativeAudio as any)._isRecovering = false;

      // Abort any in-progress crossfade
      crossfadeAudio.pause();
      crossfadeAudio.src = '';
      
      // Clear previous auxiliary audios
      auxContexts.forEach(a => { a.audio.pause(); a.audio.src = ''; });
      auxContexts = [];
      processedEvents.clear();
      currentArrangement = track.arrangement || [];
      
      const mode = get().isKaraokeMode;
      initAudioContext(mode);
      if (normalGain && karaokeGain && audioCtx) {
         const t = audioCtx.currentTime;
         normalGain.gain.cancelScheduledValues(t);
         karaokeGain.gain.cancelScheduledValues(t);
         normalGain.gain.setValueAtTime(mode ? 0 : 1, t);
         karaokeGain.gain.setValueAtTime(mode ? 1 : 0, t);
      }
      
      // Setup new auxiliary audios for mashups
      if (track.mashupStreamUrls && track.mashupStreamUrls.length > 0) {
        track.mashupStreamUrls.forEach(item => {
           const aux = new Audio(item.url);
           aux.crossOrigin = "anonymous";
           aux.volume = get().volume;
           aux.playbackRate = get().playbackRate;
           
           if ('preservesPitch' in aux) {
             (aux as any).preservesPitch = true;
           } else if ('webkitPreservesPitch' in aux) {
             (aux as any).webkitPreservesPitch = true;
           } else if ('mozPreservesPitch' in aux) {
             (aux as any).mozPreservesPitch = true;
           }
           
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
           // Let the nativeAudio play event or the DJ engine trigger play
        });
      }

      let finalStreamUrl = normalizeStreamUrl(track.streamUrl);

      nativeAudio.volume = get().volume;
      nativeAudio.playbackRate = get().playbackRate;
      if (!nativeAudio.crossOrigin) {
        nativeAudio.crossOrigin = "anonymous";
      }

      if (finalStreamUrl) {
        const isDifferent = !nativeAudio.src || !nativeAudio.src.endsWith(finalStreamUrl);
        if (isDifferent) {
          nativeAudio.src = finalStreamUrl;
        }
        attemptPlay();
      }

      // If it is a Saavn track and not offline, verify/refresh URL in background
      if (track.source === 'saavn' && !track.isOffline && track.id.startsWith('saavn-')) {
        fetchFreshSaavnUrl(track.id).then(freshUrl => {
          const safeFresh = normalizeStreamUrl(freshUrl);
          if (safeFresh && safeFresh !== finalStreamUrl) {
            set(state => ({
              currentTrack: state.currentTrack?.id === track.id ? { ...state.currentTrack, streamUrl: safeFresh } : state.currentTrack,
              queue: state.queue.map(q => q.id === track.id ? { ...q, streamUrl: safeFresh } : q),
              likedTrackDetails: (state.likedTrackDetails || []).map(q => q.id === track.id ? { ...q, streamUrl: safeFresh } : q),
              savedPlaylists: state.savedPlaylists.map(p => ({
                ...p,
                tracks: p.tracks.map(q => q.id === track.id ? { ...q, streamUrl: safeFresh } : q)
              }))
            }));
            // Only swap immediately if initial URL was completely missing or failed
            if (!finalStreamUrl || nativeAudio.error) {
              nativeAudio.src = safeFresh;
              attemptPlay();
            }
          }
        }).catch(() => {});
      }

      // Pre-fetch fresh URL for the NEXT track in queue!
      // Guarantees that tapping "Next" on mobile has a fresh, valid URL ready instantly
      const q = get().queue;
      const curIdx = q.findIndex(t => t.id === track.id);
      if (curIdx >= 0 && curIdx < q.length - 1) {
        const nextItem = q[curIdx + 1];
        if (nextItem.source === 'saavn' && !nextItem.isOffline && nextItem.id.startsWith('saavn-')) {
          fetchFreshSaavnUrl(nextItem.id).then(nextFreshUrl => {
            const safeNext = normalizeStreamUrl(nextFreshUrl);
            if (safeNext && safeNext !== nextItem.streamUrl) {
              set(state => ({
                queue: state.queue.map(item => item.id === nextItem.id ? { ...item, streamUrl: safeNext } : item),
                likedTrackDetails: (state.likedTrackDetails || []).map(item => item.id === nextItem.id ? { ...item, streamUrl: safeNext } : item),
                savedPlaylists: state.savedPlaylists.map(p => ({
                  ...p,
                  tracks: p.tracks.map(item => item.id === nextItem.id ? { ...item, streamUrl: safeNext } : item)
                }))
              }));
            }
          }).catch(() => {});
        }
      }
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
        auxContexts.forEach(a => a.audio.pause());
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
      const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
      nativeAudio.currentTime = safeSeconds;
      set({ currentTime: safeSeconds });

      if (currentArrangement && currentArrangement.length > 0) {
        processedEvents.clear();
        
        const tracksState: Record<string, { volume: number, seekTo?: number, seekTime?: number }> = {};
        
        currentArrangement.forEach((evt, idx) => {
           if (evt.timestamp <= safeSeconds) {
               if (!tracksState[evt.trackId]) tracksState[evt.trackId] = { volume: 0 };
               
               if (evt.type === 'seek' && evt.seekTo !== undefined) {
                   tracksState[evt.trackId].seekTo = evt.seekTo;
                   tracksState[evt.trackId].seekTime = evt.timestamp;
               }
               if (evt.type === 'fade_in' || evt.type === 'set_volume' || evt.type === 'play') {
                   tracksState[evt.trackId].volume = evt.volume ?? 1;
               }
               if (evt.type === 'fade_out' || evt.type === 'pause') {
                   tracksState[evt.trackId].volume = 0;
               }
               const eventId = `${idx}-${evt.timestamp}-${evt.type}-${evt.trackId}`;
               processedEvents.add(eventId);
           }
        });

        auxContexts.forEach(aux => {
            const state = tracksState[aux.trackId];
            if (state) {
               if (state.seekTo !== undefined && state.seekTime !== undefined) {
                   const elapsed = safeSeconds - state.seekTime;
                   aux.audio.currentTime = Math.max(0, state.seekTo + elapsed);
               } else {
                   aux.audio.currentTime = safeSeconds;
               }
               
               const rawVol = state.volume * get().volume;
               const finalVol = Math.min(1, Math.max(0, Number.isFinite(rawVol) ? rawVol : get().volume));
               rampVolume(aux.audio, aux.audio.volume, finalVol, 150);
               
               if (get().isPlaying && aux.audio.paused && finalVol > 0) {
                   aux.audio.play().catch(e => console.warn('seek play err', e));
               }
            } else {
               rampVolume(aux.audio, aux.audio.volume, 0, 150);
               aux.audio.currentTime = safeSeconds;
            }
        });
      }
    },

    nextTrack: () => {
      const { queue, currentTrack, playTrack } = get();
      if (!queue || queue.length === 0) return;
      if (!currentTrack) {
        playTrack(queue[0]);
        return;
      }
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      if (currentIndex >= 0 && currentIndex < queue.length - 1) {
        playTrack(queue[currentIndex + 1]);
      } else {
        // Wrap around to beginning of playlist/queue
        playTrack(queue[0]);
      }
    },

    prevTrack: () => {
      const { queue, currentTrack, playTrack, currentTime } = get();
      if (!queue || queue.length === 0) return;
      if (!currentTrack) {
        playTrack(queue[0]);
        return;
      }
      if (currentTime > 3) {
        nativeAudio.currentTime = 0;
        return;
      }
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      if (currentIndex > 0) {
        playTrack(queue[currentIndex - 1]);
      } else {
        playTrack(queue[queue.length - 1]);
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
  onRehydrateStorage: () => (hydratedState) => {
    if (!hydratedState) return;
    if (hydratedState.savedPlaylists) {
      hydratedState.savedPlaylists = hydratedState.savedPlaylists.map(p => ({
        ...p,
        tracks: (p.tracks || []).map(t => ({
          ...t,
          streamUrl: normalizeStreamUrl(t.streamUrl)
        }))
      }));
    }
    if (hydratedState.likedTrackDetails) {
      hydratedState.likedTrackDetails = hydratedState.likedTrackDetails.map(t => ({
        ...t,
        streamUrl: normalizeStreamUrl(t.streamUrl)
      }));
    }
  }
}));
