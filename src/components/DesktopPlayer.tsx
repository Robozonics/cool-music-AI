import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Mic2, Download, Gauge } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

export const DesktopPlayer: React.FC = () => {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const currentTime = usePlayerStore(state => state.currentTime);
  const duration = usePlayerStore(state => state.duration);
  const volume = usePlayerStore(state => state.volume);
  const playbackRate = usePlayerStore(state => state.playbackRate);
  const setPlaybackRate = usePlayerStore(state => state.setPlaybackRate);
  
  const togglePlay = usePlayerStore(state => state.togglePlay);
  const nextTrack = usePlayerStore(state => state.nextTrack);
  const prevTrack = usePlayerStore(state => state.prevTrack);
  const seek = usePlayerStore(state => state.seek);
  const setVolume = usePlayerStore(state => state.setVolume);
  
  const isLyricsOpen = usePlayerStore(state => state.isLyricsOpen);
  const setLyricsOpen = usePlayerStore(state => state.setLyricsOpen);

  const displayTrack = currentTrack ?? {
    id: 'idle',
    title: 'Pick a track to start',
    artist: 'Your next vibe is waiting',
    thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=160&q=80',
    duration: 0,
    streamUrl: '',
    source: 'saavn' as const,
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="hidden md:flex fixed bottom-0 left-0 right-0 h-24 bg-[#0a0a0c] border-t border-white/5 z-40 px-6 items-center justify-between">
      {/* Left: Track Info */}
      <div className="flex items-center w-1/3 min-w-[200px]">
        <div className="relative mr-4 shrink-0">
          <img src={displayTrack.thumbnail} alt={displayTrack.title} className="w-14 h-14 rounded-2xl object-cover ring-1 ring-white/10" />
          {isPlaying && <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-end gap-0.5 rounded-full bg-obsidian/90 px-1.5 py-1 now-playing-bars" aria-label="Music is playing">{[8, 14, 10].map((height, index) => <span key={index} className="w-1 rounded-full bg-acid-lime" style={{ height, animationDelay: `${index * 100}ms` }} />)}</div>}
        </div>
        <div className="min-w-0 pr-4">
          <h4 className="text-white font-bold truncate hover:underline cursor-pointer">{displayTrack.title}</h4>
          <p className="text-gray-400 text-sm truncate">{displayTrack.artist}</p>
        </div>
        {currentTrack?.source === 'saavn' && !currentTrack.isOffline && (
          <button 
            onClick={async () => {
              const success = await (await import('../services/downloadService')).downloadTrack(currentTrack);
              if (success) currentTrack.isOffline = true;
            }}
            className="p-2 text-gray-400 hover:text-white transition"
          >
            <Download className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Center: Controls & Scrubber */}
      <div className="flex flex-col items-center w-1/3 max-w-[600px]">
        <div className="flex items-center space-x-6 mb-2">
          <button onClick={prevTrack} className="text-gray-400 hover:text-white transition">
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          <button 
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-obsidian hover:scale-105 transition"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
          </button>
          <button onClick={nextTrack} className="text-gray-400 hover:text-white transition">
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>
        <div className="flex items-center w-full space-x-3 text-xs text-gray-400 font-medium">
          <span>{formatTime(currentTime)}</span>
          <input 
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer accent-white hover:accent-acid-lime"
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Extra Controls & Volume */}
      <div className="flex items-center justify-end w-1/3 space-x-4">
        <label className="flex items-center gap-2 rounded-full bg-acid-lime/10 px-3 py-1.5 text-acid-lime ring-1 ring-acid-lime/30" title="Scroll or drag to change playback speed">
          <Gauge className="w-4 h-4" />
          <input aria-label="Playback speed" type="range" min="0.5" max="3" step="0.05" value={playbackRate} onChange={(event) => setPlaybackRate(Number(event.target.value))} className="w-20 accent-acid-lime" />
          <span className="min-w-9 text-xs font-black">{playbackRate.toFixed(2).replace(/0$/, '')}x</span>
        </label>
        <button 
          onClick={() => setLyricsOpen(!isLyricsOpen)}
          className={`flex items-center space-x-2 px-4 py-1.5 rounded-full font-bold uppercase tracking-widest text-xs transition-all duration-300 ${isLyricsOpen ? 'bg-acid-lime text-obsidian shadow-[0_0_15px_rgba(204,255,0,0.5)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          <Mic2 className="w-4 h-4" />
          <span>Lyrics</span>
        </button>
        <div className="flex items-center space-x-2 w-24 group">
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
