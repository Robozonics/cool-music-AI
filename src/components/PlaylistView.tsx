import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Clock, ChevronLeft, Download, Plus, CheckCircle2 } from 'lucide-react';
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
          <div className="relative w-56 h-56 md:w-64 md:h-64 shrink-0 rounded-md overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-white/5 border border-white/10 flex items-center justify-center">
            {playlist.tracks[0] ? (
              <img src={playlist.tracks[0].thumbnail} alt="Cover" className="w-full h-full object-cover blur-md scale-125 opacity-40" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600" />
            )}
            <div className="absolute inset-0" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
              {playlist.tracks.slice(0, 4).map((t, i) => (
                <img key={i} src={t.thumbnail} className="w-full h-full object-cover" alt="" />
              ))}
            </div>
          </div>
          
          <div className="flex-1 w-full mt-4 md:mt-0">
            <h4 className="hidden md:block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Playlist</h4>
            <h1 className="text-3xl md:text-7xl font-black text-white tracking-tighter mb-2 md:mb-6 line-clamp-2">
              {playlist.name}
            </h1>
            <p className="text-sm font-medium text-zinc-300 flex items-center justify-center md:justify-start gap-2">
              <span className="font-bold">You</span> • {playlist.tracks.length} tracks • <span className="text-zinc-400">{formattedDuration}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-obsidian sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleDownloadPlaylist}
            disabled={isDownloading}
            className={`p-2 rounded-full transition-all border border-transparent ${isDownloading ? 'text-acid-lime' : 'text-zinc-400 hover:text-white'}`}
          >
            {isDownloading ? (
               <span className="animate-pulse text-xs font-bold">Downloading {downloadProgress}%</span>
            ) : (
               <Download className="w-7 h-7" />
            )}
          </button>
          <button className="p-2 rounded-full text-zinc-400 hover:text-white transition-all">
             <Plus className="w-8 h-8" />
          </button>
        </div>
        
        <button 
          onClick={handleShuffle}
          className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-acid-lime text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_8px_30px_rgba(163,230,53,0.3)]"
        >
          <Play className="w-6 h-6 md:w-7 md:h-7 ml-1 fill-black" />
        </button>
      </div>

      {/* Tracklist */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 pb-32">
        <div className="space-y-1 md:space-y-2">
          {playlist.tracks.map((track, idx) => {
            const isPlayingThis = currentTrack?.id === track.id;
            
            return (
              <div 
                key={`${track.id}-${idx}`}
                onClick={() => {
                  setQueue(playlist.tracks);
                  playTrack(track);
                }}
                className={`group flex items-center gap-3 md:gap-4 py-2 md:p-3 rounded-none md:rounded-xl transition-all cursor-pointer ${
                  isPlayingThis ? 'bg-white/5 md:bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <span className={`hidden md:block text-xs font-bold w-6 text-right ${isPlayingThis ? 'text-acid-lime' : 'text-zinc-500 group-hover:text-white'}`}>
                  {isPlayingThis ? <Play className="w-3 h-3 fill-acid-lime inline-block" /> : idx + 1}
                </span>
                
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-sm md:rounded-md overflow-hidden bg-white/10 shrink-0 relative">
                  <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                  {isPlayingThis && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center md:hidden">
                       <Play className="w-5 h-5 fill-acid-lime text-acid-lime" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-base font-medium truncate ${isPlayingThis ? 'text-acid-lime' : 'text-white'}`}>
                    {track.title}
                  </p>
                  <p className="text-sm text-zinc-400 truncate">{track.artist}</p>
                </div>
                
                {track.duration && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 font-mono shrink-0 mr-4">
                    <Clock className="w-3 h-3" />
                    {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                  </div>
                )}

                <div className="flex items-center gap-1 md:gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      usePlayerStore.getState().openAddToPlaylistModal(track);
                    }}
                    className="p-3 md:p-2 rounded-full hover:bg-white/10 transition text-zinc-400 hover:text-white"
                    title="Add to Playlist"
                  >
                    <Plus className="w-5 h-5 md:w-4 md:h-4" />
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
                      className={`p-3 md:p-2 rounded-full transition ${track.isOffline ? 'text-acid-lime hover:bg-acid-lime/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
                      title="Download Offline"
                    >
                      {track.isOffline ? <CheckCircle2 className="w-5 h-5 md:w-4 md:h-4" /> : <Download className="w-5 h-5 md:w-4 md:h-4" />}
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
