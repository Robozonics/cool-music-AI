import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Plus, Heart, Volume2, VolumeX, Loader2, Music } from 'lucide-react';
import { searchUnblocked } from '../services/unblockedMusicService';
import { usePlayerStore } from '../store/usePlayerStore';
import type { Track } from '../types/music';

const SAMPLES_QUERIES = [
  'trending viral hits 2024',
  'hyperpop viral tiktok',
  'indie pop hooks',
  'r&b soul hooks 2024',
  'hip hop trap viral',
];

interface SampleCardProps {
  track: Track;
  isActive: boolean;
  isMuted: boolean;
  onAddToQueue: (track: Track) => void;
  onLike: (track: Track) => void;
  isLiked: boolean;
}

const PREVIEW_DURATION = 20; // seconds

const SampleCard: React.FC<SampleCardProps> = ({ track, isActive, isMuted, onAddToQueue, onLike, isLiked }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [showPlayIndicator, setShowPlayIndicator] = useState(false);
  const [showPauseIndicator, setShowPauseIndicator] = useState(false);

  // Create isolated audio instance
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'none';
    audioRef.current = audio;

    audio.addEventListener('playing', () => { setIsPlaying(true); setIsLoading(false); });
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('waiting', () => setIsLoading(true));
    audio.addEventListener('canplay', () => setIsLoading(false));
    audio.addEventListener('timeupdate', () => {
      const t = audio.currentTime;
      setProgress((t / PREVIEW_DURATION) * 100);
      // Stop after preview window
      if (t >= PREVIEW_DURATION) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    audio.addEventListener('ended', () => setProgress(0));

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Respond to isActive — IntersectionObserver drives this
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isActive && track.source !== 'invidious') {
      // Seek to ~20% into the track to catch the hook
      if (!audio.src || audio.src !== track.streamUrl) {
        audio.src = track.streamUrl;
        audio.currentTime = Math.floor((track.duration || 180) * 0.20);
      }
      setIsLoading(true);
      audio.play().catch(() => {
        setIsLoading(false);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isActive, track]);

  // Mute control
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToQueue(track);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike(track);
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
      setShowPauseIndicator(true);
      setTimeout(() => setShowPauseIndicator(false), 800);
    } else {
      audio.play().catch(console.error);
      setShowPlayIndicator(true);
      setTimeout(() => setShowPlayIndicator(false), 800);
    }
  };

  return (
    <div 
      className="relative w-full h-[100dvh] flex items-end overflow-hidden bg-black"
      onClick={togglePlayPause}
    >
      {/* Background art with slow pan animation */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.img 
          src={track.thumbnail} 
          alt={track.title} 
          className="w-full h-full object-cover opacity-60"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />
        {/* Strong vignette gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90" />
      </div>

      {/* Loading spinner overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 pointer-events-none"
          >
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause indicators */}
      <AnimatePresence>
        {(!isPlaying && isActive && !isLoading) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="w-20 h-20 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]">
               <Play className="w-10 h-10 text-white fill-white translate-x-1" />
            </div>
          </motion.div>
        )}
        {showPlayIndicator && isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
          >
            <div className="w-20 h-20 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center">
               <Play className="w-10 h-10 text-white fill-white translate-x-1" />
            </div>
          </motion.div>
        )}
        {showPauseIndicator && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
          >
            <div className="w-20 h-20 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center">
               <Pause className="w-10 h-10 text-white fill-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Action Rail */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-7 z-20">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleLike}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-12 h-12 flex items-center justify-center transition-all drop-shadow-lg group-hover:scale-110">
            <Heart className={`w-9 h-9 ${isLiked ? 'text-pink-500 fill-pink-500' : 'text-white drop-shadow-md'}`} />
          </div>
          <span className="text-white text-xs font-bold drop-shadow-md">{isLiked ? 'Liked' : 'Like'}</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleAddToQueue}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-12 h-12 flex items-center justify-center transition-all drop-shadow-lg group-hover:scale-110">
            {added ? (
                <div className="w-10 h-10 rounded-full bg-lime-400 flex items-center justify-center">
                   <Music className="w-5 h-5 text-black" />
                </div>
            ) : (
                <Plus className="w-9 h-9 text-white drop-shadow-md" />
            )}
          </div>
          <span className="text-white text-xs font-bold drop-shadow-md">{added ? 'Added' : 'Queue'}</span>
        </motion.button>

        {/* Spinning Vinyl */}
        <div className="relative mt-4 group cursor-pointer hover:scale-105 transition-transform">
          <motion.div 
            className="w-14 h-14 rounded-full bg-black border-[5px] border-zinc-800 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.8)]"
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <img src={track.thumbnail} className="w-6 h-6 rounded-full object-cover" alt="" />
          </motion.div>
          
          {isPlaying && (
            <>
              <motion.div
                className="absolute -top-2 -left-2 text-white/80"
                animate={{ y: [0, -20], x: [0, -10], opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0 }}
              >
                <Music className="w-3 h-3" />
              </motion.div>
              <motion.div
                className="absolute top-2 -left-4 text-white/80"
                animate={{ y: [0, -25], x: [0, -15], opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
              >
                <Music className="w-4 h-4" />
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Track Info (Bottom Left) */}
      <div className="absolute left-4 bottom-24 right-24 z-20 pointer-events-none flex flex-col items-start">
         <h3 className="text-white font-black text-2xl md:text-3xl leading-tight drop-shadow-lg line-clamp-2">{track.title}</h3>
         <p className="text-white/90 font-medium mt-2 text-base drop-shadow-md">@{track.artist}</p>
         
         <div className="mt-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <Music className="w-3 h-3 text-acid-lime" />
            <div className="overflow-hidden w-40 relative">
               <motion.div
                 className="whitespace-nowrap text-xs font-bold text-white/90 uppercase tracking-widest"
                 animate={{ x: [0, -150] }}
                 transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
               >
                 Original Audio · Viral Hook · {Math.floor(PREVIEW_DURATION)}s preview
               </motion.div>
            </div>
         </div>
      </div>

      {/* Edge-to-edge Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-30 pointer-events-none">
        <motion.div
          className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// ── Main Feed ─────────────────────────────────────────────────────────────────
export const SamplesFeed: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const mainPlayerIsPlaying = usePlayerStore(state => state.isPlaying);
  const addToQueue = usePlayerStore(state => state.setQueue);
  const likedTracks = usePlayerStore(state => state.likedTracks);
  const toggleLikeTrack = usePlayerStore(state => state.toggleLikeTrack);
  const queue = usePlayerStore(state => state.queue);

  useEffect(() => {
    const fetchSamples = async () => {
      setIsLoading(true);
      try {
        const query = SAMPLES_QUERIES[Math.floor(Math.random() * SAMPLES_QUERIES.length)];
        const results = await searchUnblocked(query);
        const playable = results.filter(t => t.source === 'saavn' && t.streamUrl);
        setTracks(playable.slice(0, 15));
      } catch {
        setTracks([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSamples();
  }, []);

  useEffect(() => {
    if (tracks.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = cardRefs.current.findIndex(el => el === entry.target);
            if (idx !== -1) setActiveIndex(idx);
          }
        });
      },
      { threshold: 0.6 } // Adjusted threshold for full screen cards
    );

    cardRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [tracks]);

  useEffect(() => {
    if (mainPlayerIsPlaying) setActiveIndex(-1);
  }, [mainPlayerIsPlaying]);

  const handleAddToQueue = useCallback((track: Track) => {
    addToQueue([...queue, track]);
  }, [queue, addToQueue]);

  if (isLoading) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
        >
          <Music className="w-10 h-10 text-white opacity-50" />
        </motion.div>
        <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest animate-pulse">
          Loading samples…
        </p>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center gap-3 text-center px-8">
        <Music className="w-12 h-12 text-zinc-600" />
        <p className="text-zinc-400 font-bold">No samples available right now.</p>
        <p className="text-zinc-600 text-sm">Check back later or try searching for songs.</p>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full bg-black">
      {/* Absolute Header (floats over content) */}
      <div className="absolute top-0 left-0 right-0 px-4 pt-10 pb-6 z-30 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start pointer-events-none">
        <div>
          <h2 className="text-white font-black text-2xl tracking-tight drop-shadow-md">
            Samples <span className="text-acid-lime">✦</span>
          </h2>
          <p className="text-white/70 font-bold text-xs uppercase tracking-widest mt-1 drop-shadow-md">Swipe to discover</p>
        </div>
        
        {/* Mute toggle (pointer-events-auto so it can be clicked) */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMuted(!isMuted)}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center pointer-events-auto"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-white" />}
        </motion.button>
      </div>

      {/* Full-screen Snap Scroll Container */}
      <div
        className="h-full w-full overflow-y-auto snap-y snap-mandatory hide-scrollbar"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {tracks.map((track, i) => (
          <div
            key={track.id}
            ref={el => { cardRefs.current[i] = el; }}
            className="h-[100dvh] w-full shrink-0 snap-start bg-black"
            style={{ scrollSnapAlign: 'start' }}
          >
            <SampleCard
              track={track}
              isActive={i === activeIndex && !mainPlayerIsPlaying}
              isMuted={isMuted}
              onAddToQueue={handleAddToQueue}
              onLike={toggleLikeTrack}
              isLiked={likedTracks.includes(track.id)}
            />
          </div>
        ))}

        {/* End card */}
        <div className="h-[100dvh] w-full bg-black flex flex-col items-center justify-center snap-start pb-20">
          <div className="text-6xl mb-4">✨</div>
          <p className="text-white font-bold text-lg text-center mb-6">You're all caught up!</p>
          <button
            className="px-8 py-3.5 rounded-full bg-white text-black font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)]"
            onClick={() => window.location.reload()}
          >
            Load fresh hooks
          </button>
        </div>
      </div>

      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
};
