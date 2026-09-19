import { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const VisualCanvasEngine = () => {
  const isVideoMode = usePlayerStore(state => state.isVideoMode);
  const toggleVideoMode = usePlayerStore(state => state.toggleVideoMode);
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const [pulse, setPulse] = useState(0);

  // Sync with the global --vibe-intensity variable for an audio-reactive effect
  useEffect(() => {
    if (!isVideoMode) return;
    let raf: number;
    const loop = () => {
      const vibe = getComputedStyle(document.documentElement).getPropertyValue('--vibe-intensity');
      setPulse(parseFloat(vibe || '0'));
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [isVideoMode]);

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
          
          {/* Track Info Overlay */}
          {currentTrack && (
            <div className="absolute bottom-32 left-8 z-[110] pointer-events-none">
              <h2 className="text-4xl font-black tracking-tight text-white drop-shadow-lg mb-1">{currentTrack.title}</h2>
              <p className="text-xl font-medium text-white/80 drop-shadow-md">{currentTrack.artist}</p>
            </div>
          )}
          
          {/* Cinematic Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 z-[105] pointer-events-none" />
          
          {/* Audio-Reactive Fluid Visualizer */}
          <div 
            className="absolute inset-0 w-full h-full opacity-80" 
            style={{
              background: `radial-gradient(circle at 50% 50%, rgba(163,230,53, ${0.2 + pulse * 0.3}), transparent 70%),
                           radial-gradient(circle at 80% 20%, rgba(255,0,128, ${0.3 + pulse * 0.2}), transparent 50%),
                           radial-gradient(circle at 20% 80%, rgba(0,255,255, ${0.2 + pulse * 0.4}), transparent 50%)`,
              backgroundColor: '#0a0a0c',
              transform: `scale(${1 + pulse * 0.05})`,
              transition: 'transform 0.1s ease-out'
            }}
          >
             {currentTrack && (
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
                  style={{ 
                    backgroundImage: `url(${currentTrack.thumbnail})`,
                    transform: `scale(${1.1 + pulse * 0.1})`,
                    transition: 'transform 0.1s ease-out',
                    filter: 'blur(20px)'
                  }} 
                />
             )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
