import React, { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { fetchLyrics } from '../services/lyricsService';
import type { LyricLine } from '../types/music';

export const SyncedLyrics: React.FC<{ inline?: boolean }> = ({ inline = false }) => {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const currentTime = usePlayerStore(state => state.currentTime);
  const seek = usePlayerStore(state => state.seek);
  const isLyricsOpen = usePlayerStore(state => state.isLyricsOpen);
  const setLyricsOpen = usePlayerStore(state => state.setLyricsOpen);

  const [synced, setSynced] = useState<LyricLine[] | null>(null);
  const [plain, setPlain] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (!currentTrack || !isLyricsOpen) return;

    const loadLyrics = async () => {
      setIsLoading(true);
      setSynced(null);
      setPlain(null);
      
      const { synced, plain } = await fetchLyrics(currentTrack.title, currentTrack.artist, currentTrack.duration);
      setSynced(synced);
      setPlain(plain);
      setIsLoading(false);
    };

    loadLyrics();
  }, [currentTrack, isLyricsOpen]);

  // Find active line index
  const activeIndex = synced
    ? synced.findIndex((line, index) => {
        const nextTime = index < synced.length - 1 ? synced[index + 1].time : Infinity;
        return currentTime >= line.time && currentTime < nextTime;
      })
    : -1;

  // Auto scroll to active line
  useEffect(() => {
    if (activeIndex !== -1 && lineRefs.current[activeIndex]) {
      lineRefs.current[activeIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  // When inline, we do not check isLyricsOpen, because the parent sidebar controls visibility.
  if (!inline && !isLyricsOpen) return null;

  return (
    <div className={
      inline 
        ? "w-full h-full flex flex-col bg-transparent text-white" 
        : "fixed inset-0 z-50 bg-[#08080A]/95 backdrop-blur-2xl text-white flex flex-col items-center justify-center pt-20 pb-32"
    }>
      {!inline && (
        <button 
          onClick={() => setLyricsOpen(false)}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/10 shadow-lg z-50"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      )}

      {!inline && currentTrack && (
        <div className="absolute top-6 left-6 text-left flex items-center gap-4 z-50">
          <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-12 h-12 rounded-lg shadow-lg" />
          <div>
            <h2 className="font-bold text-lg">{currentTrack.title}</h2>
            <p className="text-sm text-gray-400">{currentTrack.artist}</p>
          </div>
        </div>
      )}

      <div 
        ref={containerRef}
        className={`w-full ${inline ? 'flex-1' : 'max-w-2xl h-full'} overflow-y-auto px-6 ${inline ? 'py-4' : 'py-20'} no-scrollbar relative`}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
             <div className="flex space-x-1 items-center justify-center">
               {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-2 h-8 bg-acid-lime rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
               ))}
             </div>
             <p className="text-acid-lime/70 animate-pulse mt-4 font-bold tracking-widest uppercase">Syncing Vibes...</p>
          </div>
        ) : synced ? (
          <div className="flex flex-col space-y-6 pb-64">
            {synced.map((line, i) => {
              const isActive = i === activeIndex;
              const isPast = i < activeIndex;

              return (
                <div 
                  key={i}
                  ref={el => { lineRefs.current[i] = el; }}
                  onClick={() => seek(line.time)}
                  className={`
                    cursor-pointer transition-all duration-500 ease-out origin-left
                    ${isActive 
                      ? 'text-3xl sm:text-4xl font-black text-acid-lime scale-105 drop-shadow-[0_0_15px_rgba(204,255,0,0.6)] py-2' 
                      : isPast 
                        ? 'text-neutral-500 hover:text-neutral-300' 
                        : 'text-neutral-500 hover:text-neutral-300'}
                  `}
                >
                  {line.text}
                </div>
              );
            })}
          </div>
        ) : plain ? (
           <div className="text-center text-gray-300 whitespace-pre-wrap leading-relaxed text-lg">
             <div className="mb-6 pill-tag-secondary inline-block">Unsynced Lyrics</div>
             <div>{plain}</div>
           </div>
        ) : (
          <div className="flex items-center justify-center h-full flex-col">
            <span className="pill-tag-secondary mb-4">Vibing without lyrics 🎧</span>
            <p className="text-gray-500 font-medium">(Instrumental / Unwritten)</p>
          </div>
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
