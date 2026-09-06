import React from 'react';
import { Play, Pause, Mic2 } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

export const MiniPlayer: React.FC = () => {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const togglePlay = usePlayerStore(state => state.togglePlay);
  const setFullPlayerOpen = usePlayerStore(state => state.setFullPlayerOpen);
  const setLyricsOpen = usePlayerStore(state => state.setLyricsOpen);
  const isLyricsOpen = usePlayerStore(state => state.isLyricsOpen);
  const playbackRate = usePlayerStore(state => state.playbackRate);
  const setSpeedWheelOpen = usePlayerStore(state => state.setSpeedWheelOpen);

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 p-4 z-40">
      <div className="glass-panel max-w-2xl mx-auto rounded-2xl flex items-center p-3 cursor-pointer" onClick={() => setFullPlayerOpen(true)}>
        <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-12 h-12 rounded-lg" />
        
        <div className="ml-3 flex-1 min-w-0">
          <h4 className="text-white font-bold truncate text-sm">{currentTrack.title}</h4>
          <p className="text-gray-400 text-xs truncate">{currentTrack.artist}</p>
        </div>
        
        <div className="flex items-center space-x-3 ml-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setSpeedWheelOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs bg-white/10 text-white hover:bg-white/20 transition-all duration-300"
          >
            {playbackRate}x
          </button>
          <button 
            onClick={() => setLyricsOpen(!isLyricsOpen)}
            className={`p-2 rounded-full transition ${isLyricsOpen ? 'text-acid-lime bg-white/10' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
          >
            <Mic2 className="w-5 h-5" />
          </button>
          
          <button 
            onClick={togglePlay}
            className="p-3 rounded-full bg-white text-obsidian hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
