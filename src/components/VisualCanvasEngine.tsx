import { useRef, useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CANVAS_VIDEOS = [
  'https://assets.mixkit.co/videos/preview/mixkit-liquid-neon-gradient-loop-animation-4309-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-abstract-waves-animation-in-blue-and-purple-4286-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-ink-swirling-in-water-4318-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-particle-background-3134-large.mp4',
];

export const VisualCanvasEngine = () => {
  const isVideoMode = usePlayerStore(state => state.isVideoMode);
  const toggleVideoMode = usePlayerStore(state => state.toggleVideoMode);
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState(CANVAS_VIDEOS[0]);

  // Deterministically select a video based on track ID so it stays the same for a given track
  useEffect(() => {
    if (currentTrack) {
      const hash = currentTrack.id.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const index = Math.abs(hash) % CANVAS_VIDEOS.length;
      setVideoSrc(CANVAS_VIDEOS[index]);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (videoRef.current) {
      if (isVideoMode) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isVideoMode, videoSrc]);

  return (
    <AnimatePresence>
      {isVideoMode && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
        >
          {/* Close Button */}
          <button 
            onClick={toggleVideoMode} 
            className="absolute top-8 left-6 z-[110] p-3 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-colors backdrop-blur-md"
          >
            <ChevronDown className="w-8 h-8" />
          </button>
          
          {/* Track Info Overlay (Canvas Style) */}
          {currentTrack && (
            <div className="absolute bottom-32 left-8 z-[110] pointer-events-none">
              <h2 className="text-4xl font-black tracking-tight text-white drop-shadow-lg mb-1">{currentTrack.title}</h2>
              <p className="text-xl font-medium text-white/80 drop-shadow-md">{currentTrack.artist}</p>
            </div>
          )}
          
          {/* Subtle vignette over video */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 z-[105] pointer-events-none" />
          
          {/* The Looping Canvas */}
          <video
            ref={videoRef}
            src={videoSrc}
            className="absolute inset-0 w-full h-full object-cover opacity-90 scale-105 blur-[1px]"
            loop
            muted
            playsInline
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
