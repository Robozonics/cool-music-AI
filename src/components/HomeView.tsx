import React, { useEffect, useState } from 'react';
import { Play, Loader2, Heart, Sparkles } from 'lucide-react';
import { searchUnblocked } from '../services/unblockedMusicService';
import type { Track } from '../types/music';
import { usePlayerStore } from '../store/usePlayerStore';
import { DaylistWidget } from './DaylistWidget';
import { AIPlaylistModal } from './AIPlaylistModal';

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
  { title: "CURATED FOR YOU", query: "trending top hits" },
  { title: "VIBE MATCH", query: "viral tiktok songs" }
];

export const HomeView: React.FC = () => {
  const [sectionsData, setSectionsData] = useState<Record<string, Track[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAIPlaylistOpen, setIsAIPlaylistOpen] = useState(false);
  
  const playTrack = usePlayerStore(state => state.playTrack);
  const setQueue = usePlayerStore(state => state.setQueue);
  const likedTracks = usePlayerStore(state => state.likedTracks);

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
      {/* AI Playlist Modal */}
      <AIPlaylistModal isOpen={isAIPlaylistOpen} onClose={() => setIsAIPlaylistOpen(false)} />

      {/* Daylist Widget — Time-Contextual (Feature 4) */}
      <DaylistWidget />

      {/* AI Playlist Generator CTA Card */}
      <div
        onClick={() => setIsAIPlaylistOpen(true)}
        className="relative cursor-pointer group overflow-hidden rounded-3xl p-5 bg-gradient-to-r from-purple-600/20 via-pink-600/15 to-violet-600/10 border border-purple-500/25 hover:border-purple-500/50 transition-all shadow-[0_8px_40px_rgba(139,92,246,0.2)] hover:shadow-[0_8px_50px_rgba(139,92,246,0.35)]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)] shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-white text-base">AI Playlist Generator</h3>
            <p className="text-zinc-400 text-xs mt-0.5">Enter a seed track → get a perfectly sequenced 30-song journey</p>
          </div>
          <div className="shrink-0 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold">
            Try it
          </div>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-zinc-500 mb-4">Mood Pills</h2>
        <div className="flex flex-wrap gap-3">
          {MOOD_PILLS.map(pill => (
            <button 
              key={pill.label} 
              disabled={isLoading}
              onClick={async () => {
                if (isLoading) return;
                setIsLoading(true);
                try {
                  const results = await searchUnblocked(pill.query);
                  setSectionsData(prev => ({
                    ...prev,
                    "CURATED FOR YOU": results.slice(0, 10)
                  }));
                } finally {
                  setIsLoading(false);
                }
              }}
              className={`px-5 py-2.5 rounded-full text-xs font-display font-black tracking-widest uppercase transition-transform shadow-lg ${pill.color} ${isLoading ? 'opacity-50 cursor-not-allowed scale-95' : 'hover:scale-105 active:scale-95'}`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Liked Songs Row */}
      {likedTracks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-black text-white tracking-tight">YOUR LIKED SONGS</h2>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{likedTracks.length} TRACKS</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 snap-x hide-scrollbar -mx-6 px-6">
            <div className="min-w-[280px] p-4 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/10 border border-pink-500/20 backdrop-blur-md flex flex-col justify-center items-center text-center shadow-[0_0_30px_rgba(236,72,153,0.15)]">
               <Heart className="w-8 h-8 text-pink-500 mb-2 fill-pink-500" />
               <p className="text-white font-bold text-sm">You have {likedTracks.length} liked tracks.</p>
               <p className="text-zinc-400 text-xs mt-1">Go to Vault to manage them.</p>
            </div>
          </div>
        </div>
      )}

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
                    className="group relative flex items-center p-5 rounded-3xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer overflow-hidden border border-white/10 hover:border-acid-lime/50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_40px_rgba(163,230,53,0.15)]"
                    onClick={() => handlePlay(track, data)}
                  >
                    {/* Massive faded number in background */}
                    <div className="absolute -right-8 -top-12 text-[160px] font-display font-black text-white/5 pointer-events-none select-none transition-all duration-700 group-hover:text-acid-lime/10 group-hover:-translate-x-8 group-hover:scale-110">
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
