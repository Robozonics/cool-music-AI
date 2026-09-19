import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Play, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { generateAIPlaylist } from '../services/geminiService';
import { usePlayerStore } from '../store/usePlayerStore';
import type { Track, PlaylistSegment } from '../types/music';

interface AIPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPlaylist?: (id: string) => void;
}

const SEGMENT_META: Record<PlaylistSegment, { label: string; color: string; bg: string; desc: string }> = {
  foundation: {
    label: 'Foundation',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10 border-cyan-400/25',
    desc: 'Locked-in vibe',
  },
  peak: {
    label: 'Peak',
    color: 'text-pink-400',
    bg: 'bg-pink-400/10 border-pink-400/25',
    desc: 'Energy surge',
  },
  cooldown: {
    label: 'Cooldown',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10 border-purple-400/25',
    desc: 'Wind-down',
  },
};

const CURVE_SEGMENTS = [
  { segment: 'foundation' as PlaylistSegment, label: 'Foundation', range: '1–5', icon: '🎯' },
  { segment: 'peak' as PlaylistSegment, label: 'Peak Energy', range: '6–20', icon: '⚡' },
  { segment: 'cooldown' as PlaylistSegment, label: 'Cooldown', range: '21–30', icon: '🌙' },
];

export const AIPlaylistModal: React.FC<AIPlaylistModalProps> = ({ isOpen, onClose, onNavigateToPlaylist }) => {
  const playTrack = usePlayerStore(state => state.playTrack);
  const setQueue = usePlayerStore(state => state.setQueue);

  const [seedArtist, setSeedArtist] = useState('');
  const [seedSong, setSeedSong] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedTracks, setGeneratedTracks] = useState<Track[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [phase, setPhase] = useState<'input' | 'generating' | 'results'>('input');

  const handleGenerate = useCallback(async () => {
    if (!seedArtist.trim() || !seedSong.trim()) return;
    setError(null);
    setIsLoading(true);
    setPhase('generating');
    setProgress(0);
    setProgressMsg('Initialising…');

    try {
      const tracks = await generateAIPlaylist(
        { artist: seedArtist.trim(), song: seedSong.trim() },
        customPrompt.trim() || undefined,
        (pct, msg) => {
          setProgress(pct);
          setProgressMsg(msg);
        }
      );
      setGeneratedTracks(tracks);
      setSelectedTrackIds(new Set(tracks.map(t => t.id)));
      setPhase('results');
    } catch (err: any) {
      setError(err.message || 'Generation failed. Please try again.');
      setPhase('input');
    } finally {
      setIsLoading(false);
    }
  }, [seedArtist, seedSong]);

  const handleLoadAndPlay = () => {
    const tracksToPlay = generatedTracks.filter(t => selectedTrackIds.has(t.id));
    if (tracksToPlay.length === 0) return;
    setQueue(tracksToPlay);
    playTrack(tracksToPlay[0]);
    onClose();
  };

  const handleSavePlaylist = () => {
    const tracksToSave = generatedTracks.filter(t => selectedTrackIds.has(t.id));
    if (tracksToSave.length === 0 || !playlistName.trim()) return;
    const newId = usePlayerStore.getState().savePlaylist(playlistName.trim(), tracksToSave);
    setIsSaving(false);
    setPlaylistName('');
    onClose();
    if (onNavigateToPlaylist) {
      onNavigateToPlaylist(newId);
    }
  };

  const handleReset = () => {
    setPhase('input');
    setGeneratedTracks([]);
    setSelectedTrackIds(new Set());
    setError(null);
    setProgress(0);
    setIsSaving(false);
    setPlaylistName('');
  };

  const foundationTracks = generatedTracks.filter(t => t.segment === 'foundation');
  const peakTracks = generatedTracks.filter(t => t.segment === 'peak');
  const cooldownTracks = generatedTracks.filter(t => t.segment === 'cooldown');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="relative w-full max-w-lg bg-gradient-to-b from-[#0e0920] via-[#0a0615] to-[#060210] border border-purple-500/20 rounded-3xl shadow-[0_0_80px_rgba(139,92,246,0.35)] overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/5 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.6)]">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="font-black text-white text-lg tracking-tight">AI Playlist Generator</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-zinc-500">Bell-curve sequenced · 30 tracks · AI-curated</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <AnimatePresence mode="wait">
                {/* ── Input Phase ── */}
                {phase === 'input' && (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-6 space-y-5"
                  >
                    {/* Bell curve visualisation */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {CURVE_SEGMENTS.map(seg => (
                        <div key={seg.segment} className={`p-3 rounded-2xl border text-center ${SEGMENT_META[seg.segment].bg}`}>
                          <div className="text-2xl mb-1">{seg.icon}</div>
                          <p className={`text-xs font-bold ${SEGMENT_META[seg.segment].color}`}>{seg.label}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">Tracks {seg.range}</p>
                        </div>
                      ))}
                    </div>

                    {/* Seed inputs */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Seed Artist</label>
                        <input
                          type="text"
                          placeholder="e.g. The Weeknd"
                          value={seedArtist}
                          onChange={e => setSeedArtist(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-purple-500/60 focus:bg-purple-500/5 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Seed Song</label>
                        <input
                          type="text"
                          placeholder="e.g. Blinding Lights"
                          value={seedSong}
                          onChange={e => setSeedSong(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-purple-500/60 focus:bg-purple-500/5 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Additional Instructions (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Only 10 tracks, high energy"
                          value={customPrompt}
                          onChange={e => setCustomPrompt(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-purple-500/60 focus:bg-purple-500/5 transition-all"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/25 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-red-300 text-xs">{error}</p>
                      </div>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleGenerate}
                      disabled={!seedArtist.trim() || !seedSong.trim() || isLoading}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-violet-600 hover:from-purple-500 hover:via-pink-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black tracking-wide text-sm shadow-[0_0_30px_rgba(139,92,246,0.4)] transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate 30-Track Playlist
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                )}

                {/* ── Generating Phase ── */}
                {phase === 'generating' && (
                  <motion.div
                    key="generating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-6 flex flex-col items-center justify-center gap-6 min-h-[300px]"
                  >
                    <div className="relative w-24 h-24">
                      {/* Pulsing rings */}
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="absolute inset-0 rounded-full border-2 border-purple-500/40"
                          animate={{ scale: [1, 1.5 + i * 0.3], opacity: [0.6, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
                        />
                      ))}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.6)]">
                        <Sparkles className="w-10 h-10 text-white" />
                      </div>
                    </div>

                    <div className="text-center space-y-2 w-full max-w-xs">
                      <p className="text-white font-bold text-base">{progressMsg || 'Building your playlist…'}</p>

                      {/* Progress bar */}
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-lime-400 rounded-full"
                          animate={{ width: `${progress}%` }}
                          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                        />
                      </div>
                      <p className="text-zinc-500 text-xs font-mono">{progress}%</p>
                    </div>

                    {/* Segment progress indicators */}
                    <div className="grid grid-cols-3 gap-2 w-full">
                      {CURVE_SEGMENTS.map((seg, idx) => {
                        const active = progress >= [5, 35, 70][idx];
                        return (
                          <div key={seg.segment} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-xs transition-all duration-500 ${active ? SEGMENT_META[seg.segment].bg : 'border-white/5 bg-transparent'}`}>
                            <span>{seg.icon}</span>
                            <span className={active ? SEGMENT_META[seg.segment].color : 'text-zinc-600'}>{seg.label}</span>
                            {active && <Loader2 className={`w-3 h-3 ml-auto animate-spin ${SEGMENT_META[seg.segment].color}`} />}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* ── Results Phase ── */}
                {phase === 'results' && (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 space-y-4"
                  >
                    {/* Summary pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">{generatedTracks.length} tracks for <span className="text-purple-400">"{seedSong}"</span></span>
                      {[foundationTracks, peakTracks, cooldownTracks].map((arr, idx) => {
                        const seg = ['foundation', 'peak', 'cooldown'][idx] as PlaylistSegment;
                        const meta = SEGMENT_META[seg];
                        return arr.length > 0 ? (
                          <span key={seg} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
                            {arr.length} {meta.label}
                          </span>
                        ) : null;
                      })}
                    </div>

                    {/* Track list */}
                    <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1 no-scrollbar">
                      {generatedTracks.map((track, i) => {
                        const seg = track.segment ?? 'peak';
                        const meta = SEGMENT_META[seg];
                        return (
                          <motion.div
                            key={track.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              selectedTrackIds.has(track.id)
                                ? 'bg-white/10 border-purple-500/30'
                                : 'bg-white/3 border-transparent opacity-50'
                            }`}
                            onClick={() => {
                              const newSet = new Set(selectedTrackIds);
                              if (newSet.has(track.id)) newSet.delete(track.id);
                              else newSet.add(track.id);
                              setSelectedTrackIds(newSet);
                            }}
                          >
                            <input 
                              type="checkbox" 
                              checked={selectedTrackIds.has(track.id)} 
                              readOnly 
                              className="w-4 h-4 rounded border-white/20 bg-black/20 text-purple-500 focus:ring-0 cursor-pointer"
                            />
                            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-md">
                              <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-bold truncate group-hover:text-purple-300 transition-colors">{track.title}</p>
                              <p className="text-zinc-500 text-[10px] truncate">{track.artist}</p>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${meta.bg} ${meta.color} shrink-0`}>
                              {meta.label}
                            </span>
                            <button 
                              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQueue([track]);
                                playTrack(track);
                              }}
                            >
                              <Play className="w-3 h-3 text-zinc-400" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer actions (results phase) */}
            {phase === 'results' && (
              <div className="px-6 py-4 border-t border-white/5 bg-[#060210] shrink-0 z-10">
                {isSaving ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Name this playlist..."
                      value={playlistName}
                      onChange={e => setPlaylistName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSavePlaylist()}
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => setIsSaving(false)}
                      className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white transition-colors text-sm font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePlaylist}
                      disabled={!playlistName.trim()}
                      className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg transition-colors"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={handleReset}
                      className="w-12 h-12 flex shrink-0 items-center justify-center rounded-2xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsSaving(true)}
                      className="flex-1 py-3 rounded-2xl border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all text-sm font-bold shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                    >
                      Save Playlist
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleLoadAndPlay}
                      className="flex-[1.5] py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-black shadow-[0_0_25px_rgba(139,92,246,0.4)] transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      Play Selected
                    </motion.button>
                  </div>
                )}
              </div>
            )}

            <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
