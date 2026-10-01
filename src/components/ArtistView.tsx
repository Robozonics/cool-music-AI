import React, { useEffect, useState } from 'react';
import { Play, Heart, Plus, Loader2, ArrowLeft, ListPlus } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { searchUnblocked } from '../services/unblockedMusicService';
import type { Track } from '../types/music';

interface ArtistViewProps {
  artistName: string;
  setActiveTab: (tab: any) => void;
}

export const ArtistView: React.FC<ArtistViewProps> = ({ artistName, setActiveTab }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const playTrack = usePlayerStore(state => state.playTrack);
  const setQueue = usePlayerStore(state => state.setQueue);
  const likedTracks = usePlayerStore(state => state.likedTracks);
  const toggleLikeTrack = usePlayerStore(state => state.toggleLikeTrack);

  useEffect(() => {
    const fetchArtistTracks = async () => {
      setIsLoading(true);
      try {
        const results = await searchUnblocked(`${artistName} top songs`);
        setTracks(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArtistTracks();
  }, [artistName]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      setQueue(tracks);
      playTrack(tracks[0]);
    }
  };

  const handleCreatePlaylist = () => {
    const pId = usePlayerStore.getState().savePlaylist(`${artistName} Mix`, tracks);
    setActiveTab(`playlist:${pId}`);
  };

  const filteredTracks = tracks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.artist.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="w-full bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="relative w-full h-64 md:h-80 bg-zinc-900 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/50 to-transparent z-10" />
        {tracks.length > 0 && (
          <img 
            src={tracks[0].thumbnail.replace('150x150', '500x500')} 
            className="w-full h-full object-cover opacity-50"
            alt={artistName}
          />
        )}
        <div className="absolute bottom-6 left-4 md:left-8 z-20 flex flex-col">
          <button onClick={() => setActiveTab('home')} className="mb-4 p-2 bg-white/10 rounded-full w-max hover:bg-white/20 transition-all">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white drop-shadow-xl">{artistName}</h1>
          <p className="text-zinc-300 mt-2 font-bold tracking-widest text-sm uppercase">Artist Spotlight</p>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        {/* Action Buttons & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 w-full md:w-auto">
            <button onClick={handlePlayAll} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-acid-lime text-black font-black uppercase tracking-widest text-sm rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(163,230,53,0.3)]">
              <Play className="w-4 h-4 fill-black" /> Play All
            </button>
            <button onClick={handleCreatePlaylist} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-widest text-sm rounded-full hover:bg-white/20 transition-all border border-white/10">
              <ListPlus className="w-4 h-4" /> Save Playlist
            </button>
          </div>
          
          <input
            type="text"
            placeholder={`Search ${artistName} songs...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-full text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-acid-lime transition-colors"
          />
        </div>

        {/* Tracks List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-acid-lime" />
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            {filteredTracks.map((track, i) => (
              <div 
                key={track.id}
                className="group flex items-center p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10"
                onClick={() => {
                  setQueue(filteredTracks);
                  playTrack(track);
                }}
              >
                <div className="w-8 text-center text-zinc-500 text-sm font-bold group-hover:hidden">{i + 1}</div>
                <div className="w-8 flex justify-center hidden group-hover:flex">
                   <Play className="w-4 h-4 text-acid-lime fill-current" />
                </div>
                
                <img src={track.thumbnail} className="w-12 h-12 rounded-lg object-cover ml-2 mr-4" alt="" />
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate text-base">{track.title}</h3>
                  <p className="text-zinc-400 text-sm truncate">{track.artist}</p>
                </div>

                <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLikeTrack(track); }}
                    className="p-2 text-zinc-400 hover:text-pink-500 transition-colors"
                  >
                    <Heart className={`w-5 h-5 ${likedTracks.includes(track.id) ? 'fill-pink-500 text-pink-500' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); usePlayerStore.getState().openAddToPlaylistModal(track); }}
                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            
            {filteredTracks.length === 0 && (
              <div className="text-center py-10 text-zinc-500">
                No songs found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
