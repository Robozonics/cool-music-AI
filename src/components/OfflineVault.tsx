import React, { useEffect, useState } from 'react';
import { Play, Trash2, HardDrive } from 'lucide-react';
import { getOfflineTracks, deleteOfflineTrack } from '../services/downloadService';
import type { Track } from '../types/music';
import { usePlayerStore } from '../store/usePlayerStore';

export const OfflineVault: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
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
    <div className="p-4 pt-8 w-full max-w-2xl mx-auto h-full flex flex-col pb-32 overflow-y-auto">
      <div className="flex items-center space-x-4 mb-8 pl-2">
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
          <HardDrive className="w-6 h-6 text-cyber-cyan" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Offline Vault</h2>
          <p className="text-gray-400">Zero data required. Pure vibes.</p>
        </div>
      </div>

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

              <button 
                onClick={() => handleDelete(track.id)}
                className="p-3 text-gray-500 hover:text-red-500 transition-colors ml-4"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
