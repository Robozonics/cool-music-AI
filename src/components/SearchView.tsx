import React, { useState, useEffect } from 'react';
import { Search, Play, Download, Loader2, Sparkles } from 'lucide-react';
import { searchUnblocked } from '../services/unblockedMusicService';
import { searchBestMusicWithAI } from '../services/geminiService';
import type { Track } from '../types/music';
import { usePlayerStore } from '../store/usePlayerStore';
import { downloadTrack } from '../services/downloadService';

export const SearchView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'standard' | 'ai'>('standard');
  
  const playTrack = usePlayerStore(state => state.playTrack);
  const setQueue = usePlayerStore(state => state.setQueue);
  const setApiKeyModalOpen = usePlayerStore(state => state.setApiKeyModalOpen);

  const aiPills = [
    '🔥 All-Time Best Billboard Hits',
    '🏎️ Hardest Gym Phonk Ever',
    '🌌 Songs That Make You Feel Like Floating',
    '☕ Best Cozy Coffee Shop Lofi'
  ];

  const executeSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setResults([]);
    
    try {
      if (searchMode === 'ai') {
        const tracks = await searchBestMusicWithAI(searchQuery);
        setResults(tracks);
      } else {
        const tracks = await searchUnblocked(searchQuery);
        setResults(tracks);
      }
    } catch (error: any) {
      if (error.message === 'MISSING_API_KEY') {
        setApiKeyModalOpen(true);
      } else {
        alert('An error occurred during search.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handlePlay = (track: Track) => {
    setQueue(results);
    playTrack(track);
  };

  const handleDownload = async (track: Track) => {
    if (track.source === 'saavn') {
      await downloadTrack(track);
    } else {
      alert('Downloading is only supported for Studio Direct (JioSaavn) tracks at the moment.');
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    // Only auto-search for standard mode to save AI quota
    if (searchMode === 'standard') {
      const delayDebounceFn = setTimeout(() => {
        executeSearch(query);
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [query, searchMode]);

  return (
    <div className="p-4 pt-8 w-full max-w-2xl mx-auto h-full flex flex-col">
      {/* Toggle */}
      <div className="flex bg-white/5 rounded-full p-1 mb-6 border border-white/10 mx-auto w-max">
        <button
          onClick={() => setSearchMode('standard')}
          className={`flex items-center px-6 py-2 rounded-full transition-all text-sm font-bold tracking-wide ${searchMode === 'standard' ? 'bg-white text-obsidian' : 'text-gray-400 hover:text-white'}`}
        >
          <Search className="w-4 h-4 mr-2" />
          Standard Search
        </button>
        <button
          onClick={() => setSearchMode('ai')}
          className={`flex items-center px-6 py-2 rounded-full transition-all text-sm font-bold tracking-wide ${searchMode === 'ai' ? 'bg-acid-lime text-obsidian shadow-[0_0_20px_rgba(204,255,0,0.3)]' : 'text-gray-400 hover:text-white'}`}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          AI Best Music Search
        </button>
      </div>

      <form onSubmit={handleSearch} className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchMode === 'ai' ? "e.g. 'Best 90s hip-hop basslines', 'Top 10 synthwave'..." : "Search for any song, artist, or vibe..."}
          className={`w-full bg-white/5 border rounded-full py-4 pl-12 pr-6 text-white placeholder-gray-400 focus:outline-none transition-all glass-panel ${searchMode === 'ai' ? 'border-acid-lime/50 focus:border-acid-lime focus:ring-1 focus:ring-acid-lime' : 'border-white/10 focus:border-white'}`}
        />
        {searchMode === 'ai' ? (
           <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-acid-lime w-5 h-5" />
        ) : (
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        )}
      </form>

      {searchMode === 'ai' && !isLoading && results.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {aiPills.map((pill) => (
            <button
              key={pill}
              onClick={() => {
                setQuery(pill);
                executeSearch(pill);
              }}
              className="bg-white/5 hover:bg-acid-lime/20 border border-white/10 hover:border-acid-lime/50 text-gray-300 hover:text-acid-lime px-4 py-2 rounded-full text-xs font-medium transition-all"
            >
              {pill}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col justify-center items-center py-12 space-y-4">
          <Loader2 className={`w-8 h-8 animate-spin-slow ${searchMode === 'ai' ? 'text-acid-lime' : 'text-white'}`} />
          {searchMode === 'ai' && (
            <p className="text-acid-lime animate-pulse text-sm font-medium tracking-wide">
              AI is analyzing millions of songs to find the absolute best matches... ✨
            </p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pb-24">
        {results.map((track) => (
          <div key={track.id} className="flex flex-col p-3 rounded-2xl hover:bg-white/5 transition group">
            <div className="flex items-center">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 group-hover:shadow-[0_0_15px_rgba(204,255,0,0.3)] transition-shadow">
                <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                <button 
                  onClick={() => handlePlay(track)}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Play className="w-6 h-6 text-acid-lime fill-acid-lime" />
                </button>
              </div>
              
              <div className="ml-4 flex-1 min-w-0">
                <h4 className="text-white font-bold truncate text-lg">{track.title}</h4>
                <p className="text-gray-400 text-sm truncate flex items-center gap-2">
                  {track.artist}
                  {track.reason && (
                    <span className="bg-acid-lime/20 text-acid-lime text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-acid-lime/30">
                      AI Pick ✨
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-col items-end shrink-0 ml-4 space-y-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${track.source === 'saavn' ? 'bg-electric-fuchsia text-white' : 'bg-white/10 text-gray-300'}`}>
                  {track.sourceBadge}
                </span>
                
                {track.source === 'saavn' && (
                  <button 
                    onClick={() => handleDownload(track)}
                    className="p-1.5 rounded-full hover:bg-white/10 transition text-gray-400 hover:text-cyber-cyan"
                    title="Download Offline"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            {track.reason && (
              <div className="mt-3 ml-[72px] text-xs text-gray-400 italic border-l-2 border-acid-lime/50 pl-3">
                "{track.reason}"
              </div>
            )}
          </div>
        ))}

        {!isLoading && results.length === 0 && query && (
          <div className="text-center py-12 text-gray-400">
            No tracks found. Try a different vibe!
          </div>
        )}
      </div>
    </div>
  );
};
