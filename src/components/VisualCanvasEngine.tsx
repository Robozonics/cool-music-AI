import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const VisualCanvasEngine = () => {
  const isVideoMode = usePlayerStore(state => state.isVideoMode);
  const toggleVideoMode = usePlayerStore(state => state.toggleVideoMode);
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);

  // 1. Load YT API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = () => setIsReady(true);
    } else {
      setIsReady(true);
    }
  }, []);

  // 2. Fetch Video ID when track changes
  useEffect(() => {
    if (!currentTrack) return;
    let isActive = true;
    const fetchVideo = async () => {
      try {
        const query = `${currentTrack.title} ${currentTrack.artist} official music video`;
        const res = await fetch(`/api/yt-search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (isActive && data.videoId) setVideoId(data.videoId);
        }
      } catch (e) {
        console.error('Failed to fetch video ID', e);
      }
    };
    fetchVideo();
    return () => { isActive = false; };
  }, [currentTrack?.id]);

  // 3. Initialize & Update Player
  useEffect(() => {
    if (!isReady || !videoId) return;
    
    if (!playerRef.current) {
      playerRef.current = new window.YT.Player('yt-visual-player', {
        videoId,
        playerVars: {
          autoplay: isPlaying ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          mute: 1,
          playsinline: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (e: any) => {
            e.target.mute();
            if (isPlaying) e.target.playVideo();
            e.target.seekTo(usePlayerStore.getState().currentTime, true);
          },
          onStateChange: (e: any) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
               // Fine-tune sync if off by more than 1 second
               const ytTime = e.target.getCurrentTime();
               const audioTime = usePlayerStore.getState().currentTime;
               if (Math.abs(ytTime - audioTime) > 1.5) {
                 e.target.seekTo(audioTime, true);
               }
            }
          }
        }
      });
    } else {
      playerRef.current.loadVideoById(videoId);
      playerRef.current.mute();
      if (isPlaying) {
        playerRef.current.playVideo();
      }
    }
  }, [isReady, videoId]);

  // 4. Sync Play/Pause & Seek
  useEffect(() => {
    if (!playerRef.current || !playerRef.current.playVideo) return;
    if (isPlaying) {
      playerRef.current.playVideo();
      // resync on play
      const ytTime = playerRef.current.getCurrentTime();
      const audioTime = usePlayerStore.getState().currentTime;
      if (Math.abs(ytTime - audioTime) > 1.0) {
        playerRef.current.seekTo(audioTime, true);
      }
    } else {
      playerRef.current.pauseVideo();
    }
  }, [isPlaying]);

  // 5. Sync Scrubber Seeks
  useEffect(() => {
    const unsub = usePlayerStore.subscribe((state) => {
      if (!playerRef.current || !playerRef.current.getCurrentTime) return;
      const ytTime = playerRef.current.getCurrentTime();
      if (Math.abs(ytTime - state.currentTime) > 2.5) {
        playerRef.current.seekTo(state.currentTime, true);
      }
    });
    return unsub;
  }, []);

  return (
    <>
      {/* 
        The YouTube iframe container must ALWAYS be mounted so it doesn't lose state/buffer.
        We scale it up significantly (130vw/vh) to push the YouTube logo (bottom right) completely off-screen.
      */}
      <div 
        className={`fixed inset-0 z-[90] bg-black overflow-hidden pointer-events-none transition-opacity duration-150 ${isVideoMode ? 'opacity-100' : 'opacity-0'}`}
      >
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            /* 16:9 Aspect Ratio cover calculation. Scaled by 1.3x to crop out YouTube logos */
            width: 'max(130vw, 231.1vh)',
            height: 'max(130vh, 73.12vw)'
          }}
        >
          <div id="yt-visual-player" className="w-full h-full pointer-events-none" />
        </div>
        {/* Cinematic Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 z-[95]" />
      </div>

      <AnimatePresence>
        {isVideoMode && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[100] pointer-events-none"
          >
            {/* Close Button (Enable pointer events just for this) */}
            <button 
              onClick={toggleVideoMode} 
              className="absolute top-8 left-6 z-[110] p-3 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-colors backdrop-blur-md pointer-events-auto"
            >
              <ChevronDown className="w-8 h-8" />
            </button>
            
            {/* Track Info — gradient name overlay */}
            {currentTrack && (
              <div className="absolute bottom-32 left-0 right-0 px-8 z-[110]">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/50 mb-1">Now Playing</p>
                <h2
                  className="text-4xl md:text-6xl font-black tracking-tight leading-none mb-2"
                  style={{
                    background: 'linear-gradient(90deg, #CCFF00 0%, #ff00ff 50%, #00ffff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 20px rgba(204,255,0,0.4))'
                  }}
                >
                  {currentTrack.title}
                </h2>
                <p className="text-lg font-medium text-white/70">{currentTrack.artist}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
