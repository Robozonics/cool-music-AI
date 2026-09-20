import React, { useEffect, useState } from 'react';
import { Play, Trash2, HardDrive, Plus, ListMusic } from 'lucide-react';
import { getOfflineTracks, deleteOfflineTrack } from '../services/downloadService';
import type { Track } from '../types/music';
import { usePlayerStore } from '../store/usePlayerStore';

interface OfflineVaultProps {
  setActiveTab?: (tab: string) => void;
}

export const OfflineVault: React.FC<OfflineVaultProps> = ({ setActiveTab }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const savedPlaylists = usePlayerStore(state => state.savedPlaylists);
  const playTrack = usePlayerStore(state => state.playTrack);
  const setQueue = usePlayerStore(state => state.setQueue);

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    const offlineTracks = await getOfflineTracks();
    setTracks(offlineTracks);
  };

  const handlePlay = (track: Track) => {
    setQueue(tracks);
    playTrack(track);
  };

  const handleDelete = async (trackId: string) => {
    if (confirm('Are you sure you want to delete this track from your device?')) {
      await deleteOfflineTrack(trackId);
      loadTracks();
    }
  };

  return (
    <div className="p-4 pt-8 w-full max-w-2xl mx-auto min-h-full pb-32">
      <div className="flex items-center space-x-4 mb-8 pl-2">
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
          <HardDrive className="w-6 h-6 text-cyber-cyan" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Library & Vault</h2>
          <p className="text-gray-400">Your saved playlists and offline tracks.</p>
        </div>
      </div>

      {savedPlaylists.length > 0 && (
        <div className="mb-10">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 pl-2">Your Playlists</h3>
          <div className="flex flex-col space-y-2">
            {savedPlaylists.map(playlist => (
              <div 
                key={playlist.id} 
                onClick={() => setActiveTab?.(`playlist:${playlist.id}`)}
                className="flex items-center gap-4 p-2 md:p-3 bg-transparent hover:bg-white/5 rounded-xl transition cursor-pointer group"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden bg-white/10 shrink-0 flex items-center justify-center relative shadow-md">
                   {playlist.tracks[0] ? (
                     <div className="absolute inset-0" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
                        {playlist.tracks.slice(0, 4).map((t, i) => (
                          <img key={i} src={t.thumbnail} className="w-full h-full object-cover" alt="" />
                        ))}
                     </div>
                   ) : (
                     <ListMusic className="w-8 h-8 text-white/50" />
                   )}
                   <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-base md:text-lg truncate mb-1">{playlist.name}</h4>
                  <p className="text-gray-400 text-sm font-medium">Playlist • {playlist.tracks.length} tracks</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 pl-2">Offline Tracks</h3>

      {tracks.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p>Your vault is empty.</p>
          <p className="text-sm mt-2">Download tracks from Search to listen offline.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tracks.map((track) => (
            <div key={track.id} className="flex items-center p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition group">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
                <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                <button 
                  onClick={() => handlePlay(track)}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Play className="w-6 h-6 text-cyber-cyan fill-cyber-cyan" />
                </button>
              </div>
              
              <div className="ml-4 flex-1 min-w-0">
                <h4 className="text-white font-bold truncate">{track.title}</h4>
                <p className="text-gray-400 text-sm truncate">{track.artist}</p>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    usePlayerStore.getState().openAddToPlaylistModal(track);
                  }}
                  className="p-3 text-gray-500 hover:text-acid-lime transition-colors"
                  title="Add to Playlist"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(track.id)}
                  className="p-3 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
