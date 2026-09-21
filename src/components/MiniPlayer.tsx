import React from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

export const MiniPlayer: React.FC = () => {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const togglePlay = usePlayerStore(state => state.togglePlay);
  const nextTrack = usePlayerStore(state => state.nextTrack);
  const prevTrack = usePlayerStore(state => state.prevTrack);
  const setFullPlayerOpen = usePlayerStore(state => state.setFullPlayerOpen);

  if (!currentTrack) return null;

  return (
      <div 
        className="fixed left-4 right-4 z-40 md:hidden transition-transform"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 1rem) + 12px)' }}
      >
      <div 
        className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-2xl flex items-center p-2 cursor-pointer shadow-[0_15px_30px_rgba(0,0,0,0.5)] hover:bg-white/10 transition-colors" 
        onClick={() => setFullPlayerOpen(true)}
      >
        <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-10 h-10 rounded-xl object-cover shadow-lg" />
        
        <div className="ml-3 flex-1 min-w-0 pr-2">
          <h4 className="text-white font-bold truncate text-sm">{currentTrack.title}</h4>
          <p className="text-gray-400 text-xs truncate">{currentTrack.artist}</p>
        </div>
        
        <div className="flex items-center space-x-1 pr-1 shrink-0" onClick={e => e.stopPropagation()}>
          <button 
            onClick={prevTrack}
            className="p-2 rounded-full text-white hover:bg-white/10 transition-colors"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          <button 
            onClick={togglePlay}
            className="p-2 rounded-full text-white hover:bg-white/10 transition-colors"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
          </button>
          
          <button 
            onClick={nextTrack}
            className="p-2 rounded-full text-white hover:bg-white/10 transition-colors"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
