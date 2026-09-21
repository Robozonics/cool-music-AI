import React, { useState, useEffect } from 'react';
import { Search, Play, Download, Loader2, Sparkles, Plus, Mic, MicOff, Layers } from 'lucide-react';
import { searchUnblocked } from '../services/unblockedMusicService';
import { searchBestMusicWithAI } from '../services/geminiService';
import type { Track } from '../types/music';
import { usePlayerStore } from '../store/usePlayerStore';
import { downloadTrack } from '../services/downloadService';
import { useMashupStore } from '../store/useMashupStore';

export const SearchView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'standard' | 'ai'>('standard');
  const [isListening, setIsListening] = useState(false);
  
  const playTrack = usePlayerStore(state => state.playTrack);
  const setQueue = usePlayerStore(state => state.setQueue);
  const setApiKeyModalOpen = usePlayerStore(state => state.setApiKeyModalOpen);

  const aiPills = [
    '🔥 All-Time Best Billboard Hits',
    '🤠🐎🎸',
    '🌌 Songs That Make You Feel Like Floating',
    '#sad #lofi #study'
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

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);

  const toggleListening = async () => {
    if (isListening && mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsListening(true);
      setSearchMode('ai');
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks: Blob[] = [];

      mediaRecorder.addEventListener('dataavailable', event => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      });

      mediaRecorder.addEventListener('stop', async () => {
        setIsListening(false);
        stream.getTracks().forEach(track => track.stop());
        
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          setQuery('Analyzing audio...');
          setIsLoading(true);
          setResults([]);
          try {
            const tracks = await searchBestMusicWithAI('Audio Search', base64data);
            setResults(tracks);
            if (tracks.length > 0) {
              setQuery(`Found: ${tracks[0].title}`);
            } else {
              setQuery('');
            }
          } catch (e) {
            console.error(e);
            alert('Failed to identify audio.');
            setQuery('');
          } finally {
            setIsLoading(false);
          }
        };
      });

      mediaRecorder.start();
      
      // Auto stop after 6 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      }, 6000);

    } catch (err) {
      console.error('Mic error:', err);
      alert('Could not access microphone. Please check permissions.');
      setIsListening(false);
    }
  };

  useEffect(() => {
    const hasEmoji = /\p{Extended_Pictographic}/u.test(query);
    if (hasEmoji && searchMode === 'standard') {
      setSearchMode('ai');
      executeSearch(query);
    }

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
    <div className="p-3 pt-6 w-full max-w-2xl mx-auto h-full flex flex-col">
      {/* Search Mode Toggle — responsive pill switcher */}
      <div className="flex bg-white/5 rounded-2xl p-1 mb-4 border border-white/10 w-full gap-1">
        <button
          onClick={() => setSearchMode('standard')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl transition-all text-xs sm:text-sm font-bold tracking-wide min-w-0 ${
            searchMode === 'standard' ? 'bg-white text-obsidian shadow-sm' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Search</span>
        </button>
        <button
          onClick={() => setSearchMode('ai')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl transition-all text-xs sm:text-sm font-bold tracking-wide min-w-0 ${
            searchMode === 'ai'
              ? 'bg-acid-lime text-obsidian shadow-[0_0_15px_rgba(204,255,0,0.3)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">AI Search</span>
        </button>
      </div>

      <form onSubmit={handleSearch} className="relative mb-4 flex items-center group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            searchMode === 'ai'
              ? '🏎️🔥 Vibe, emoji, or #hashtag...'
              : 'Song, artist, or mood...'
          }
          className={`w-full bg-white/5 border rounded-2xl py-3.5 pl-11 pr-14 text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
            searchMode === 'ai'
              ? 'border-acid-lime/40 focus:border-acid-lime focus:ring-1 focus:ring-acid-lime'
              : 'border-white/10 focus:border-white/40'
          }`}
        />
        {searchMode === 'ai' ? (
           <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 text-acid-lime w-4 h-4" />
        ) : (
           <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        )}
        {query.trim().length > 0 ? (
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-acid-lime text-obsidian shadow-[0_0_12px_rgba(204,255,0,0.4)] transition-all hover:scale-105"
          >
            <Search className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleListening}
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all flex items-center justify-center ${
              isListening
                ? 'bg-red-500 text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'
            }`}
            title="Hum or sing to search"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
      </form>
      
      {isListening && (
        <div className="flex flex-col items-center justify-center mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl">
          <div className="flex items-end space-x-1 h-8 mb-4">
            {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
              <div 
                key={bar}
                className="w-1.5 bg-red-500 rounded-t-sm"
                style={{
                  height: `${Math.max(20, Math.random() * 100)}%`,
                  animation: `bounce-eq 0.${3 + bar}s ease-in-out infinite alternate`
                }}
              />
            ))}
          </div>
          <p className="text-red-400 font-bold tracking-widest uppercase text-sm animate-pulse">Listening... Sing or Hum</p>
        </div>
      )}

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

      {searchMode === 'standard' && !isLoading && results.length === 0 && !query && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4 text-white">Trending Vibes 🚀</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['The Weeknd', 'Travis Scott', 'Drake', 'Playboi Carti', 'Billie Eilish', 'Taylor Swift', 'Dua Lipa', 'Post Malone'].map(artist => (
              <button
                key={artist}
                onClick={() => {
                  setQuery(artist);
                  executeSearch(artist);
                }}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 flex flex-col items-start justify-center transition-all group"
              >
                <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Artist</span>
                <span className="text-lg font-bold text-white mt-1 group-hover:text-acid-lime transition-colors">{artist}</span>
              </button>
            ))}
          </div>
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
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      usePlayerStore.getState().openAddToPlaylistModal(track);
                    }}
                    className="p-1.5 rounded-full hover:bg-white/10 transition text-gray-400 hover:text-acid-lime"
                    title="Add to Playlist"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      useMashupStore.getState().addTrack(track);
                    }}
                    className="p-1.5 rounded-full hover:bg-white/10 transition text-gray-400 hover:text-electric-fuchsia"
                    title="Add to AI Mashup Studio"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                  {track.source === 'saavn' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDownload(track); }}
                      className="p-1.5 rounded-full hover:bg-white/10 transition text-gray-400 hover:text-cyber-cyan"
                      title="Download Offline"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
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
