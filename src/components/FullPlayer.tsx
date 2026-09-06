import React from 'react';
import { Play, Pause, SkipForward, SkipBack, ChevronDown, Mic2, Download } from 'lucide-react';
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
  const setPlaybackRate = usePlayerStore(state => state.setPlaybackRate);
  
  const isFullPlayerOpen = usePlayerStore(state => state.isFullPlayerOpen);
  const setFullPlayerOpen = usePlayerStore(state => state.setFullPlayerOpen);
  const isLyricsOpen = usePlayerStore(state => state.isLyricsOpen);
  const setLyricsOpen = usePlayerStore(state => state.setLyricsOpen);

  if (!currentTrack || !isFullPlayerOpen) return null;

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const cycleSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    setPlaybackRate(speeds[nextIdx]);
  };

  return (
    <div className="fixed inset-0 z-40 bg-obsidian flex flex-col pt-12 pb-8 px-6 transition-transform duration-500">
      {/* Background glow based on thumbnail (simplified for now) */}
      <div className="absolute inset-0 opacity-20 blur-3xl pointer-events-none" style={{ backgroundImage: `url(${currentTrack.thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>

      <div className="flex justify-between items-center relative z-10 mb-8">
        <button onClick={() => setFullPlayerOpen(false)} className="p-2 rounded-full hover:bg-white/10 transition">
          <ChevronDown className="w-8 h-8 text-white" />
        </button>
        <span className="text-xs font-bold tracking-widest uppercase text-gray-400">Now Playing</span>
        <div className="w-12"></div> {/* spacer */}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-sm mx-auto">
        <div className="w-full aspect-square rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-8 relative group">
           <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-full h-full object-cover" />
        </div>

        <div className="w-full flex justify-between items-end mb-6">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-2xl font-black text-white truncate mb-1">{currentTrack.title}</h2>
            <p className="text-gray-400 text-lg truncate">{currentTrack.artist}</p>
          </div>
          <div className="flex gap-3 shrink-0">
            {currentTrack.source === 'saavn' && !currentTrack.isOffline && (
              <button 
                onClick={async () => {
                  const success = await (await import('../services/downloadService')).downloadTrack(currentTrack);
                  if (success) currentTrack.isOffline = true;
                }}
                className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              >
                <Download className="w-6 h-6" />
              </button>
            )}
            <button
              onClick={cycleSpeed}
              className="flex items-center justify-center px-4 py-2.5 rounded-full font-bold text-sm bg-white/10 text-white hover:bg-white/20 transition-all duration-300"
            >
              {playbackRate}x
            </button>
            <button 
              onClick={() => setLyricsOpen(!isLyricsOpen)}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-full font-bold uppercase tracking-widest text-sm transition-all duration-300 ${isLyricsOpen ? 'bg-acid-lime text-obsidian shadow-[0_0_20px_rgba(204,255,0,0.6)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              <Mic2 className="w-5 h-5" />
              <span>Lyrics</span>
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
