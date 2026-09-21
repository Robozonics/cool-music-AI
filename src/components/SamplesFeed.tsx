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
      audio.play().catch(() => setIsLoading(false));
    } else {
      audio.pause();
    }
  }, [isActive, track]);

  // Mute control
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  const handleAddToQueue = () => {
    onAddToQueue(track);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="relative w-full h-full flex items-end overflow-hidden rounded-3xl border border-white/8 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
      {/* Background art */}
      <div className="absolute inset-0">
        <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        {/* Animated music bars when playing */}
        {isPlaying && (
          <div className="absolute top-4 right-4 flex items-end gap-0.5">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-white/80 rounded-full"
                animate={{ height: ['8px', `${12 + i * 4}px`, '8px'] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Loading spinner overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/40"
          >
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right action rail */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5 z-20">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => onLike(track)}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${isLiked ? 'bg-pink-500/20 border-pink-500/50' : 'bg-white/10 border-white/20'}`}>
            <Heart className={`w-5 h-5 ${isLiked ? 'text-pink-400 fill-pink-400' : 'text-white'}`} />
          </div>
          <span className="text-white/60 text-[9px] font-bold">Like</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleAddToQueue}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${added ? 'bg-lime-400/20 border-lime-400/50' : 'bg-white/10 border-white/20'}`}>
            {added ? <Music className="w-5 h-5 text-lime-400" /> : <Plus className="w-5 h-5 text-white" />}
          </div>
          <span className="text-white/60 text-[9px] font-bold">{added ? 'Added!' : 'Queue'}</span>
        </motion.button>
      </div>

      {/* Bottom track info + progress */}
      <div className="relative z-10 w-full px-5 pb-5">
        {/* Progress bar */}
        <div className="w-full bg-white/20 rounded-full h-0.5 mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-end justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-full">
                {Math.floor(PREVIEW_DURATION)}s hook
              </span>
            </div>
            <h3 className="text-white font-black text-lg leading-tight truncate">{track.title}</h3>
            <p className="text-white/60 text-sm font-medium truncate mt-0.5">{track.artist}</p>
          </div>

          {/* Mini play/pause */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              const audio = audioRef.current;
              if (!audio) return;
              if (isPlaying) audio.pause();
              else audio.play().catch(console.error);
            }}
            className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 text-white fill-white" />
            ) : (
              <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
            )}
          </motion.button>
        </div>
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
        // Filter out YouTube-only tracks (no streamUrl for direct play)
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

  // IntersectionObserver: tracks which card is centered in the viewport
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
      { threshold: 0.7 }
    );

    cardRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [tracks]);

  // Pause samples when main player is playing
  useEffect(() => {
    if (mainPlayerIsPlaying) setActiveIndex(-1);
  }, [mainPlayerIsPlaying]);

  const handleAddToQueue = useCallback((track: Track) => {
    addToQueue([...queue, track]);
  }, [queue, addToQueue]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
        >
          <Music className="w-10 h-10 text-purple-400" />
        </motion.div>
        <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest animate-pulse">
          Loading samples…
        </p>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8">
        <Music className="w-12 h-12 text-zinc-600" />
        <p className="text-zinc-400 font-bold">No samples available right now.</p>
        <p className="text-zinc-600 text-sm">Check back later or try searching for songs.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      {/* Mute toggle */}
      <div className="absolute top-4 right-4 z-30">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMuted(!isMuted)}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-white" />}
        </motion.button>
      </div>

      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <h2 className="text-white font-black text-xl tracking-tight">
          Samples <span className="text-purple-400">✦</span>
        </h2>
        <p className="text-zinc-500 text-xs">Swipe to discover · {PREVIEW_DURATION}s hooks</p>
      </div>

      {/* Scroll container */}
      <div
        className="flex-1 overflow-y-auto snap-y snap-mandatory hide-scrollbar px-4 pb-4 space-y-4"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {tracks.map((track, i) => (
          <motion.div
            key={track.id}
            ref={el => { cardRefs.current[i] = el; }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.05, 0.3) }}
            className="h-[70vh] min-h-[400px] w-full shrink-0 snap-center"
            style={{ scrollSnapAlign: 'center' }}
          >
            <SampleCard
              track={track}
              isActive={i === activeIndex && !mainPlayerIsPlaying}
              isMuted={isMuted}
              onAddToQueue={handleAddToQueue}
              onLike={toggleLikeTrack}
              isLiked={likedTracks.includes(track.id)}
            />
          </motion.div>
        ))}

        {/* End card */}
        <div className="h-[70vh] min-h-[400px] flex flex-col items-center justify-center snap-center">
          <div className="text-5xl mb-3">🎵</div>
          <p className="text-zinc-400 font-bold text-center">You've heard them all!</p>
          <button
            className="mt-4 px-6 py-2.5 rounded-full bg-purple-600 text-white font-bold text-sm"
            onClick={() => window.location.reload()}
          >
            Load more samples
          </button>
        </div>
      </div>

      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
};
