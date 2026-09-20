import React, { useEffect, useState } from 'react';
import { Play, Loader2, Heart, Sparkles, Plus } from 'lucide-react';
import { searchUnblocked } from '../services/unblockedMusicService';
import type { Track } from '../types/music';
import { usePlayerStore } from '../store/usePlayerStore';
import { DaylistWidget } from './DaylistWidget';
import { AIPlaylistModal } from './AIPlaylistModal';
import type { TabType } from './BottomNav';
import { generateAIPlaylist } from '../services/geminiService';

const getMostRecentMonday = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
};

const DiscoverWeeklyBanner: React.FC = () => {
  const discoverWeekly = usePlayerStore(state => state.discoverWeekly);
  const setDiscoverWeekly = usePlayerStore(state => state.setDiscoverWeekly);
  const savedPlaylists = usePlayerStore(state => state.savedPlaylists);
  const playTrack = usePlayerStore(state => state.playTrack);
  const setQueue = usePlayerStore(state => state.setQueue);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ pct: 0, msg: '' });

  const lastMonday = getMostRecentMonday();
  const needsRefresh = !discoverWeekly || discoverWeekly.generatedAt < lastMonday;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Find a seed track from saved playlists, fallback to a Gen-Z pop hit
      let seedArtist = "The Weeknd";
      let seedSong = "Starboy";
      
      const allTracks = savedPlaylists.flatMap(p => p.tracks);
      if (allTracks.length > 0) {
        const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
        seedArtist = randomTrack.artist || seedArtist;
        seedSong = randomTrack.title || seedSong;
      }

      const tracks = await generateAIPlaylist(
        { artist: seedArtist, song: seedSong },
        "Curate a 30-song 'Discover Weekly' playlist based on this vibe. Make it sound fresh, obscure but catchy, and perfect for the start of the week.",
        (pct, msg) => setProgress({ pct, msg })
      );

      if (tracks.length > 0) {
        setDiscoverWeekly(tracks, Date.now());
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate Discover Weekly. Check API key.');
    } finally {
      setIsGenerating(false);
      setProgress({ pct: 0, msg: '' });
    }
  };

  const handlePlay = () => {
    if (discoverWeekly?.tracks && discoverWeekly.tracks.length > 0) {
      setQueue(discoverWeekly.tracks);
      playTrack(discoverWeekly.tracks[0]);
    }
  };

  if (isGenerating) {
    return (
      <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 flex flex-col items-center justify-center h-48 shadow-[0_0_40px_rgba(79,70,229,0.2)]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mb-4" />
        <h3 className="text-white font-bold tracking-widest uppercase text-sm mb-2">Curating Discover Weekly...</h3>
        <p className="text-indigo-300 text-xs font-mono">{progress.msg} ({progress.pct}%)</p>
        <div className="w-full max-w-xs h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress.pct}%` }} />
        </div>
      </div>
    );
  }

  if (needsRefresh) {
    return (
      <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 shadow-[0_10px_40px_rgba(59,130,246,0.15)] flex flex-col sm:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.4)] shrink-0 animate-pulse">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-black text-white tracking-tighter mb-1">Discover Weekly</h2>
          <p className="text-zinc-400 text-sm mb-4">It's a new week! Your custom AI-curated 30-song playlist is ready to be generated based on your sonic vibe.</p>
          <button 
            onClick={handleGenerate}
            className="px-6 py-2.5 rounded-full bg-blue-500 text-white font-bold text-sm hover:bg-blue-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(59,130,246,0.5)]"
          >
            Generate Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 shadow-[0_10px_40px_rgba(79,70,229,0.15)] flex flex-col sm:flex-row items-center gap-6 group">
      <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(79,70,229,0.4)] shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 opacity-80" />
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-50 mix-blend-overlay">
          {discoverWeekly?.tracks.slice(0, 4).map((t, i) => (
            <img key={i} src={t.thumbnail} className="w-full h-full object-cover" alt="" />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-black text-4xl opacity-50">DW</span>
        </div>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm" onClick={handlePlay}>
          <Play className="w-12 h-12 text-white fill-current" />
        </div>
      </div>
      <div className="flex-1 text-center sm:text-left">
        <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-indigo-400 mb-1">Made for you</h2>
        <h1 className="text-3xl font-black text-white tracking-tighter mb-2">Discover Weekly</h1>
        <p className="text-zinc-400 text-sm mb-4">30 fresh tracks curated specifically for your unique sonic footprint.</p>
        <button 
          onClick={handlePlay}
          className="px-8 py-3 rounded-full bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(79,70,229,0.5)] flex items-center gap-2 mx-auto sm:mx-0"
        >
          <Play className="w-4 h-4 fill-current" /> Play Now
        </button>
      </div>
    </div>
  );
};

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
  { title: "W SONGS (NO CAP)", query: "trending top hits" },
  { title: "SIGMA BEATS", query: "viral tiktok songs" }
];

interface HomeViewProps {
  setActiveTab?: (tab: TabType) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ setActiveTab }) => {
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
          Loading that +1000 aura...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-32">
      {/* AI Playlist Modal */}
      <AIPlaylistModal isOpen={isAIPlaylistOpen} onClose={() => setIsAIPlaylistOpen(false)} onNavigateToPlaylist={(id) => setActiveTab && setActiveTab(`playlist:${id}`)} />

      {/* Discover Weekly Banner */}
      <DiscoverWeeklyBanner />

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
            <h3 className="font-black text-white text-base">AI Playlist Generator (W Rizz)</h3>
            <p className="text-zinc-400 text-xs mt-0.5">Drop a seed track → get a skibidi 30-song journey</p>
          </div>
          <div className="shrink-0 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold">
            Try it
          </div>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-zinc-500 mb-4">Aura Pills</h2>
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
                    "W SONGS (NO CAP)": results.slice(0, 10)
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
                    className="group relative flex items-center p-5 rounded-3xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer overflow-hidden border border-white/10 hover:border-acid-lime/50 hover:scale-[1.02] shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_40px_rgba(163,230,53,0.15)]"
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
                    
                    <div className="relative z-10 flex flex-col justify-center overflow-hidden flex-1">
                      <h3 className="font-display font-bold text-lg text-white truncate transition-colors group-hover:text-acid-lime">{track.title}</h3>
                      <p className="text-zinc-400 font-sans text-sm truncate">{track.artist}</p>
                    </div>

                    <div className="relative z-10 ml-4 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          usePlayerStore.getState().openAddToPlaylistModal(track);
                        }}
                        className="p-3 text-zinc-500 hover:text-acid-lime hover:bg-white/10 rounded-full transition-all"
                        title="Add to Playlist"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
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
