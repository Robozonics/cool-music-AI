import React from 'react';
import { Play, Pause, SkipForward } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

export const MiniPlayer: React.FC = () => {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const togglePlay = usePlayerStore(state => state.togglePlay);
  const nextTrack = usePlayerStore(state => state.nextTrack);
  const setFullPlayerOpen = usePlayerStore(state => state.setFullPlayerOpen);

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-[84px] left-2 right-2 z-40 md:hidden">
      <div 
        className="bg-[#2a2a2a]/95 backdrop-blur-xl border border-white/5 rounded-xl flex items-center p-2 cursor-pointer shadow-2xl" 
        onClick={() => setFullPlayerOpen(true)}
      >
        <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-10 h-10 rounded-md object-cover" />
        
        <div className="ml-3 flex-1 min-w-0">
          <h4 className="text-white font-bold truncate text-sm">{currentTrack.title}</h4>
          <p className="text-gray-400 text-xs truncate">{currentTrack.artist}</p>
        </div>
        
        <div className="flex items-center space-x-1 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
          <button 
            onClick={togglePlay}
            className="p-3 rounded-full text-white hover:bg-white/10 transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          
          <button 
            onClick={nextTrack}
            className="p-3 rounded-full text-white hover:bg-white/10 transition-colors"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
