import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Volume2,
  VolumeX,
  Mic2,
  ListMusic,
  Laptop2,
  Sliders,
  Maximize2,
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

export const FloatingGlassPlayer: React.FC = () => {
  // Use Player Store for real state
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const currentTime = usePlayerStore(state => state.currentTime);
  const duration = usePlayerStore(state => state.duration);
  const volume = usePlayerStore(state => state.volume);
  
  const togglePlay = usePlayerStore(state => state.togglePlay);
  const nextTrack = usePlayerStore(state => state.nextTrack);
  const prevTrack = usePlayerStore(state => state.prevTrack);
  const seek = usePlayerStore(state => state.seek);
  const setVolume = usePlayerStore(state => state.setVolume);
  
  const isLyricsOpen = usePlayerStore(state => state.isLyricsOpen);
  const setLyricsOpen = usePlayerStore(state => state.setLyricsOpen);

  // Local state for UI only
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(true);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Feature Toggles & Modals
  const [showQueue, setShowQueue] = useState<boolean>(false);
  const [showEqualizer, setShowEqualizer] = useState<boolean>(false);
  const [showConnect, setShowConnect] = useState<boolean>(false);
  const [eqPreset] = useState<string>('Bass Boost');

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-6xl px-4 pointer-events-auto">
      {/* EQUALIZER OVERLAY POPUP */}
      <AnimatePresence>
        {showEqualizer && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-28 right-16 w-80 p-5 rounded-2xl bg-black/70 backdrop-blur-3xl border border-white/10 shadow-[0_0_30px_rgba(139,92,246,0.25)] text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-sm tracking-wide">DSP Equalizer</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                {eqPreset}
              </span>
            </div>

            {/* Simulated 5-Band Slider Graphic */}
            <div className="grid grid-cols-5 gap-3 h-28 items-end justify-items-center mb-4 pt-2">
              {[60, 85, 40, 70, 90].map((val, idx) => (
                <div key={idx} className="flex flex-col items-center h-full justify-end group">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue={val}
                    className="h-20 [writing-mode:vertical-lr] [direction:rtl] appearance-none bg-white/10 rounded-lg cursor-pointer accent-purple-400"
                  />
                  <span className="text-[10px] text-zinc-400 mt-2 font-mono">
                    {['60Hz', '250Hz', '1kHz', '4kHz', '16kHz'][idx]}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-xs text-zinc-400 border-t border-white/10 pt-3">
              <span>Loudness Normalization</span>
              <button className="w-8 h-4 bg-purple-500/80 rounded-full p-0.5 flex items-center justify-end">
                <div className="w-3 h-3 bg-white rounded-full shadow-md" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN FLOATING GLASS CONTAINER */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="relative flex items-center justify-between h-22 px-6 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden py-4"
      >
        {/* Glowing Ambient Mesh Overlay inside Player Bar */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-500/10 to-cyan-500/10 opacity-50 blur-xl pointer-events-none" />

        {/* LEFT SECTION: Track Details & Album Art */}
        <div className="flex items-center space-x-4 min-w-[240px] z-10 w-1/3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative group cursor-pointer shrink-0"
          >
            {/* Rotating Vinyl effect on Play */}
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className={`w-14 h-14 rounded-full object-cover border border-white/20 shadow-[0_0_15px_rgba(204,255,0,0.3)] transition-transform duration-700 ${
                isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''
              }`}
            />
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </motion.div>

          <div className="flex flex-col min-w-0 pr-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-sm tracking-wide truncate max-w-[160px]">
                {currentTrack.title}
              </span>
            </div>
            <span className="text-xs text-zinc-400 truncate max-w-[160px] hover:underline cursor-pointer">
              {currentTrack.artist}
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={() => setIsLiked(!isLiked)}
            className="text-zinc-400 hover:text-pink-500 transition-colors ml-2 shrink-0"
          >
            <Heart
              className={`w-5 h-5 ${
                isLiked ? 'text-pink-500 fill-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' : ''
              }`}
            />
          </motion.button>
        </div>

        {/* CENTER SECTION: Playback Controls & Interactive Seekbar */}
        <div className="flex flex-col items-center max-w-md w-full mx-4 z-10 w-1/3">
          {/* Controls */}
          <div className="flex items-center space-x-6 mb-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsShuffle(!isShuffle)}
              className={`relative transition-colors ${
                isShuffle ? 'text-lime-400' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
              {isShuffle && (
                <motion.div
                  layoutId="activeDot"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-lime-400 rounded-full shadow-[0_0_6px_#a3e635]"
                />
              )}
            </motion.button>

            <motion.button
              onClick={prevTrack}
              whileTap={{ scale: 0.85 }}
              className="text-zinc-300 hover:text-white transition-colors"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-lime-400 flex items-center justify-center text-black shadow-[0_0_20px_rgba(163,230,53,0.4)] transition-all shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black translate-x-0.5" />
              )}
            </motion.button>

            <motion.button
              onClick={nextTrack}
              whileTap={{ scale: 0.85 }}
              className="text-zinc-300 hover:text-white transition-colors"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsRepeat(!isRepeat)}
              className={`relative transition-colors ${
                isRepeat ? 'text-lime-400' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Repeat className="w-4 h-4" />
              {isRepeat && (
                <motion.div
                  layoutId="activeDot2"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-lime-400 rounded-full shadow-[0_0_6px_#a3e635]"
                />
              )}
            </motion.button>
          </div>

          {/* Seekbar Track */}
          <div className="flex items-center space-x-3 w-full">
            <span className="text-[11px] font-mono text-zinc-400 w-8 text-right">
              {formatTime(currentTime)}
            </span>
            <div className="relative flex-1 group cursor-pointer h-3 flex items-center">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-1 opacity-0 z-10 cursor-pointer"
              />
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-lime-400 rounded-full relative"
                  style={{
                    width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  }}
                />
              </div>
              {/* Glowing Slider Thumb on Hover */}
              <div
                className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_#ffffff] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -translate-x-1/2"
                style={{
                  left: `${duration ? (currentTime / duration) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-[11px] font-mono text-zinc-400 w-8">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* RIGHT SECTION: Advanced Features & Volume Slider */}
        <div className="flex items-center space-x-4 min-w-[240px] justify-end z-10 w-1/3">
          {/* Karaoke Lyrics Toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setLyricsOpen(!isLyricsOpen)}
            className={`p-2 rounded-xl transition-all ${
              isLyricsOpen
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mic2 className="w-4 h-4" />
          </motion.button>

          {/* Queue Toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowQueue(!showQueue)}
            className={`p-2 rounded-xl transition-all ${
              showQueue
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-4 h-4" />
          </motion.button>

          {/* Spotify Connect Toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowConnect(!showConnect)}
            className={`p-2 rounded-xl transition-all ${
              showConnect
                ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Laptop2 className="w-4 h-4" />
          </motion.button>

          {/* Equalizer Popover Trigger */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowEqualizer(!showEqualizer)}
            className={`p-2 rounded-xl transition-all ${
              showEqualizer
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </motion.button>

          {/* Volume Control */}
          <div className="flex items-center space-x-2 group">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-zinc-400 hover:text-white transition-colors shrink-0"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <div className="relative w-20 h-3 flex items-center cursor-pointer">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setIsMuted(false);
                }}
                className="absolute inset-0 w-full h-1 opacity-0 z-10 cursor-pointer"
              />
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-300 group-hover:bg-lime-400 transition-colors rounded-full"
                  style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
