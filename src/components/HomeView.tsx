import React, { useEffect, useState } from 'react';
import { Play, Loader2, Heart, Sparkles, Plus, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { searchUnblocked } from '../services/unblockedMusicService';
import type { Track } from '../types/music';
import { usePlayerStore } from '../store/usePlayerStore';
import { DaylistWidget } from './DaylistWidget';
import { AIPlaylistModal } from './AIPlaylistModal';
import type { TabType } from './BottomNav';
import { generateAIPlaylist, generateAuraAnalysis, callGeminiDirectly } from '../services/geminiService';

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
      let seedArtist = "The Weeknd";
      let seedSong = "Starboy";
      let customPromptContext = "Curate a 30-song 'Discover Weekly' playlist based on this vibe. Make it sound fresh, obscure but catchy, and perfect for the start of the week.";
      let inspirations = "";
      
      const allTracks = savedPlaylists.flatMap(p => p.tracks);
      if (allTracks.length > 0) {
        // Find most frequent artist as seed
        const artistCounts = allTracks.reduce((acc, t) => {
          if (t.artist) acc[t.artist] = (acc[t.artist] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const topArtist = Object.keys(artistCounts).length > 0 
          ? Object.keys(artistCounts).reduce((a, b) => artistCounts[a] > artistCounts[b] ? a : b)
          : seedArtist;
        
        seedArtist = topArtist;
        
        // Find a song by this top artist
        const songByTopArtist = allTracks.find(t => t.artist === topArtist);
        if (songByTopArtist) {
          seedSong = songByTopArtist.title || seedSong;
        }

        // Get up to 3 diverse tracks to include in custom prompt for diverse inspiration
        const shuffled = [...allTracks].sort(() => 0.5 - Math.random());
        inspirations = shuffled.slice(0, 3).map(t => `"${t.title}" by ${t.artist}`).join(", ");
        
        customPromptContext = `Curate a 30-song 'Discover Weekly' playlist. The user's primary vibe is anchored by ${seedSong} by ${seedArtist}, but their broader taste includes ${inspirations}. Blend these influences perfectly. Make it sound fresh, obscure but catchy, and perfect for the start of the week.`;
      }

      // 1. Start both Aura Analysis and Playlist Generation simultaneously
      const auraPromise = generateAuraAnalysis(seedArtist, seedSong, inspirations);
      const tracksPromise = generateAIPlaylist(
        { artist: seedArtist, song: seedSong },
        customPromptContext,
        (pct, msg) => setProgress({ pct, msg })
      );

      const [aura, tracks] = await Promise.all([auraPromise, tracksPromise]);

      if (tracks.length > 0) {
        setDiscoverWeekly(tracks, Date.now(), aura.vibeTitle, aura.vibeDescription, aura.vibeColor);
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
      <div className="relative overflow-hidden rounded-[2rem] p-8 min-h-[300px] flex flex-col items-center justify-center bg-[#0a0a0a] border border-white/5 shadow-2xl">
        {/* Animated Aura Orb */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 mix-blend-screen">
          <div className="w-[400px] h-[400px] bg-indigo-500 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute w-[300px] h-[300px] bg-purple-500 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute w-[200px] h-[200px] bg-pink-500 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <div className="w-20 h-20 mb-6 rounded-full border-b-4 border-l-4 border-indigo-500 animate-spin flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)]">
             <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-widest uppercase mb-2">Analyzing Your Aura</h3>
          <p className="text-zinc-400 text-sm font-mono mb-6">{progress.msg} ({progress.pct}%)</p>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (needsRefresh) {
    return (
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-[#0f0f11] border border-white/5 shadow-2xl flex flex-col md:flex-row items-center gap-6 md:gap-8 group">
        <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-1000">
           <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600 rounded-full blur-[120px]" />
           <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600 rounded-full blur-[120px]" />
        </div>
        
        <div className="relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.3)] shrink-0 group-hover:scale-105 transition-transform duration-500">
          <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
          <Sparkles className="w-8 h-8 md:w-12 md:h-12 text-white" />
        </div>
        
        <div className="relative z-10 flex-1 text-center md:text-left">
          <h4 className="text-xs md:text-sm font-bold tracking-[0.3em] uppercase text-blue-400 mb-1 md:mb-2">Monday Drop</h4>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-3 md:mb-4">Discover Weekly</h2>
          <p className="text-zinc-400 text-sm md:text-base mb-5 md:mb-6 max-w-lg">Your custom AI-curated sonic aura is ready. 30 fresh tracks based on your recent vibes.</p>
          <button 
            onClick={handleGenerate}
            className="px-6 md:px-8 py-3 md:py-4 rounded-full bg-blue-600 text-white font-black uppercase tracking-wider text-xs md:text-sm hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(59,130,246,0.5)]"
          >
            Analyze My Aura
          </button>
        </div>
      </div>
    );
  }

  const auraColor = discoverWeekly.vibeColor || '#8B5CF6';

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 md:p-10 bg-[#0a0a0a] border border-white/10 shadow-2xl flex flex-col md:flex-row items-center gap-6 md:gap-8 group min-h-[300px]">
      {/* Dynamic Background Blob based on Aura Color */}
      <div className="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none transition-opacity duration-700 group-hover:opacity-50">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] blur-[120px] rounded-full animate-spin-slow" 
             style={{ background: `radial-gradient(circle, ${auraColor} 0%, transparent 70%)` }} />
      </div>
      
      {/* Dark overlay to keep text readable */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-none" />

      <div className="relative z-10 w-32 h-32 md:w-56 md:h-56 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] shrink-0 group-hover:scale-105 transition-transform duration-700">
        <div className="absolute inset-0" style={{ backgroundColor: auraColor, opacity: 0.8 }} />
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-50 mix-blend-overlay">
          {discoverWeekly?.tracks.slice(0, 4).map((t, i) => (
            <img key={i} src={t.thumbnail} className="w-full h-full object-cover" alt="" />
          ))}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 md:p-4 text-center bg-black/20 backdrop-blur-sm">
          <span className="text-white/90 font-black text-[10px] md:text-xs uppercase tracking-widest mb-1">Weekly</span>
          <span className="text-white font-black text-xl md:text-3xl leading-none shadow-black drop-shadow-lg">AURA</span>
        </div>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md" onClick={handlePlay}>
          <Play className="w-12 h-12 md:w-16 md:h-16 text-white fill-current shadow-2xl drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
        </div>
      </div>
      
      <div className="relative z-10 flex-1 text-center md:text-left flex flex-col justify-center">
        <h2 className="text-[10px] md:text-xs font-black tracking-[0.3em] uppercase mb-2 md:mb-3" style={{ color: auraColor }}>
          Discover Weekly • {discoverWeekly.tracks.length} Tracks
        </h2>
        <h3 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-2">{discoverWeekly.vibeTitle || 'AURA ANALYSIS'}</h3>
        <p className="text-zinc-300 text-sm md:text-base mb-4 md:mb-6 max-w-lg leading-relaxed hidden md:block">
          {discoverWeekly.vibeDescription || 'Fresh tracks curated specifically for your unique sonic footprint.'}
        </p>
        <button 
          onClick={handlePlay}
          className="px-6 md:px-8 py-3 md:py-4 rounded-full text-black font-black uppercase tracking-widest text-xs md:text-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 md:gap-3 mx-auto md:mx-0 shadow-lg"
          style={{ backgroundColor: auraColor, boxShadow: `0 10px 40px ${auraColor}60` }}
        >
          <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" /> 
          <span>Play My Aura</span>
        </button>
      </div>
    </div>
  );
};

const GeoDiscoveryBanner: React.FC = () => {
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [locationName, setLocationName] = useState<string>('');
  const [isFetching, setIsFetching] = useState(false);
  const playTrack = usePlayerStore(state => state.playTrack);
  const setQueue = usePlayerStore(state => state.setQueue);

  const fetchLocalVibes = () => {
    setIsFetching(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setIsFetching(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        let city = "Your City";
        let stateName = "";
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`);
          if (res.ok) {
            const data = await res.json();
            city = data.city || data.locality || "Your City";
            stateName = data.principalSubdivision || "";
          }
        } catch (apiErr) {
          console.warn("Reverse geocode API failed/blocked", apiErr);
        }
        
        setLocationName(city === "Your City" ? "your area" : city);

        let tracks: Track[] = [];

        if (city !== "Your City" || stateName) {
          try {
            const locStr = [city !== "Your City" ? city : "", stateName].filter(Boolean).join(", ");
            const prompt = `What are 5 highly popular and trending songs currently being listened to by people in ${locStr} right now? Reply ONLY with a valid JSON array of strings, where each string is the song name and artist. Example: ["Song Name by Artist", "Song Name by Artist"]`;
            
            const songStrings = await callGeminiDirectly(prompt, 'playlist', undefined, true);
            
            if (Array.isArray(songStrings) && songStrings.length > 0) {
              const trackPromises = songStrings.map(async (songQuery: any) => {
                const queryStr = typeof songQuery === 'string' ? songQuery : `${songQuery.title || ''} ${songQuery.artist || ''} ${songQuery.name || ''}`;
                if (!queryStr.trim()) return null;
                const res = await searchUnblocked(queryStr);
                return res[0]; 
              });
              const results = await Promise.all(trackPromises);
              tracks = results.filter(t => !!t) as Track[];
            }
          } catch (aiErr) {
            console.warn("AI trending failed, falling back to basic search", aiErr);
          }
        }

        if (tracks.length === 0) {
          const query = city === "Your City" ? "trending hits viral top 50" : `trending hits in ${city}`;
          tracks = await searchUnblocked(query);
          
          // Fallback to State level if City returns no results
          if (tracks.length === 0 && stateName && city !== "Your City") {
            setLocationName(stateName);
            tracks = await searchUnblocked(`trending hits in ${stateName}`);
          }

          // Final fallback if State also returns nothing
          if (tracks.length === 0) {
            setLocationName("your area");
            tracks = await searchUnblocked("trending hits viral top 50");
          }
        }
        
        if (tracks.length > 0) {
          setLocalTracks(tracks.slice(0, 5));
        } else {
          alert("We couldn't find local vibes right now, but keep exploring!");
        }
      } catch (e) {
        console.error("Geo fetch failed", e);
        alert("Oops! Something went wrong fetching the local tracks.");
      } finally {
        setIsFetching(false);
      }
    }, (error) => {
      console.error(error);
      alert("Please allow location access to discover local tracks.");
      setIsFetching(false);
    });
  };

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-emerald-900/40 to-teal-900/20 border border-emerald-500/20 shadow-2xl flex flex-col md:flex-row items-center gap-6 group">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none" />
      
      <div className="relative z-10 w-16 h-16 md:w-24 md:h-24 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
        <MapPin className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
      </div>

      <div className="relative z-10 flex-1 w-full min-w-0 text-center md:text-left">
        <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-emerald-400 mb-2">Geo-Tagged Discovery</h2>
        {locationName ? (
          <h3 className="text-xl md:text-2xl font-black text-white mb-2">Trending in {locationName}</h3>
        ) : (
          <h3 className="text-xl md:text-2xl font-black text-white mb-2">Find Local Vibes</h3>
        )}
        <p className="text-xs md:text-sm text-zinc-400 mb-4 max-w-md mx-auto md:mx-0">
          Discover the tracks everyone is listening to around your exact physical location right now.
        </p>

        {localTracks.length === 0 && !isFetching && (
          <button 
            onClick={fetchLocalVibes}
            className="px-6 py-2.5 rounded-full bg-emerald-500 text-obsidian font-bold text-sm hover:scale-105 transition-transform"
          >
            Scan Location
          </button>
        )}
        
        {isFetching && (
          <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 text-sm font-bold">
            <Loader2 className="w-5 h-5 animate-spin" /> Scanning radar...
          </div>
        )}

        {localTracks.length > 0 && (
          <motion.div 
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
            className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar text-left mt-4 w-full"
          >
            {localTracks.map(track => {
              const isLiked = usePlayerStore(state => state.likedTracks.includes(track.id));
              const toggleLike = usePlayerStore(state => state.toggleLikeTrack);
              return (
              <motion.div 
                key={track.id} 
                variants={{
                  hidden: { opacity: 0, scale: 0.9, x: 20 },
                  show: { opacity: 1, scale: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                }}
                className="w-32 shrink-0 cursor-pointer group/track relative"
              >
                <div 
                  onClick={() => { setQueue(localTracks); playTrack(track); }}
                  className="relative w-full aspect-square rounded-xl overflow-hidden mb-2"
                >
                  <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover/track:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/track:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-8 h-8 text-emerald-400 fill-emerald-400" />
                  </div>
                </div>
                
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-md opacity-0 group-hover/track:opacity-100 transition-opacity hover:bg-black/60 z-20"
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-lime-400 text-lime-400' : 'text-white'}`} />
                </motion.button>
                
                <p className="text-xs font-bold text-white truncate pr-6">{track.title}</p>
                <p className="text-[10px] text-zinc-400 truncate">{track.artist}</p>
              </motion.div>
            )})}
          </motion.div>
        )}
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
  const toggleLikeTrack = usePlayerStore(state => state.toggleLikeTrack);

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
    <div className="space-y-8 md:space-y-12 pb-32 pt-2 md:pt-4">
      {/* AI Playlist Modal */}
      <AIPlaylistModal isOpen={isAIPlaylistOpen} onClose={() => setIsAIPlaylistOpen(false)} onNavigateToPlaylist={(id) => setActiveTab && setActiveTab(`playlist:${id}`)} />

      {/* Discover Weekly Banner */}
      <DiscoverWeeklyBanner />
      
      {/* Geo-Tagged Discovery Banner */}
      <GeoDiscoveryBanner />

      {/* Daylist Widget — Time-Contextual (Feature 4) */}
      <DaylistWidget />

      {/* AI Playlist Generator CTA Card */}
      <div
        onClick={() => setIsAIPlaylistOpen(true)}
        className="relative cursor-pointer group overflow-hidden rounded-2xl md:rounded-3xl p-4 md:p-5 bg-gradient-to-r from-purple-600/20 via-pink-600/15 to-violet-600/10 border border-purple-500/25 hover:border-purple-500/50 transition-all shadow-[0_8px_40px_rgba(139,92,246,0.2)] hover:shadow-[0_8px_50px_rgba(139,92,246,0.35)]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10 flex flex-row items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)] shrink-0">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-white text-sm md:text-base">AI Playlist Generator (W Rizz)</h3>
            <p className="text-zinc-400 text-[10px] md:text-xs mt-0.5">Drop a seed track → get a skibidi 30-song journey</p>
          </div>
          <div className="hidden sm:block shrink-0 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold">
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
            
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.1 } }
              }}
              className="flex flex-col space-y-2"
            >
              {data.map((track, i) => {
                const num = (i + 1).toString().padStart(2, '0');
                return (
                  <motion.div 
                    key={track.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                    }}
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

                    <div className="relative z-10 ml-4 shrink-0 flex items-center gap-1">
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLikeTrack(track);
                        }}
                        className="p-3 text-zinc-500 hover:text-pink-500 hover:bg-white/10 rounded-full transition-all"
                        title="Like Track"
                      >
                        <Heart className={`w-6 h-6 ${likedTracks.includes(track.id) ? 'fill-pink-500 text-pink-500' : ''}`} />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          usePlayerStore.getState().openAddToPlaylistModal(track);
                        }}
                        className="p-3 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-all"
                        title="Add to Playlist"
                      >
                        <Plus className="w-6 h-6" />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
};
