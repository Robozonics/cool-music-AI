import React from 'react';
import { Play, Pause, SkipForward, SkipBack, ChevronDown, Download, Plus, X, Repeat, Share2, Video, Blend, ListMusic, Laptop2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const setRepeatMode = usePlayerStore(state => state.setRepeatMode);
  const seek = usePlayerStore(state => state.seek);
  const setSpeedWheelOpen = usePlayerStore(state => state.setSpeedWheelOpen);
  
  const isFullPlayerOpen = usePlayerStore(state => state.isFullPlayerOpen);
  const setFullPlayerOpen = usePlayerStore(state => state.setFullPlayerOpen);
  const isLyricsOpen = usePlayerStore(state => state.isLyricsOpen);
  const setLyricsOpen = usePlayerStore(state => state.setLyricsOpen);
  const setConnectModalOpen = usePlayerStore(state => state.setConnectModalOpen);
  
  const isVideoMode = usePlayerStore(state => state.isVideoMode);
  const toggleVideoMode = usePlayerStore(state => state.toggleVideoMode);
  const isCrossfadeEnabled = usePlayerStore(state => state.isCrossfadeEnabled);
  const toggleCrossfade = usePlayerStore(state => state.toggleCrossfade);
  const setShareSnippetOpen = usePlayerStore(state => state.setShareSnippetOpen);

  const toggleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  if (!currentTrack) return null;

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const videoSearchQuery = currentTrack.id.startsWith('mashup-') 
    ? currentTrack.title.replace('🎛️ ', '').replace(' × ', ' ') + ' live mashup'
    : `${currentTrack.title} ${currentTrack.artist || ''} official music video`;

  return (
    <AnimatePresence>
      {isFullPlayerOpen && (
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 250 }}
          className="fixed inset-0 z-50 bg-obsidian flex flex-col"
        >
      {/* Background blur */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 blur-[100px] scale-150 transform-gpu"
        style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}
      />
      
      {/* Header */}
      <div className="relative z-10 px-4 pt-12 sm:pt-6 pb-4 sm:px-6 sm:py-6 flex justify-between items-center">
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

      <div className="flex-1 flex flex-col items-center justify-start relative z-10 w-full max-w-sm mx-auto min-h-0 overflow-y-auto pt-8 pb-4 px-6 sm:px-0">
        {/* Dynamic Background Blur */}
        <div className="absolute inset-[-100%] -z-10 pointer-events-none opacity-40">
          <img src={currentTrack.thumbnail} className="w-full h-full object-cover blur-[100px] saturate-200" alt="" />
        </div>

        {isVideoMode ? (
          <div className="w-full aspect-square max-h-[40vh] md:max-h-none rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-6 relative bg-black flex items-center justify-center">
            <iframe
              src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(videoSearchQuery)}&autoplay=1&mute=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div 
            className={`w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-6 relative group flex-shrink-0 ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`} 
            style={{ 
              transform: `scale(calc(1 + var(--vibe-intensity, 0) * 0.1))`, 
              transition: 'transform 0.1s ease-out' 
            }}
          >
             <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-full h-full object-cover" />
             {/* Optional Vinyl hole in the center */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 sm:w-12 sm:h-12 bg-black rounded-full shadow-inner border border-zinc-800"></div>
          </div>
        )}

        <div className="w-full flex flex-col mb-6">
          <div className="w-full flex justify-between items-start mb-4">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-2xl font-black text-white truncate mb-1">{currentTrack.title}</h2>
              <p className="text-gray-400 text-lg truncate">{currentTrack.artist}</p>
            </div>
          </div>
          
          <div className="w-full flex flex-wrap items-center justify-center gap-3 sm:gap-6 py-4 border-b border-white/5">
            <button
              onClick={() => usePlayerStore.getState().openAddToPlaylistModal(currentTrack)}
              className="p-2 sm:p-3 rounded-full text-gray-400 hover:text-white transition-colors"
              title="Add to Playlist"
            >
              <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            
            {currentTrack.source === 'saavn' && !currentTrack.isOffline && (
              <button 
                onClick={async () => {
                  const success = await (await import('../services/downloadService')).downloadTrack(currentTrack);
                  if (success) {
                    usePlayerStore.setState({ currentTrack: { ...currentTrack, isOffline: true } });
                  }
                }}
                className="p-2 sm:p-3 rounded-full text-gray-400 hover:text-cyber-cyan transition-colors"
                title="Download Offline"
              >
                <Download className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
            
            <button
              onClick={() => setSpeedWheelOpen(true)}
              className="p-2 sm:p-3 flex items-center justify-center rounded-full font-bold text-xs sm:text-sm text-gray-400 hover:text-white transition-colors"
            >
              {playbackRate}x
            </button>
            
            <button 
              onClick={() => setShareSnippetOpen(true)}
              className="p-2 sm:p-3 rounded-full text-gray-400 hover:text-white transition-colors"
              title="Share Snippet"
            >
              <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              onClick={toggleVideoMode}
              className={`p-2 sm:p-3 rounded-full transition-colors ${isVideoMode ? 'text-cyber-cyan shadow-[0_0_15px_rgba(0,255,255,0.3)]' : 'text-gray-400 hover:text-white'}`}
              title="Video Mode"
            >
              <Video className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              onClick={toggleCrossfade}
              className={`p-2 sm:p-3 rounded-full transition-colors ${isCrossfadeEnabled ? 'text-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.3)]' : 'text-gray-400 hover:text-[#ff00ff]'}`}
              title={isCrossfadeEnabled ? 'Smart Mix Transitions: ON (3s)' : 'Smart Mix Transitions: OFF'}
            >
              <Blend className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button 
              onClick={() => setLyricsOpen(!isLyricsOpen)}
              className={`p-2 sm:p-3 rounded-full transition-colors ${isLyricsOpen ? 'text-acid-lime shadow-[0_0_15px_rgba(204,255,0,0.3)]' : 'text-gray-400 hover:text-white'}`}
              title="Lyrics"
            >
              <ListMusic className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button 
              onClick={() => setConnectModalOpen(true)}
              className="p-2 sm:p-3 rounded-full transition-colors text-gray-400 hover:text-white"
              title="Connect to a Device"
            >
              <Laptop2 className="w-5 h-5 sm:w-6 sm:h-6" />
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
                className={`absolute left-0 top-0 w-[600px] h-full genz-waveform ${!isPlaying ? 'opacity-70' : ''}`}
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
        <div className="flex items-center justify-between w-full max-w-sm mb-8">
          <button 
            onClick={toggleRepeat}
            className={`p-2 rounded-full transition relative ${repeatMode === 'one' ? 'text-acid-lime' : repeatMode === 'all' ? 'text-white' : 'text-zinc-500'}`}
            title="Repeat Mode"
          >
            <Repeat className="w-6 h-6" />
            {repeatMode === 'one' && <span className="absolute text-[10px] font-bold right-1 bottom-1">1</span>}
          </button>
          
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={prevTrack} 
            className="p-3 text-white hover:text-emerald-400 transition"
          >
            <SkipBack className="w-8 h-8 fill-current" />
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={togglePlay}
            className="p-5 rounded-full bg-emerald-500 text-obsidian hover:scale-105 transition shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
          </motion.button>
          
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={nextTrack} 
            className="p-3 text-white hover:text-emerald-400 transition"
          >
            <SkipForward className="w-8 h-8 fill-current" />
          </motion.button>

          <button 
            onClick={() => usePlayerStore.getState().setQueueOpen(true)}
            className="p-2 text-zinc-500 hover:text-white transition rounded-full"
            title="Up Next"
          >
            <ListMusic className="w-6 h-6" />
          </button>
        </div>
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
