import React, { useEffect, useState } from 'react';
import { Play, Loader2, Sparkles, TrendingUp, Music } from 'lucide-react';
import { searchUnblocked } from '../services/unblockedMusicService';
import type { Track } from '../types/music';
import { usePlayerStore } from '../store/usePlayerStore';

interface Section {
  title: string;
  icon: React.ReactNode;
  query: string;
}

const SECTIONS: Section[] = [
  { title: "Trending Bollywood 2026 🌶️", icon: <TrendingUp className="w-5 h-5 text-acid-lime" />, query: "latest hindi hits" },
  { title: "Top 50 India 🚀", icon: <Music className="w-5 h-5 text-electric-fuchsia" />, query: "top chart india" },
  { title: "Viral Desi Hits ✨", icon: <Sparkles className="w-5 h-5 text-cyber-cyan" />, query: "viral punjabi" }
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
    <div className="pb-32 space-y-16 mt-4">
      {SECTIONS.map((section) => {
        const data = sectionsData[section.title];
        if (!data || !data.length) return null;

        return (
          <div key={section.title}>
            <div className="flex items-center space-x-4 px-6 mb-8">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                {section.icon}
              </div>
              <h2 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 uppercase">{section.title}</h2>
            </div>
            
            <div className="flex overflow-x-auto hide-scrollbar px-6 pb-8 space-x-6">
              {data.map((track) => (
                <div 
                  key={track.id}
                  className="flex-none w-48 group cursor-pointer"
                  onClick={() => handlePlay(track, data)}
                >
                  <div className="w-48 h-48 rounded-3xl overflow-hidden mb-4 relative shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_30px_rgba(204,255,0,0.3)] transition-all duration-300 group-hover:-translate-y-3 group-hover:scale-105 border border-white/5">
                    <img 
                      src={track.thumbnail} 
                      alt={track.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <div className="w-16 h-16 rounded-full bg-acid-lime text-obsidian flex items-center justify-center transform scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_30px_rgba(204,255,0,0.8)]">
                        <Play className="w-8 h-8 fill-current ml-1" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-black text-lg text-white truncate group-hover:text-acid-lime transition-colors">{track.title}</h3>
                  <p className="text-gray-400 text-sm font-medium truncate">{track.artist}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
