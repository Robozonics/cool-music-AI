import React, { useState, useEffect } from 'react';
import { Plus, X, User } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { searchUnblocked } from '../services/unblockedMusicService';
import type { Track } from '../types/music';

interface ArtistBubbleProps {
  artist: string;
  onSearchArtist: (artist: string) => void;
  removeFavoriteArtist: (artist: string) => void;
}

const ArtistBubble: React.FC<ArtistBubbleProps> = ({ artist, onSearchArtist, removeFavoriteArtist }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    searchUnblocked(`${artist} best songs`).then((res: Track[]) => {
      if (mounted && res.length > 0) {
        setImageUrl(res[0].thumbnail.replace('150x150', '500x500'));
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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newArtist.trim()) {
      addFavoriteArtist(newArtist.trim());
      setNewArtist('');
      setIsAdding(false);
    }
  };

  return (
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
        
        {/* Add Artist Button */}
        <div className="shrink-0 snap-center">
          {isAdding ? (
            <form onSubmit={handleAdd} className="flex flex-col items-center gap-2 w-24">
              <input
                type="text"
                autoFocus
                value={newArtist}
                onChange={e => setNewArtist(e.target.value)}
                onBlur={() => {
                  if (!newArtist.trim()) setIsAdding(false);
                }}
                placeholder="Artist..."
                className="w-full px-2 py-2 bg-white/5 border border-white/20 rounded-xl text-xs text-center text-white placeholder-zinc-500 focus:outline-none focus:border-acid-lime"
              />
              <div className="flex gap-1 w-full">
                 <button type="submit" className="flex-1 bg-acid-lime text-black rounded-lg py-1.5 text-[10px] font-bold">Add</button>
                 <button type="button" onMouseDown={(e) => { e.preventDefault(); setIsAdding(false); }} className="flex-1 bg-white/10 text-white rounded-lg py-1.5 text-[10px] font-bold">Close</button>
              </div>
            </form>
          ) : (
            <div
              onClick={() => setIsAdding(true)}
              className="flex flex-col items-center gap-2 cursor-pointer group w-20 md:w-24"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-white/5 flex items-center justify-center border-2 border-dashed border-white/20 group-hover:border-acid-lime group-hover:bg-acid-lime/10 transition-all">
                <Plus className="w-8 h-8 text-zinc-400 group-hover:text-acid-lime transition-colors" />
              </div>
              <p className="text-xs font-bold text-zinc-500 group-hover:text-acid-lime transition-colors text-center">Add Artist</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
