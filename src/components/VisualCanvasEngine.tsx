import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore, nativeAudio } from '../store/usePlayerStore';
import { ChevronDown, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Sync tolerance: if video is more than this many seconds off, we hard-seek
const SYNC_TOLERANCE = 0.5;
const SYNC_INTERVAL_MS = 1000;

export const VisualCanvasEngine = () => {
  const isVideoMode = usePlayerStore(state => state.isVideoMode);
  const toggleVideoMode = usePlayerStore(state => state.toggleVideoMode);
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const togglePlay = usePlayerStore(state => state.togglePlay);
  const nextTrack = usePlayerStore(state => state.nextTrack);
  const prevTrack = usePlayerStore(state => state.prevTrack);
  const seek = usePlayerStore(state => state.seek);
  const currentTime = usePlayerStore(state => state.currentTime);
  const duration = usePlayerStore(state => state.duration);

  const playerRef = useRef<any>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // 1. Load YT API once
  useEffect(() => {
    if (window.YT?.Player) { setIsReady(true); return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => setIsReady(true);
  }, []);

  // 2. Fetch Video ID when track changes
  useEffect(() => {
    if (!currentTrack) return;
    setVideoId(null);
    setPlayerReady(false);
    let active = true;
    const fetchVideo = async () => {
      try {
        const query = `${currentTrack.title} ${currentTrack.artist} official music video`;
        const res = await fetch(`/api/yt-search?q=${encodeURIComponent(query)}`);
        if (res.ok && active) {
          const data = await res.json();
          if (data.videoId) setVideoId(data.videoId);
        }
      } catch (e) { console.error('Failed to fetch video ID', e); }
    };
    fetchVideo();
    return () => { active = false; };
  }, [currentTrack?.id]);

  // 3. Initialize or load video
  useEffect(() => {
    if (!isReady || !videoId) return;
    if (!playerRef.current) {
      playerRef.current = new window.YT.Player('yt-visual-player', {
        videoId,
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, showinfo: 0, iv_load_policy: 3, mute: 1, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: (e: any) => {
            e.target.mute();
            const t = nativeAudio.currentTime;
            if (t > 0) e.target.seekTo(t, true);
            if (nativeAudio.paused) e.target.pauseVideo(); else e.target.playVideo();
            setPlayerReady(true);
          },
        },
      });
    } else {
      setPlayerReady(false);
      playerRef.current.loadVideoById({ videoId, startSeconds: nativeAudio.currentTime });
      playerRef.current.mute();
      setTimeout(() => {
        if (!playerRef.current) return;
        if (!nativeAudio.paused) playerRef.current.playVideo(); else playerRef.current.pauseVideo();
        setPlayerReady(true);
      }, 800);
    }
  }, [isReady, videoId]);

  // 4. Tight sync loop — poll every second for drift
  useEffect(() => {
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(() => {
      if (!playerRef.current?.getCurrentTime || !playerReady) return;
      const audioTime = nativeAudio.currentTime;
      const ytTime = playerRef.current.getCurrentTime();
      if (Math.abs(ytTime - audioTime) > SYNC_TOLERANCE) {
        playerRef.current.seekTo(audioTime, true);
      }
    }, SYNC_INTERVAL_MS);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [playerReady]);

  // 5. Sync play/pause
  useEffect(() => {
    if (!playerRef.current?.playVideo || !playerReady) return;
    if (isPlaying) {
      playerRef.current.seekTo(nativeAudio.currentTime, true);
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
  }, [isPlaying, playerReady]);

  // 6. Snap to position when video mode opens
  useEffect(() => {
    if (!isVideoMode || !playerRef.current?.seekTo || !playerReady) return;
    playerRef.current.seekTo(nativeAudio.currentTime, true);
    if (!nativeAudio.paused) playerRef.current.playVideo();
    resetControlsTimer();
  }, [isVideoMode, playerReady]);

  const formatTime = (t: number) => {
    if (!t || isNaN(t)) return '0:00';
    return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <div
        className={`fixed inset-0 z-[90] bg-black overflow-hidden transition-opacity duration-200 ${isVideoMode ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ visibility: isVideoMode ? 'visible' : 'hidden' }}
        onMouseMove={resetControlsTimer}
        onTouchStart={resetControlsTimer}
        onClick={resetControlsTimer}
      >
        {/* Oversized YT iframe to hide logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 'max(130vw, 231.1vh)', height: 'max(130vh, 73.12vw)' }}>
          <div id="yt-visual-player" className="w-full h-full pointer-events-none" />
        </div>

        {/* Cinematic vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/40 z-[95] pointer-events-none" />

        {/* Loading spinner */}
        {!playerReady && videoId && (
          <div className="absolute inset-0 flex items-center justify-center z-[96] pointer-events-none">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Auto-hiding controls overlay */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-[100] flex flex-col justify-between p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between">
                <button onClick={toggleVideoMode} className="p-3 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/70 transition-colors backdrop-blur-md">
                  <ChevronDown className="w-7 h-7" />
                </button>
                {currentTrack && (
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/60">Now Playing</p>
                    <p className="text-sm font-bold text-white truncate max-w-[200px]">{currentTrack.title}</p>
                  </div>
                )}
                <div className="w-12" />
              </div>

              {/* Bottom: track info + scrubber + controls */}
              <div className="space-y-4">
                {currentTrack && (
                  <div>
                    <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white drop-shadow-lg leading-tight">{currentTrack.title}</h2>
                    <p className="text-base font-medium text-white/70">{currentTrack.artist}</p>
                  </div>
                )}

                {/* Scrubber */}
                <div className="space-y-1">
                  <div
                    className="relative h-1.5 bg-white/25 rounded-full cursor-pointer group"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      seek((e.clientX - rect.left) / rect.width * duration);
                    }}
                  >
                    <div className="absolute left-0 top-0 h-full bg-white rounded-full" style={{ width: `${progressPct}%` }} />
                    <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full -translate-x-1/2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${progressPct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-white/50 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-8">
                  <button onClick={prevTrack} className="p-2 text-white/70 hover:text-white transition">
                    <SkipBack className="w-8 h-8 fill-current" />
                  </button>
                  <button onClick={togglePlay} className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                    {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                  </button>
                  <button onClick={nextTrack} className="p-2 text-white/70 hover:text-white transition">
                    <SkipForward className="w-8 h-8 fill-current" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
