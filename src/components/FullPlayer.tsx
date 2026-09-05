import React from 'react';
import { Play, Pause, SkipForward, SkipBack, ChevronDown, Mic2, Download, Gauge } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

export const FullPlayer: React.FC = () => {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const currentTime = usePlayerStore(state => state.currentTime);
  const duration = usePlayerStore(state => state.duration);
  const playbackRate = usePlayerStore(state => state.playbackRate);
  const setPlaybackRate = usePlayerStore(state => state.setPlaybackRate);
  
  const togglePlay = usePlayerStore(state => state.togglePlay);
  const nextTrack = usePlayerStore(state => state.nextTrack);
  const prevTrack = usePlayerStore(state => state.prevTrack);
  const seek = usePlayerStore(state => state.seek);
  
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
        <div className={`w-full aspect-square rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-8 relative group ring-1 ring-white/10 ${isPlaying ? 'animate-[pulse_3s_ease-in-out_infinite]' : ''}`}>
           <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-full h-full object-cover" />
           <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-1.5 pb-5 bg-gradient-to-t from-black/70 to-transparent h-1/3 now-playing-bars" aria-label={isPlaying ? 'Music is playing' : 'Music is paused'}>
             {[22, 38, 28, 48, 32, 56, 26, 44, 34].map((height, index) => <span key={index} className="w-1.5 rounded-full bg-acid-lime shadow-[0_0_12px_rgba(204,255,0,0.8)]" style={{ height: `${height}%`, animationDelay: `${index * 80}ms`, animationPlayState: isPlaying ? 'running' : 'paused' }} />)}
           </div>
        </div>

        <div className="w-full flex justify-between items-end mb-6">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-2xl font-black text-white truncate mb-1">{currentTrack.title}</h2>
            <p className="text-gray-400 text-lg truncate">{currentTrack.artist}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setPlaybackRate(playbackRate === 3 ? 1 : playbackRate + 1)} aria-label={`Playback speed ${playbackRate}x`} className="flex items-center gap-1.5 rounded-full bg-acid-lime/15 px-3 py-2 text-acid-lime ring-1 ring-acid-lime/30 transition hover:bg-acid-lime/25">
              <Gauge className="w-4 h-4" /><span className="text-xs font-black">{playbackRate}x</span>
            </button>
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
