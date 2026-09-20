import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Shuffle, Clock, ChevronLeft, Download, Plus, CheckCircle2 } from 'lucide-react';
import type { TabType } from './BottomNav';
import { downloadTrack } from '../services/downloadService';

interface PlaylistViewProps {
  playlistId: string;
  setActiveTab: (tab: TabType) => void;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({ playlistId, setActiveTab }) => {
  const savedPlaylists = usePlayerStore(state => state.savedPlaylists);
  const playTrack = usePlayerStore(state => state.playTrack);
  const setQueue = usePlayerStore(state => state.setQueue);
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);

  const playlist = savedPlaylists.find(p => p.id === playlistId);

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
        <p>Playlist not found</p>
        <button onClick={() => setActiveTab('home')} className="mt-4 text-purple-400 font-bold hover:underline">
          Go Home
        </button>
      </div>
    );
  }

  const handleShuffle = () => {
    if (playlist.tracks.length === 0) return;
    const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    playTrack(shuffled[0]);
  };

  const totalDuration = playlist.tracks.reduce((acc, track) => acc + (track.duration || 0), 0);
  const formattedDuration = totalDuration > 0 
    ? `${Math.floor(totalDuration / 60)} min`
    : `${playlist.tracks.length * 3} min est`;

  const handleDownloadPlaylist = async () => {
    if (isDownloading || playlist.tracks.length === 0) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    let successCount = 0;
    
    for (let i = 0; i < playlist.tracks.length; i++) {
      const track = playlist.tracks[i];
      if (track.source === 'saavn' && !track.isOffline) {
        const success = await downloadTrack(track);
        if (success) {
           usePlayerStore.setState(state => ({
              savedPlaylists: state.savedPlaylists.map(p => 
                p.id === playlist.id 
                  ? { ...p, tracks: p.tracks.map(t => t.id === track.id ? { ...t, isOffline: true } : t) }
                  : p
              )
           }));
        }
      }
      successCount++;
      setDownloadProgress(Math.floor((successCount / playlist.tracks.length) * 100));
    }
    
    setTimeout(() => {
      setIsDownloading(false);
      setDownloadProgress(0);
    }, 2000);
  };

  return (
    <div className="h-full flex flex-col bg-obsidian">
      {/* Header */}
      <div className="relative pt-16 pb-8 px-6 bg-gradient-to-b from-purple-900/40 to-obsidian">
        <button 
          onClick={() => setActiveTab('home')}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-end mt-4 text-center md:text-left">
          <div className="relative w-32 h-32 md:w-48 md:h-48 shrink-0 rounded-2xl overflow-hidden shadow-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            {playlist.tracks[0] ? (
              <img src={playlist.tracks[0].thumbnail} alt="Cover" className="w-full h-full object-cover blur-sm scale-110" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600" />
            )}
            <div className="absolute inset-0 bg-black/20" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
              {playlist.tracks.slice(0, 4).map((t, i) => (
                <img key={i} src={t.thumbnail} className="w-full h-full object-cover" alt="" />
              ))}
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Playlist</h4>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4 line-clamp-2">
              {playlist.name}
            </h1>
            <p className="text-sm font-medium text-zinc-300">
              {playlist.tracks.length} tracks • <span className="text-zinc-500">{formattedDuration}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 flex items-center gap-4 border-b border-white/5">
        <button 
          onClick={handleShuffle}
          className="flex-1 py-3.5 rounded-full bg-acid-lime text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(163,230,53,0.3)]"
        >
          <Shuffle className="w-4 h-4" />
          Shuffle & Play
        </button>
        <button 
          onClick={handleDownloadPlaylist}
          disabled={isDownloading}
          className={`flex-1 py-3.5 rounded-full font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all border ${isDownloading ? 'bg-white/5 border-acid-lime/30 text-acid-lime' : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] active:scale-95'}`}
        >
          {isDownloading ? (
             <>
               <span className="animate-pulse">Downloading {downloadProgress}%</span>
             </>
          ) : (
             <>
               <Download className="w-4 h-4" />
               Download All
             </>
          )}
        </button>
      </div>

      {/* Tracklist */}
      <div className="flex-1 overflow-y-auto px-6 py-4 pb-32">
        <div className="space-y-1">
          {playlist.tracks.map((track, idx) => {
            const isPlayingThis = currentTrack?.id === track.id;
            
            return (
              <div 
                key={`${track.id}-${idx}`}
                onClick={() => {
                  setQueue(playlist.tracks);
                  playTrack(track);
                }}
                className={`group flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer ${
                  isPlayingThis ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <span className={`text-xs font-bold w-6 text-right ${isPlayingThis ? 'text-acid-lime' : 'text-zinc-500 group-hover:text-white'}`}>
                  {isPlayingThis ? <Play className="w-3 h-3 fill-acid-lime inline-block" /> : idx + 1}
                </span>
                
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 shrink-0">
                  <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${isPlayingThis ? 'text-acid-lime' : 'text-white'}`}>
                    {track.title}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
                </div>
                
                {track.duration && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 font-mono shrink-0 mr-4">
                    <Clock className="w-3 h-3" />
                    {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                  </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      usePlayerStore.getState().openAddToPlaylistModal(track);
                    }}
                    className="p-2 rounded-full hover:bg-white/10 transition text-zinc-500 hover:text-acid-lime"
                    title="Add to Playlist"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  {track.source === 'saavn' && (
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!track.isOffline) {
                           const success = await downloadTrack(track);
                           if (success) {
                             usePlayerStore.setState(state => ({
                                savedPlaylists: state.savedPlaylists.map(p => 
                                  p.id === playlist.id 
                                    ? { ...p, tracks: p.tracks.map(t => t.id === track.id ? { ...t, isOffline: true } : t) }
                                    : p
                                )
                             }));
                           }
                        }
                      }}
                      className={`p-2 rounded-full transition ${track.isOffline ? 'text-acid-lime hover:bg-acid-lime/10' : 'text-zinc-500 hover:text-cyber-cyan hover:bg-white/10'}`}
                      title="Download Offline"
                    >
                      {track.isOffline ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
