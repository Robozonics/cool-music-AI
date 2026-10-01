import React, { useState } from 'react';
import { Plus, X, User } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

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
    <div className="w-full">
      <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-zinc-500 mb-4">Your Artists</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar items-center">
        {favoriteArtists.map(artist => (
          <div
            key={artist}
            className="group relative flex flex-col items-center gap-2 shrink-0 snap-center cursor-pointer"
            onClick={() => onSearchArtist(artist)}
          >
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border-2 border-transparent group-hover:border-acid-lime transition-all shadow-lg group-hover:shadow-[0_0_20px_rgba(163,230,53,0.3)]">
              {/* Since we don't have artist images readily available without searching, we use a slick icon or text avatar */}
              <User className="w-8 h-8 text-zinc-500 group-hover:text-acid-lime transition-colors" />
            </div>
            <p className="text-xs font-bold text-white max-w-[80px] text-center truncate group-hover:text-acid-lime transition-colors">
              {artist}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFavoriteArtist(artist);
              }}
              className="absolute top-0 right-0 p-1.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 backdrop-blur-md"
              title="Remove artist"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        
        {/* Add Artist Button */}
        {isAdding ? (
          <form onSubmit={handleAdd} className="flex flex-col items-center gap-2 shrink-0 ml-2">
            <input
              type="text"
              autoFocus
              value={newArtist}
              onChange={e => setNewArtist(e.target.value)}
              onBlur={() => {
                if (!newArtist.trim()) setIsAdding(false);
              }}
              placeholder="Artist name..."
              className="w-32 px-3 py-2 bg-white/5 border border-white/20 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-acid-lime"
            />
            <div className="flex gap-2 w-full mt-1">
               <button type="submit" className="flex-1 bg-acid-lime text-black rounded-lg py-1 text-[10px] font-bold">Add</button>
               <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-white/10 text-white rounded-lg py-1 text-[10px] font-bold">Cancel</button>
            </div>
          </form>
        ) : (
          <div
            onClick={() => setIsAdding(true)}
            className="flex flex-col items-center gap-2 shrink-0 snap-center cursor-pointer group ml-2"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-white/5 flex items-center justify-center border-2 border-dashed border-white/20 group-hover:border-acid-lime group-hover:bg-acid-lime/10 transition-all">
              <Plus className="w-8 h-8 text-zinc-400 group-hover:text-acid-lime transition-colors" />
            </div>
            <p className="text-xs font-bold text-zinc-500 group-hover:text-acid-lime transition-colors">Add Artist</p>
          </div>
        )}
      </div>
    </div>
  );
};
