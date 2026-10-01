import React, { useState, useEffect } from 'react';
import { Plus, X, User } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { searchArtists } from '../services/unblockedMusicService';
import type { SaavnArtist } from '../services/unblockedMusicService';

interface ArtistBubbleProps {
  artist: string;
  onSearchArtist: (artist: string) => void;
  removeFavoriteArtist: (artist: string) => void;
}

const ArtistBubble: React.FC<ArtistBubbleProps> = ({ artist, onSearchArtist, removeFavoriteArtist }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    searchArtists(artist).then((res: SaavnArtist[]) => {
      if (mounted && res.length > 0) {
        setImageUrl(res[0].image);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, [artist]);

  return (
    <div
      className="group relative flex flex-col items-center gap-2 shrink-0 snap-center cursor-pointer w-20 md:w-24"
      onClick={() => onSearchArtist(artist)}
    >
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border-2 border-transparent group-hover:border-acid-lime transition-all shadow-lg group-hover:shadow-[0_0_20px_rgba(163,230,53,0.3)]">
        {imageUrl ? (
          <img src={imageUrl} alt={artist} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <User className="w-8 h-8 text-zinc-500 group-hover:text-acid-lime transition-colors" />
        )}
      </div>
      <p className="text-xs font-bold text-white w-full text-center truncate px-1 group-hover:text-acid-lime transition-colors">
        {artist}
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeFavoriteArtist(artist);
        }}
        className="absolute top-0 right-0 p-1.5 bg-black/60 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 backdrop-blur-md"
        title="Remove artist"
      >
        <X className="w-3 h-3 text-white" />
      </button>
    </div>
  );
};

interface FavoriteArtistsRowProps {
  onSearchArtist: (artist: string) => void;
}

export const FavoriteArtistsRow: React.FC<FavoriteArtistsRowProps> = ({ onSearchArtist }) => {
  const favoriteArtists = usePlayerStore(state => state.favoriteArtists || []);
  const addFavoriteArtist = usePlayerStore(state => state.addFavoriteArtist);
  const removeFavoriteArtist = usePlayerStore(state => state.removeFavoriteArtist);
  const [isAdding, setIsAdding] = useState(false);
  const [newArtist, setNewArtist] = useState('');

  const [searchResults, setSearchResults] = useState<SaavnArtist[]>([]);

  useEffect(() => {
    if (newArtist.trim().length > 1) {
      const delay = setTimeout(() => {
        searchArtists(newArtist.trim()).then(res => {
          setSearchResults(res);
        });
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
    }
  }, [newArtist]);

  const handleSelectArtist = (artistName: string) => {
    addFavoriteArtist(artistName);
    setNewArtist('');
    setIsAdding(false);
  };

  return (
    <>
      <div className="w-full relative z-10 mb-8 mt-2">
        <h2 className="text-xs md:text-sm font-bold tracking-[0.2em] uppercase text-zinc-500 mb-4 px-2 md:px-0">Your Artists</h2>
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 px-2 md:px-0 snap-x hide-scrollbar items-start">
          {favoriteArtists.map(artist => (
            <ArtistBubble
              key={artist}
              artist={artist}
              onSearchArtist={onSearchArtist}
              removeFavoriteArtist={removeFavoriteArtist}
            />
          ))}
          
          <div className="shrink-0 snap-center">
            {/* Add Artist Button (triggers modal) */}
            <div
              onClick={() => setIsAdding(true)}
              className="flex flex-col items-center gap-2 cursor-pointer group w-20 md:w-24"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-white/5 flex items-center justify-center border-2 border-dashed border-white/20 group-hover:border-acid-lime group-hover:bg-acid-lime/10 transition-all">
                <Plus className="w-8 h-8 text-zinc-400 group-hover:text-acid-lime transition-colors" />
              </div>
              <p className="text-xs font-bold text-zinc-500 group-hover:text-acid-lime transition-colors text-center">Add Artist</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Artist Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[200] bg-zinc-950/95 backdrop-blur-3xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
          {/* Header & Search */}
          <div className="sticky top-0 w-full pt-12 pb-8 px-4 md:px-8 bg-gradient-to-b from-black via-black/80 to-transparent z-20">
            <div className="flex flex-col gap-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-acid-lime font-black tracking-widest uppercase text-sm md:text-base">Curate your vibe</h2>
                <button 
                  onClick={() => setIsAdding(false)} 
                  className="p-3 bg-white/5 hover:bg-acid-lime hover:text-black rounded-full transition-all group shadow-xl"
                >
                  <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
              </div>
              <div className="relative flex-1 group">
                <input
                  type="text"
                  autoFocus
                  value={newArtist}
                  onChange={e => setNewArtist(e.target.value)}
                  placeholder="Who are you listening to?"
                  className="w-full bg-transparent border-b-4 border-white/10 hover:border-white/30 focus:border-acid-lime text-3xl md:text-5xl text-white font-black placeholder-zinc-700 outline-none py-4 md:py-6 transition-all"
                />
                <div className="absolute bottom-0 left-0 h-1 bg-acid-lime w-0 group-focus-within:w-full transition-all duration-500 ease-out"></div>
              </div>
            </div>
          </div>
          
          {/* Results Grid */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32 custom-scrollbar">
            <div className="max-w-5xl mx-auto mt-4">
              {searchResults.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
                  {searchResults.map((artist) => (
                    <div
                      key={artist.id}
                      onClick={() => handleSelectArtist(artist.name)}
                      className="group flex flex-col items-center gap-3 cursor-pointer"
                    >
                      <div className="w-full aspect-square rounded-full overflow-hidden bg-white/5 border-2 border-transparent group-hover:border-acid-lime transition-all shadow-lg group-hover:shadow-[0_0_20px_rgba(163,230,53,0.3)]">
                        <img 
                          src={artist.image} 
                          alt={artist.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        />
                      </div>
                      <span className="text-white font-bold text-sm text-center line-clamp-2 px-1 group-hover:text-acid-lime transition-colors">
                        {artist.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {searchResults.length === 0 && newArtist.length > 1 && (
                <div className="flex flex-col items-center justify-center mt-20 text-zinc-500 animate-pulse">
                  <div className="w-12 h-12 border-4 border-acid-lime border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-bold">Searching the global catalog...</p>
                </div>
              )}

              {searchResults.length === 0 && newArtist.length <= 1 && (
                <div className="flex flex-col items-center justify-center mt-32 text-zinc-600">
                  <User className="w-20 h-20 mb-4 opacity-50" />
                  <p className="text-lg font-medium text-center">Type an artist name<br/>to start exploring.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
