import React from 'react';
import { Play, Pause, SkipForward, SkipBack, ChevronDown, Mic2, Download, Plus, X } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

export const FullPlayer: React.FC = () => {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const currentTime = usePlayerStore(state => state.currentTime);
  const duration = usePlayerStore(state => state.duration);
  const playbackRate = usePlayerStore(state => state.playbackRate);
  
  const togglePlay = usePlayerStore(state => state.togglePlay);
  const nextTrack = usePlayerStore(state => state.nextTrack);
  const prevTrack = usePlayerStore(state => state.prevTrack);
  const seek = usePlayerStore(state => state.seek);
  const setSpeedWheelOpen = usePlayerStore(state => state.setSpeedWheelOpen);
  
  const isFullPlayerOpen = usePlayerStore(state => state.isFullPlayerOpen);
  const setFullPlayerOpen = usePlayerStore(state => state.setFullPlayerOpen);
  const isLyricsOpen = usePlayerStore(state => state.isLyricsOpen);
  const setLyricsOpen = usePlayerStore(state => state.setLyricsOpen);
  
  const isVideoMode = usePlayerStore(state => state.isVideoMode);
  const toggleVideoMode = usePlayerStore(state => state.toggleVideoMode);

  if (!currentTrack || !isFullPlayerOpen) return null;

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-40 bg-obsidian flex flex-col pt-12 pb-8 px-6 transition-transform duration-500">
      {/* Background glow based on thumbnail (simplified for now) */}
      <div className="absolute inset-0 opacity-20 blur-3xl pointer-events-none" style={{ backgroundImage: `url(${currentTrack.thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>

      <div className="flex justify-center items-center relative z-10 mb-8 h-12">
        <button 
          onClick={() => setFullPlayerOpen(false)} 
          className="p-2 rounded-full hover:bg-white/10 transition absolute left-0"
        >
          <ChevronDown className="w-8 h-8 text-white" />
        </button>
        
        <span className="text-xs font-bold tracking-widest uppercase text-gray-400">Now Playing</span>
        
        <div className="absolute right-0 flex items-center space-x-2">
          <button 
            onClick={toggleVideoMode}
            className={`px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${
              isVideoMode
                ? 'bg-acid-lime text-black shadow-[0_0_15px_rgba(163,230,53,0.4)]'
                : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'
            }`}
            title="Watch Music Video"
          >
            Video
          </button>
          <button
            onClick={() => usePlayerStore.getState().closePlayer()}
            className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-white/10 transition"
            title="Close Player"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-sm mx-auto">
        <div className="w-full aspect-square rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-8 relative group" style={{ transform: `scale(calc(1 + var(--vibe-intensity, 0) * 0.1))`, transition: 'transform 0.1s ease-out' }}>
           <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-full h-full object-cover" />
        </div>

        <div className="w-full flex flex-col mb-6">
          <div className="w-full flex justify-between items-start mb-4">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-2xl font-black text-white truncate mb-1">{currentTrack.title}</h2>
              <p className="text-gray-400 text-lg truncate">{currentTrack.artist}</p>
            </div>
          </div>
          
          <div className="w-full flex items-center justify-around gap-2 py-4 border-b border-white/5">
            <button
              onClick={() => usePlayerStore.getState().openAddToPlaylistModal(currentTrack)}
              className="p-3 rounded-full text-gray-400 hover:text-white transition-colors"
              title="Add to Playlist"
            >
              <Plus className="w-6 h-6" />
            </button>
            
            {currentTrack.source === 'saavn' && !currentTrack.isOffline && (
              <button 
                onClick={async () => {
                  const success = await (await import('../services/downloadService')).downloadTrack(currentTrack);
                  if (success) {
                    usePlayerStore.setState({ currentTrack: { ...currentTrack, isOffline: true } });
                  }
                }}
                className="p-3 rounded-full text-gray-400 hover:text-cyber-cyan transition-colors"
                title="Download Offline"
              >
                <Download className="w-6 h-6" />
              </button>
            )}
            
            <button
              onClick={() => setSpeedWheelOpen(true)}
              className="p-3 flex items-center justify-center rounded-full font-bold text-sm text-gray-400 hover:text-white transition-colors"
            >
              {playbackRate}x
            </button>
            
            <button 
              onClick={() => setLyricsOpen(!isLyricsOpen)}
              className={`p-3 rounded-full transition-colors ${isLyricsOpen ? 'text-acid-lime shadow-[0_0_15px_rgba(204,255,0,0.3)]' : 'text-gray-400 hover:text-white'}`}
              title="Lyrics"
            >
              <Mic2 className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full mb-8">
          <input 
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-white/20 cursor-pointer accent-acid-lime"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between w-full max-w-xs mb-8">
          <button onClick={prevTrack} className="p-3 text-white hover:text-acid-lime transition">
            <SkipBack className="w-8 h-8 fill-current" />
          </button>
          
          <button 
            onClick={togglePlay}
            className="w-20 h-20 flex items-center justify-center rounded-full bg-white text-obsidian hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
          </button>
          
          <button onClick={nextTrack} className="p-3 text-white hover:text-acid-lime transition">
            <SkipForward className="w-8 h-8 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
