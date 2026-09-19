import React from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Shuffle, Clock, ChevronLeft } from 'lucide-react';
import type { TabType } from './BottomNav';

interface PlaylistViewProps {
  playlistId: string;
  setActiveTab: (tab: TabType) => void;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({ playlistId, setActiveTab }) => {
  const savedPlaylists = usePlayerStore(state => state.savedPlaylists);
  const playTrack = usePlayerStore(state => state.playTrack);
  const setQueue = usePlayerStore(state => state.setQueue);
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);

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

  const handlePlayAll = () => {
    if (playlist.tracks.length === 0) return;
    setQueue(playlist.tracks);
    playTrack(playlist.tracks[0]);
  };

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
        
        <div className="flex flex-col md:flex-row gap-6 items-end mt-4">
          <div className="w-32 h-32 md:w-48 md:h-48 shrink-0 rounded-2xl overflow-hidden shadow-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            {playlist.tracks[0] ? (
              <img src={playlist.tracks[0].thumbnail} alt="Cover" className="w-full h-full object-cover blur-sm scale-110" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600" />
            )}
            <div className="absolute inset-0 bg-black/20 flex flex-wrap" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
              {playlist.tracks.slice(0, 4).map((t, i) => (
                <img key={i} src={t.thumbnail} className="w-full h-full object-cover" alt="" />
              ))}
            </div>
          </div>
          
          <div className="flex-1">
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
          onClick={handlePlayAll}
          className="w-14 h-14 rounded-full bg-acid-lime text-black flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_20px_rgba(163,230,53,0.3)]"
        >
          <Play className="w-6 h-6 ml-1 fill-black" />
        </button>
        <button 
          onClick={handleShuffle}
          className="px-6 h-14 rounded-full bg-white/10 text-white font-bold tracking-wide flex items-center gap-2 hover:bg-white/20 transition-colors"
        >
          <Shuffle className="w-5 h-5" />
          Shuffle
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
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono shrink-0">
                    <Clock className="w-3 h-3" />
                    {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
