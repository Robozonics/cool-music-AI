import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Mic2, Download, Plus } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

export const DesktopPlayer: React.FC = () => {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const currentTime = usePlayerStore(state => state.currentTime);
  const duration = usePlayerStore(state => state.duration);
  const volume = usePlayerStore(state => state.volume);
  const playbackRate = usePlayerStore(state => state.playbackRate);
  
  const togglePlay = usePlayerStore(state => state.togglePlay);
  const nextTrack = usePlayerStore(state => state.nextTrack);
  const prevTrack = usePlayerStore(state => state.prevTrack);
  const seek = usePlayerStore(state => state.seek);
  const setVolume = usePlayerStore(state => state.setVolume);
  const setSpeedWheelOpen = usePlayerStore(state => state.setSpeedWheelOpen);
  
  const isLyricsOpen = usePlayerStore(state => state.isLyricsOpen);
  const setLyricsOpen = usePlayerStore(state => state.setLyricsOpen);

  if (!currentTrack) return null;

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="hidden md:flex fixed bottom-0 left-0 right-0 h-20 lg:h-24 bg-[#0a0a0c] border-t border-white/5 z-40 px-3 lg:px-6 items-center justify-between">
      {/* Left: Track Info */}
      <div className="flex items-center w-[30%] lg:w-1/3 min-w-0">
        <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-12 h-12 lg:w-14 lg:h-14 rounded-lg object-cover mr-3 lg:mr-4 shrink-0" />
        <div className="min-w-0 pr-2 lg:pr-4 flex-1">
          <h4 className="text-white font-bold truncate hover:underline cursor-pointer text-sm lg:text-base">{currentTrack.title}</h4>
          <p className="text-gray-400 text-xs lg:text-sm truncate">{currentTrack.artist}</p>
        </div>
        <button
          onClick={() => usePlayerStore.getState().openAddToPlaylistModal(currentTrack)}
          className="p-1 lg:p-2 text-gray-400 hover:text-acid-lime transition shrink-0"
          title="Add to Playlist"
        >
          <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>
        {currentTrack.source === 'saavn' && !currentTrack.isOffline && (
          <button 
            onClick={async () => {
              const success = await (await import('../services/downloadService')).downloadTrack(currentTrack);
              if (success) {
                usePlayerStore.setState({ currentTrack: { ...currentTrack, isOffline: true } });
              }
            }}
            className="p-1 lg:p-2 text-gray-400 hover:text-cyber-cyan transition shrink-0"
            title="Download Offline"
          >
            <Download className="w-4 h-4 lg:w-5 lg:h-5" />
          </button>
        )}
      </div>

      {/* Center: Controls & Scrubber */}
      <div className="flex flex-col items-center w-[40%] lg:w-1/3 max-w-[600px] px-2 lg:px-4">
        <div className="flex items-center space-x-4 lg:space-x-6 mb-1 lg:mb-2">
          <button onClick={prevTrack} className="text-gray-400 hover:text-white transition">
            <SkipBack className="w-4 h-4 lg:w-5 lg:h-5 fill-current" />
          </button>
          <button 
            onClick={togglePlay}
            className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-full bg-white text-obsidian hover:scale-105 transition shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4 lg:w-5 lg:h-5 fill-current" /> : <Play className="w-4 h-4 lg:w-5 lg:h-5 fill-current ml-1" />}
          </button>
          <button onClick={nextTrack} className="text-gray-400 hover:text-white transition">
            <SkipForward className="w-4 h-4 lg:w-5 lg:h-5 fill-current" />
          </button>
        </div>
        <div className="flex items-center w-full space-x-2 lg:space-x-3 text-[10px] lg:text-xs text-gray-400 font-medium">
          <span className="shrink-0">{formatTime(currentTime)}</span>
          <input 
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer accent-white hover:accent-acid-lime min-w-0"
          />
          <span className="shrink-0">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Extra Controls & Volume */}
      <div className="flex items-center justify-end w-[30%] lg:w-1/3 space-x-2 lg:space-x-4">
        <button 
          onClick={() => setLyricsOpen(!isLyricsOpen)}
          className={`hidden lg:flex items-center space-x-2 px-4 py-1.5 rounded-full font-bold uppercase tracking-widest text-xs transition-all duration-300 shrink-0 ${isLyricsOpen ? 'bg-acid-lime text-obsidian shadow-[0_0_15px_rgba(204,255,0,0.5)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          <Mic2 className="w-4 h-4" />
          <span>Lyrics</span>
        </button>
        <button 
          onClick={() => setLyricsOpen(!isLyricsOpen)}
          className={`lg:hidden flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 shrink-0 ${isLyricsOpen ? 'bg-acid-lime text-obsidian shadow-[0_0_15px_rgba(204,255,0,0.5)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          <Mic2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setSpeedWheelOpen(true)}
          className="flex items-center justify-center w-8 h-6 lg:w-10 lg:h-8 rounded-lg font-bold text-[10px] lg:text-xs bg-white/10 text-white hover:bg-white/20 transition-all duration-300 shrink-0"
        >
          {playbackRate}x
        </button>
        <div className="flex items-center space-x-2 w-16 lg:w-24 group shrink-0">
          <input 
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer accent-white group-hover:accent-acid-lime"
          />
        </div>
      </div>
    </div>
  );
};
