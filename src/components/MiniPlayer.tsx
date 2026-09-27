import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Laptop2, Blend } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../store/usePlayerStore';

export const MiniPlayer: React.FC = () => {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const togglePlay = usePlayerStore(state => state.togglePlay);
  const nextTrack = usePlayerStore(state => state.nextTrack);
  const prevTrack = usePlayerStore(state => state.prevTrack);
  const setFullPlayerOpen = usePlayerStore(state => state.setFullPlayerOpen);
  const setConnectModalOpen = usePlayerStore(state => state.setConnectModalOpen);
  const isCrossfadeEnabled = usePlayerStore(state => state.isCrossfadeEnabled);
  const toggleCrossfade = usePlayerStore(state => state.toggleCrossfade);

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div 
          initial={{ y: '150%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '150%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed left-4 right-4 z-40 md:hidden"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 1rem) + 4rem + 20px)' }}
        >
          <div 
            className="relative bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center p-2 cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:bg-[#111111]/80 transition-colors group" 
            onClick={() => setFullPlayerOpen(true)}
          >
            {/* Ambient Aura Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-blue-500/10 rounded-2xl pointer-events-none -z-10" />

            <div className="relative">
              <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-11 h-11 rounded-xl object-cover shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10" />
              <div className="absolute inset-0 bg-fuchsia-500/20 blur-md rounded-xl -z-10 group-hover:bg-fuchsia-400/40 transition-colors" />
            </div>
            
            <div className="ml-3 flex-1 min-w-0 pr-2">
              <h4 className="text-white font-bold truncate text-[13px] drop-shadow-md">{currentTrack.title}</h4>
              <p className="text-fuchsia-100/60 font-medium text-[11px] truncate">{currentTrack.artist}</p>
            </div>
            
            <div className="flex items-center space-x-1 pr-1 shrink-0" onClick={e => e.stopPropagation()}>
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={() => {
                  toggleCrossfade();
                  (window as any).showToast?.('info', isCrossfadeEnabled ? 'Crossfade Disabled' : 'Crossfade Enabled (3s)');
                }}
                className={`p-2 rounded-full transition-colors ${isCrossfadeEnabled ? 'text-lime-400' : 'text-zinc-400 hover:text-white'}`}
                title="Smart Mix (Crossfade)"
              >
                <Blend className="w-4 h-4" />
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.8 }}
                onClick={() => setConnectModalOpen(true)}
                className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors hidden sm:block"
              >
                <Laptop2 className="w-4 h-4" />
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.8 }}
                onClick={prevTrack}
                className="p-2 rounded-full text-white hover:bg-white/10 transition-colors"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.85 }}
                onClick={togglePlay}
                className="p-2 rounded-full text-white hover:bg-white/10 transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
              </motion.button>
              
              <motion.button 
                whileTap={{ scale: 0.8 }}
                onClick={nextTrack}
                className="p-2 rounded-full text-white hover:bg-white/10 transition-colors"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
