import React, { useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { X, Plus, ListMusic, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AddToPlaylistModal: React.FC = () => {
  const isOpen = usePlayerStore(state => state.isAddToPlaylistModalOpen);
  const track = usePlayerStore(state => state.trackToAddToPlaylist);
  const close = usePlayerStore(state => state.closeAddToPlaylistModal);
  const savedPlaylists = usePlayerStore(state => state.savedPlaylists);
  const addTrackToPlaylist = usePlayerStore(state => state.addTrackToPlaylist);
  const savePlaylist = usePlayerStore(state => state.savePlaylist);

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !track) return null;

  const handleAddToExisting = (playlistId: string, name: string) => {
    addTrackToPlaylist(playlistId, track);
    showSuccess(`Added to ${name}`);
  };

  const handleCreateNew = () => {
    if (!newPlaylistName.trim()) return;
    savePlaylist(newPlaylistName.trim(), [track]);
    showSuccess(`Added to new playlist: ${newPlaylistName.trim()}`);
    setNewPlaylistName('');
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
      close();
    }, 1500);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-[#121216] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-hidden relative flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-xl font-bold text-white tracking-tight">Add to Playlist</h2>
            <button
              onClick={close}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Success Overlay */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 z-10 bg-[#121216]/95 backdrop-blur flex flex-col items-center justify-center"
              >
                <CheckCircle2 className="w-16 h-16 text-acid-lime mb-4" />
                <p className="text-white font-bold text-lg text-center px-6">{successMsg}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
            {/* Create New */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Create New</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New playlist name..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-acid-lime/50 transition-colors"
                />
                <button
                  onClick={handleCreateNew}
                  disabled={!newPlaylistName.trim()}
                  className="px-4 bg-acid-lime text-black rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-transform"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Existing Playlists */}
            {savedPlaylists.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Your Playlists</p>
                <div className="space-y-2">
                  {savedPlaylists.map(playlist => (
                    <button
                      key={playlist.id}
                      onClick={() => handleAddToExisting(playlist.id, playlist.name)}
                      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all text-left group"
                    >
                      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        {playlist.tracks[0] ? (
                          <img src={playlist.tracks[0].thumbnail} className="w-full h-full object-cover rounded-lg" alt="" />
                        ) : (
                          <ListMusic className="w-6 h-6 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate group-hover:text-acid-lime transition-colors">{playlist.name}</p>
                        <p className="text-xs text-gray-500">{playlist.tracks.length} tracks</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
