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
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col pt-12 px-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setIsAdding(false)} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
            <input
              type="text"
              autoFocus
              value={newArtist}
              onChange={e => setNewArtist(e.target.value)}
              placeholder="Search for an artist..."
              className="flex-1 bg-transparent border-b-2 border-zinc-700 focus:border-acid-lime text-2xl text-white font-bold placeholder-zinc-600 outline-none pb-2 transition-colors"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pb-20 custom-scrollbar">
            {searchResults.map((artist) => (
              <div
                key={artist.id}
                onClick={() => handleSelectArtist(artist.name)}
                className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
              >
                <img src={artist.image} alt={artist.name} className="w-14 h-14 rounded-full object-cover shadow-lg" />
                <span className="text-white font-bold text-lg">{artist.name}</span>
              </div>
            ))}
            {searchResults.length === 0 && newArtist.length > 1 && (
              <div className="text-center text-zinc-500 mt-10">Searching artists...</div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
