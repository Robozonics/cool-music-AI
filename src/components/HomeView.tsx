import React, { useEffect, useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { searchUnblocked } from '../services/unblockedMusicService';
import type { Track } from '../types/music';
import { usePlayerStore } from '../store/usePlayerStore';

const MOOD_PILLS = [
  { label: '3 AM OVERTHINKING', color: 'bg-lime-400 text-black', query: 'sad lofi study beats' },
  { label: 'HYPERPOP RUSH', color: 'bg-pink-500 text-white', query: 'hyperpop gym hardstyle' },
  { label: 'DREAMY DRIFT', color: 'bg-cyan-400 text-black', query: 'dream pop shoegaze' },
  { label: 'NIGHT DRIVE', color: 'bg-purple-500 text-white', query: 'synthwave night drive' },
  { label: 'SAD GURL HOURS', color: 'bg-rose-400 text-white', query: 'sad indie pop acoustic' }
];

interface Section {
  title: string;
  query: string;
}

const SECTIONS: Section[] = [
  { title: "CURATED FOR YOU", query: "trending top hits 2026" },
  { title: "VIBE MATCH", query: "viral tiktok songs" }
];

export const HomeView: React.FC = () => {
  const [sectionsData, setSectionsData] = useState<Record<string, Track[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const playTrack = usePlayerStore(state => state.playTrack);
  const setQueue = usePlayerStore(state => state.setQueue);

  useEffect(() => {
    const fetchHomeData = async () => {
      setIsLoading(true);
      try {
        const results = await Promise.all(
          SECTIONS.map(section => searchUnblocked(section.query))
        );
        
        const newData: Record<string, Track[]> = {};
        SECTIONS.forEach((section, index) => {
          // Shuffle slightly to make it feel fresh
          newData[section.title] = results[index].sort(() => 0.5 - Math.random()).slice(0, 10);
        });
        
        setSectionsData(newData);
      } catch (error) {
        console.error("Failed to fetch home data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  const handlePlay = (track: Track, sectionTracks: Track[]) => {
    setQueue(sectionTracks);
    playTrack(track);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-full space-y-4">
        <Loader2 className="w-10 h-10 animate-spin-slow text-acid-lime" />
        <p className="text-gray-400 font-bold tracking-widest uppercase text-sm animate-pulse">
          Loading the freshest vibes...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-32">
      {/* Mood Pills Header */}
      <div>
        <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-zinc-500 mb-4">Mood Pills</h2>
        <div className="flex flex-wrap gap-3">
          {MOOD_PILLS.map(pill => (
            <button key={pill.label} className={`px-5 py-2.5 rounded-full text-xs font-display font-black tracking-widest uppercase transition-transform hover:scale-105 active:scale-95 shadow-lg ${pill.color}`}>
              {pill.label}
            </button>
          ))}
        </div>
      </div>
      {SECTIONS.map((section) => {
        const data = sectionsData[section.title];
        if (!data || !data.length) return null;

        return (
          <div key={section.title}>
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-zinc-500 mb-6">{section.title}</h2>
            
            <div className="flex flex-col space-y-2">
              {data.map((track, i) => {
                const num = (i + 1).toString().padStart(2, '0');
                return (
                  <div 
                    key={track.id}
                    className="group relative flex items-center p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer overflow-hidden border border-transparent hover:border-white/10"
                    onClick={() => handlePlay(track, data)}
                  >
                    {/* Massive faded number in background */}
                    <div className="absolute -right-4 -top-8 text-[120px] font-display font-black text-white/5 pointer-events-none select-none transition-all duration-500 group-hover:text-white/10 group-hover:-translate-x-4">
                      {num}
                    </div>
                    
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-lg mr-6 flex-shrink-0">
                      <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                        <Play className="w-6 h-6 text-acid-lime fill-current" />
                      </div>
                    </div>
                    
                    <div className="relative z-10 flex flex-col justify-center overflow-hidden pr-20">
                      <h3 className="font-display font-bold text-lg text-white truncate transition-colors group-hover:text-acid-lime">{track.title}</h3>
                      <p className="text-zinc-400 font-sans text-sm truncate">{track.artist}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
