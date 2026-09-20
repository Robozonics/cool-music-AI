import React from 'react';
import { Play, Pause, SkipForward, SkipBack, ChevronDown, Mic2, Download, Plus, X, Repeat } from 'lucide-react';
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
  const repeatMode = usePlayerStore(state => state.repeatMode);
  const toggleRepeat = usePlayerStore(state => state.toggleRepeat);
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
    <div className="fixed inset-0 z-40 bg-obsidian flex flex-col pt-12 pb-8 px-6 transition-transform duration-500 overflow-y-auto">
      {/* Background glow based on thumbnail (simplified for now) */}
      <div className="absolute inset-0 opacity-20 blur-3xl pointer-events-none" style={{ backgroundImage: `url(${currentTrack.thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>

      <div className="flex justify-between items-center relative z-10 mb-8 h-12 w-full shrink-0">
        <button 
          onClick={() => setFullPlayerOpen(false)} 
          className="p-2 rounded-full hover:bg-white/10 transition shrink-0"
        >
          <ChevronDown className="w-8 h-8 text-white" />
        </button>
        
        <span className="text-xs font-bold tracking-widest uppercase text-gray-400 hidden sm:block absolute left-1/2 -translate-x-1/2">
          Now Playing
        </span>
        
        <div className="flex items-center space-x-2 shrink-0">
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

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-sm mx-auto min-h-[500px]">
        <div className="w-full aspect-square max-h-[40vh] md:max-h-none rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-6 relative group" style={{ transform: `scale(calc(1 + var(--vibe-intensity, 0) * 0.1))`, transition: 'transform 0.1s ease-out' }}>
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

        {/* Progress Bar (GenZ Waveform) */}
        <div className="w-full mb-6">
          <div className="relative group cursor-pointer h-8 flex items-center w-full">
            <input 
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
            />
            
            {/* The Wavy ZigZag Track */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-4 pointer-events-none genz-waveform-bg" />
            
            {/* The Filled Wavy ZigZag Track */}
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-4 pointer-events-none overflow-hidden"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            >
              <div 
                className={`absolute left-0 top-0 w-[100vw] h-full genz-waveform ${!isPlaying ? 'opacity-70' : ''}`}
                style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
              />
            </div>
            
            {/* Glowing Slider Thumb on Hover */}
            <div
              className={`absolute w-4 h-4 bg-white rounded-full shadow-[0_0_15px_#ffffff] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -translate-x-1/2 ${isPlaying ? 'animate-bounce' : ''}`}
              style={{
                left: `${duration ? (currentTime / duration) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1 font-medium">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between w-full max-w-sm px-4 mb-8">
          <button 
            onClick={toggleRepeat}
            className={`p-2 rounded-full transition relative ${repeatMode === 'one' ? 'text-acid-lime' : repeatMode === 'all' ? 'text-white' : 'text-zinc-500'}`}
            title="Repeat Mode"
          >
            <Repeat className="w-6 h-6" />
            {repeatMode === 'one' && <span className="absolute text-[10px] font-bold right-1 bottom-1">1</span>}
          </button>
          
          <button onClick={prevTrack} className="p-3 text-white hover:text-acid-lime transition">
            <SkipBack className="w-8 h-8 fill-current" />
          </button>
          
          <button 
            onClick={togglePlay}
            className="w-20 h-20 flex items-center justify-center rounded-full bg-white text-obsidian hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)] shrink-0"
          >
            {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
          </button>
          
          <button onClick={nextTrack} className="p-3 text-white hover:text-acid-lime transition">
            <SkipForward className="w-8 h-8 fill-current" />
          </button>

          {/* Placeholder for symmetry */}
          <div className="w-10" />
        </div>
      </div>
    </div>
  );
};
