import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Reorder, AnimatePresence, motion } from 'framer-motion';
import {
  X, Loader2, Waves, Sparkles, Disc, Crosshair, Upload, Search,
  Music, Plus, Check, Play, Pause,
  ChevronRight, ChevronLeft, GripVertical,
  Wand2, Key, Flame, Star
} from 'lucide-react';
import { useMashupStore } from '../store/useMashupStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { generateAiMashup } from '../services/mashupService';
import { searchUnblocked } from '../services/unblockedMusicService';
import type { Track } from '../types/music';

// ── Fake BPM/Key generator per track (visual only) ─────────────────
const getBpmForTrack = (id: string) => {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return 85 + (hash % 90); // 85–174 BPM range
};
const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const getKeyForTrack = (id: string) => {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const mode = hash % 2 === 0 ? 'maj' : 'min';
  return `${MUSICAL_KEYS[hash % 12]} ${mode}`;
};
const getEnergyForTrack = (id: string) => {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return 40 + (hash % 60); // 40–99%
};

// ── Waveform bar visualizer ──────────────────────────────────────────
const MiniWaveform: React.FC<{ trackId: string; isAnchor?: boolean; isPlaying?: boolean }> = ({
  trackId, isAnchor, isPlaying
}) => {
  const bars = Array.from({ length: 28 }, (_, i) => {
    const seed = (trackId.charCodeAt(i % trackId.length) + i * 7) % 100;
    return 15 + seed * 0.7;
  });
  return (
    <div className="flex items-center gap-[2px] h-8">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className={`w-[2px] rounded-full ${isAnchor ? 'bg-acid-lime' : 'bg-white/40'}`}
          style={{ height: `${Math.min(h, 100)}%` }}
          animate={isPlaying ? {
            scaleY: [1, 0.4 + Math.random() * 1.2, 1],
          } : { scaleY: 1 }}
          transition={{
            duration: 0.4 + (i % 5) * 0.1,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.03,
          }}
        />
      ))}
    </div>
  );
};

// ── DJ Deck Card ─────────────────────────────────────────────────────
const DeckCard: React.FC<{
  track: Track;
  index: number;
  isAnchor: boolean;
  onSetAnchor: () => void;
  onRemove: () => void;
  isGenerating: boolean;
}> = ({ track, index, isAnchor, onSetAnchor, onRemove, isGenerating }) => {
  const bpm = getBpmForTrack(track.id);
  const key = getKeyForTrack(track.id);
  const energy = getEnergyForTrack(track.id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.9, height: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`relative rounded-2xl overflow-hidden border transition-all duration-300 ${
        isAnchor
          ? 'border-acid-lime/60 bg-gradient-to-br from-acid-lime/10 via-black/60 to-black/80 shadow-[0_0_30px_rgba(204,255,0,0.15)]'
          : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/8'
      }`}
    >
      {/* Anchor badge */}
      {isAnchor && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-acid-lime to-transparent" />
      )}

      <div className="p-3 flex gap-3">
        {/* Drag handle */}
        <div className="flex items-center text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing shrink-0">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Deck number */}
        <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
          isAnchor ? 'bg-acid-lime text-black' : 'bg-white/10 text-white/60'
        }`}>
          {index + 1}
        </div>

        {/* Thumbnail */}
        <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden">
          <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
          {isAnchor && (
            <div className="absolute inset-0 bg-acid-lime/20 flex items-center justify-center">
              <Star className="w-4 h-4 text-acid-lime fill-acid-lime" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate leading-tight">{track.title}</p>
          <p className="text-xs text-gray-400 truncate">{track.artist}</p>
          {/* Waveform */}
          <div className="mt-1.5">
            <MiniWaveform trackId={track.id} isAnchor={isAnchor} />
          </div>
        </div>

        {/* Meta Stats */}
        <div className="shrink-0 flex flex-col gap-1 text-right">
          <div className="flex items-center gap-1 justify-end">
            <span className={`text-[10px] font-black tabular-nums ${isAnchor ? 'text-acid-lime' : 'text-cyan-400'}`}>
              {bpm}
            </span>
            <span className="text-[9px] text-gray-500 font-bold">BPM</span>
          </div>
          <div className="flex items-center gap-1 justify-end">
            <Key className="w-2.5 h-2.5 text-fuchsia-400" />
            <span className="text-[10px] font-bold text-fuchsia-300">{key}</span>
          </div>
          {/* Energy bar */}
          <div className="flex items-center gap-1 justify-end">
            <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isAnchor ? 'bg-acid-lime' : 'bg-orange-400'}`}
                style={{ width: `${energy}%` }}
              />
            </div>
            <Flame className="w-2.5 h-2.5 text-orange-400" />
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex flex-col gap-1">
          {!isAnchor && (
            <button
              onClick={onSetAnchor}
              disabled={isGenerating}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-gray-500 hover:text-cyan-400 transition-all"
              title="Set as Anchor (dictates key & BPM)"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onRemove}
            disabled={isGenerating}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ── Mashup Style Presets ──────────────────────────────────────────────
const MASHUP_STYLES = [
  { id: 'dj_blend', label: 'DJ Blend', emoji: '🎛️', description: 'Smooth beatmatch & crossfade', color: 'text-cyan-400' },
  { id: 'acapella_swap', label: 'Acapella Swap', emoji: '🎤', description: 'Vocals from one, beats from another', color: 'text-fuchsia-400' },
  { id: 'chopped', label: 'Chopped & Screwed', emoji: '🔪', description: 'Chop & pitch-shift sections', color: 'text-orange-400' },
  { id: 'layered', label: 'Layered Mix', emoji: '📦', description: 'All tracks simultaneously layered', color: 'text-acid-lime' },
  { id: 'transition', label: 'Radio Transition', emoji: '📻', description: 'Natural flow like a radio mix', color: 'text-blue-400' },
  { id: 'mashup_drop', label: 'Festival Drop', emoji: '💥', description: 'Epic build-ups and drops', color: 'text-red-400' },
];

// ── Main Component ─────────────────────────────────────────────────────
export const MashupStudioPanel: React.FC = () => {
  const {
    isOpen, setIsOpen, selectedTracks, anchorTrackId,
    status, progress, setStatus, removeTrack,
    setAnchorTrack, clearQueue, reorderTracks,
    step, targetCount, setStep, setTargetCount, addTrack
  } = useMashupStore();
  const { playTrack, setQueue, queue } = usePlayerStore();

  const [localTracks, setLocalTracks] = useState<Track[]>(selectedTracks);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(MASHUP_STYLES[0].id);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const previewAudio = useRef<HTMLAudioElement>(new Audio());

  useEffect(() => { setLocalTracks(selectedTracks); }, [selectedTracks]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUnblocked(searchQuery);
        setSearchResults(results.slice(0, 20));
      } catch (e) { console.error(e); }
      finally { setIsSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePreview = useCallback((track: Track) => {
    if (previewingId === track.id) {
      previewAudio.current.pause();
      setPreviewingId(null);
    } else {
      previewAudio.current.src = track.streamUrl;
      previewAudio.current.currentTime = 30;
      previewAudio.current.volume = 0.6;
      previewAudio.current.play().catch(() => {});
      setPreviewingId(track.id);
    }
  }, [previewingId]);

  useEffect(() => {
    previewAudio.current.onended = () => setPreviewingId(null);
    return () => { previewAudio.current.pause(); };
  }, []);

  if (!isOpen) return null;

  const isGenerating = status !== 'idle' && status !== 'complete' && status !== 'error';
  const canGenerate = selectedTracks.length === targetCount && targetCount !== null && !!anchorTrackId;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (selectedTracks.length >= (targetCount || 7)) return;
      const tempUrl = URL.createObjectURL(file);
      addTrack({
        id: `local-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Local Upload',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=500&auto=format&fit=crop',
        duration: 180,
        streamUrl: tempUrl,
        source: 'saavn',
        sourceBadge: 'Upload',
      });
    });
    if (e.target) e.target.value = '';
  };

  const handleGenerate = async () => {
    if (!canGenerate || !anchorTrackId) return;
    try {
      const generatedTrack = await generateAiMashup(selectedTracks, anchorTrackId);
      setQueue([generatedTrack, ...queue]);
      playTrack(generatedTrack);
      setStatus('idle');
      clearQueue();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  // ── Status Bar ──────────────────────────────────────────────────────
  const renderStatus = () => {
    if (status === 'idle') return null;
    if (status === 'error') return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
        <X className="w-4 h-4 shrink-0" />
        Generation failed. Please try again.
      </div>
    );

    const stages = [
      { key: 'extracting', label: 'Extracting Stems (Demucs v4)', icon: <Waves className="w-4 h-4 text-cyan-400" />, pct: 33 },
      { key: 'syncing', label: 'Beatmatching & Key Syncing', icon: <Crosshair className="w-4 h-4 animate-spin text-fuchsia-400" />, pct: 66 },
      { key: 'mastering', label: 'Mastering & Mixdown', icon: <Disc className="w-4 h-4 animate-spin text-acid-lime" />, pct: 95 },
    ];
    const stage = stages.find(s => s.key === status) || stages[0];

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          {stage.icon}
          <span>{stage.label}</span>
        </div>
        {/* Stage indicators */}
        <div className="flex gap-1.5">
          {stages.map((s, i) => (
            <div key={s.key} className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              stages.findIndex(x => x.key === status) >= i ? 'bg-acid-lime' : 'bg-white/10'
            }`} />
          ))}
        </div>
        <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-acid-lime to-cyan-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.5 }}
          />
        </div>
        <p className="text-right text-xs text-gray-500 font-mono">{progress}%</p>
      </div>
    );
  };

  // ── Step 1: Select Count ──────────────────────────────────────────
  const renderSelectCount = () => (
    <div className="flex-1 flex flex-col overflow-y-auto p-5 space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-5 border border-white/10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-acid-lime/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-acid-lime/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-acid-lime" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-acid-lime">AI MASHUP STUDIO</span>
          </div>
          <h3 className="text-xl font-black text-white leading-tight">Create a Pro Mashup</h3>
          <p className="text-sm text-gray-400 mt-1">Inspired by the best DJ sets — beatmatched, stem-separated, mastered.</p>
        </div>
      </div>

      {/* How many tracks */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">How many tracks to mix?</p>
        <div className="grid grid-cols-3 gap-2">
          {[2, 3, 4, 5, 6, 7].map(num => (
            <motion.button
              key={num}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setTargetCount(num)}
              className="aspect-square rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-acid-lime/60 text-2xl font-black text-white hover:text-acid-lime transition-all flex flex-col items-center justify-center group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-acid-lime/0 group-hover:bg-acid-lime/5 transition-all" />
              <span className="relative z-10">{num}</span>
              <span className="relative z-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider group-hover:text-acid-lime/70 mt-0.5">Tracks</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Style picker */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Mashup Style</p>
        <div className="space-y-1.5">
          {MASHUP_STYLES.map(style => (
            <motion.button
              key={style.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedStyle(style.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                selectedStyle === style.id
                  ? 'border-acid-lime/50 bg-acid-lime/5'
                  : 'border-white/5 bg-white/3 hover:bg-white/8 hover:border-white/15'
              }`}
            >
              <span className="text-xl">{style.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${selectedStyle === style.id ? style.color : 'text-white'}`}>
                  {style.label}
                </p>
                <p className="text-xs text-gray-500 truncate">{style.description}</p>
              </div>
              {selectedStyle === style.id && (
                <div className="w-5 h-5 rounded-full bg-acid-lime flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-black" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Step 2: Search & Add Tracks ───────────────────────────────────
  const renderSearchTracks = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top search bar */}
      <div className="p-4 shrink-0 border-b border-white/10 space-y-3 bg-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {Array.from({ length: targetCount || 2 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs font-black transition-all ${
                    i < selectedTracks.length
                      ? 'border-acid-lime bg-acid-lime/20 text-acid-lime'
                      : 'border-white/10 text-gray-600'
                  }`}
                >
                  {i < selectedTracks.length ? <Check className="w-3 h-3" /> : i + 1}
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {selectedTracks.length}/{targetCount} selected
            </span>
          </div>
          {selectedTracks.length === targetCount && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setStep('ready')}
              className="flex items-center gap-1 px-3 py-1.5 bg-acid-lime text-black text-xs font-black rounded-full"
            >
              Next <ChevronRight className="w-3 h-3" />
            </motion.button>
          )}
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, or albums..."
            className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-acid-lime/60 transition-colors"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-acid-lime animate-spin" />
          )}
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2.5 border border-dashed border-white/15 text-gray-500 hover:text-white hover:border-acid-lime/40 rounded-xl flex items-center justify-center gap-2 transition text-xs font-bold tracking-wider hover:bg-acid-lime/5"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload Local Audio File
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-2">
        {searchResults.length > 0 ? (
          <div className="space-y-1">
            {searchResults.map(track => {
              const isSelected = selectedTracks.some(t => t.id === track.id);
              const isPreviewing = previewingId === track.id;
              const bpm = getBpmForTrack(track.id);
              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center p-2 rounded-xl transition-all group ${
                    isSelected ? 'opacity-40 pointer-events-none' : 'hover:bg-white/5 cursor-pointer'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative shrink-0">
                    <img src={track.thumbnail} className="w-10 h-10 rounded-lg object-cover" />
                    <button
                      onClick={e => { e.stopPropagation(); handlePreview(track); }}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity"
                    >
                      {isPreviewing
                        ? <Pause className="w-3.5 h-3.5 text-white fill-white" />
                        : <Play className="w-3.5 h-3.5 text-white fill-white" />
                      }
                    </button>
                  </div>

                  {/* Info */}
                  <div className="ml-3 flex-1 min-w-0" onClick={() => !isSelected && addTrack(track)}>
                    <p className="text-sm font-bold text-white truncate">{track.title}</p>
                    <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                  </div>

                  {/* BPM */}
                  <div className="shrink-0 mx-3 text-right">
                    <p className="text-xs font-black text-cyan-400/70 tabular-nums">{bpm}</p>
                    <p className="text-[9px] text-gray-600">BPM</p>
                  </div>

                  {/* Add/Check */}
                  <button
                    onClick={() => !isSelected && addTrack(track)}
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white/5 hover:bg-acid-lime/20 hover:text-acid-lime text-gray-500"
                  >
                    {isSelected ? <Check className="w-4 h-4 text-acid-lime" /> : <Plus className="w-4 h-4" />}
                  </button>
                </motion.div>
              );
            })}
          </div>
        ) : searchQuery && !isSearching ? (
          <div className="text-center py-10 text-sm text-gray-600">No results. Try a different search.</div>
        ) : !searchQuery ? (
          <div className="py-8 px-4 flex flex-col items-center space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <Music className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400">Search to add tracks</p>
              <p className="text-xs text-gray-600 mt-1">Or upload local audio files above</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Selected tracks tray */}
      <AnimatePresence>
        {selectedTracks.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 border-t border-white/10 bg-black/40 overflow-hidden"
          >
            <div className="p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Your Mix</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {selectedTracks.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative group shrink-0"
                  >
                    <div className="relative w-12 h-12">
                      <img src={t.thumbnail} className="w-12 h-12 rounded-xl object-cover border-2 border-white/10" />
                      {t.id === anchorTrackId && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-acid-lime rounded-full flex items-center justify-center">
                          <Star className="w-2.5 h-2.5 text-black fill-black" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 rounded-b-xl flex items-center justify-center">
                        <span className="text-[8px] font-black text-white">{i + 1}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeTrack(t.id)}
                      className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ── Step 3: Review & Generate ─────────────────────────────────────
  const renderReady = () => {
    const anchorTrack = selectedTracks.find(t => t.id === anchorTrackId);
    const anchorBpm = anchorTrack ? getBpmForTrack(anchorTrack.id) : 128;
    const anchorKey = anchorTrack ? getKeyForTrack(anchorTrack.id) : 'C maj';
    const activeStyle = MASHUP_STYLES.find(s => s.id === selectedStyle) || MASHUP_STYLES[0];

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 shrink-0 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep('search_tracks')} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Review Mix</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Anchor info */}
            {anchorTrack && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-acid-lime/10 border border-acid-lime/20">
                <span className="text-[9px] font-black text-acid-lime uppercase tracking-wider">Anchor</span>
                <span className="text-[10px] font-bold text-white/70 tabular-nums">{anchorBpm} BPM</span>
                <span className="text-[10px] text-fuchsia-300">{anchorKey}</span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable deck list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* DJ Mixer visualization header */}
          <div className="relative h-16 rounded-2xl overflow-hidden border border-white/10 bg-black/40 flex items-center px-4 gap-3">
            {/* Frequency bars visualization */}
            <div className="flex items-end gap-[2px] h-10">
              {Array.from({ length: 40 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-sm bg-gradient-to-t from-acid-lime to-cyan-400"
                  animate={{
                    height: ['20%', `${20 + Math.abs(Math.sin(i * 0.5)) * 80}%`, '20%'],
                  }}
                  transition={{
                    duration: 1 + (i % 4) * 0.3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.05,
                  }}
                />
              ))}
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-white">{activeStyle.emoji} {activeStyle.label}</p>
              <p className="text-[10px] text-gray-500">{activeStyle.description}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-acid-lime tabular-nums">{anchorBpm} BPM</p>
              <p className="text-[10px] text-gray-500">{selectedTracks.length} tracks</p>
            </div>
          </div>

          {/* Instruction */}
          <p className="text-[10px] text-gray-600 text-center">
            Drag to reorder • <span className="text-acid-lime">⭐ Anchor</span> dictates final tempo & key
          </p>

          {/* Deck cards */}
          <Reorder.Group
            axis="y"
            values={localTracks}
            onReorder={setLocalTracks}
            className="space-y-2"
          >
            <AnimatePresence>
              {localTracks.map((track, index) => (
                <Reorder.Item
                  key={track.id}
                  value={track}
                  onDragEnd={() => {
                    const newIndex = localTracks.findIndex((t: Track) => t.id === track.id);
                    const oldIndex = selectedTracks.findIndex((t: Track) => t.id === track.id);
                    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                      reorderTracks(oldIndex, newIndex);
                    }
                  }}
                >
                  <DeckCard
                    track={track}
                    index={index}
                    isAnchor={track.id === anchorTrackId}
                    onSetAnchor={() => setAnchorTrack(track.id)}
                    onRemove={() => removeTrack(track.id)}
                    isGenerating={isGenerating}
                  />
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>

          {/* Style picker inline */}
          <div className="mt-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Change Style</p>
            <div className="grid grid-cols-2 gap-1.5">
              {MASHUP_STYLES.map(style => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                    selectedStyle === style.id
                      ? 'border-acid-lime/50 bg-acid-lime/10'
                      : 'border-white/5 bg-white/3 hover:bg-white/8'
                  }`}
                >
                  <span className="text-base">{style.emoji}</span>
                  <div>
                    <p className={`text-[10px] font-bold ${selectedStyle === style.id ? style.color : 'text-white/70'}`}>
                      {style.label}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate footer */}
        <div className="p-4 border-t border-white/10 shrink-0 bg-black/50 space-y-3">
          {renderStatus()}
          <motion.button
            whileHover={canGenerate && !isGenerating ? { scale: 1.02 } : {}}
            whileTap={canGenerate && !isGenerating ? { scale: 0.98 } : {}}
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 ${
              canGenerate && !isGenerating
                ? 'bg-gradient-to-r from-acid-lime to-[#a0f700] text-black shadow-[0_0_30px_rgba(204,255,0,0.4)] hover:shadow-[0_0_50px_rgba(204,255,0,0.6)]'
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            ) : (
              <><Wand2 className="w-5 h-5" /> Generate AI Mashup</>
            )}
          </motion.button>
          {!anchorTrackId && !isGenerating && (
            <p className="text-center text-xs text-orange-400/80">
              ⚡ Tap <Crosshair className="inline w-3 h-3" /> on a track to set it as anchor
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[49] bg-black/60 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="
              fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-[380px]
              bg-[#08080A]/98 backdrop-blur-3xl
              border-l border-white/10
              md:static md:inset-auto md:w-[360px] md:shrink-0 md:h-full
              shadow-[-20px_0_60px_rgba(0,0,0,0.5)]
            "
          >
            {/* Header */}
            <div className="px-4 pt-[env(safe-area-inset-top,12px)] pb-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-gradient-to-r from-acid-lime/10 via-transparent to-transparent mt-[44px] md:mt-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-acid-lime/15 rounded-xl flex items-center justify-center border border-acid-lime/30">
                  <Wand2 className="w-4 h-4 text-acid-lime" />
                </div>
                <div>
                  <h2 className="font-black text-base text-white leading-tight">Mashup Studio</h2>
                  <p className="text-[10px] text-gray-500">Pro AI-powered mixing engine</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {step !== 'select_count' && (
                  <button
                    onClick={clearQueue}
                    className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <AnimatePresence mode="wait">
                {step === 'select_count' && (
                  <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex-1 flex flex-col overflow-hidden">
                    {renderSelectCount()}
                  </motion.div>
                )}
                {step === 'search_tracks' && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex-1 flex flex-col overflow-hidden">
                    {renderSearchTracks()}
                  </motion.div>
                )}
                {step === 'ready' && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex-1 flex flex-col overflow-hidden">
                    {renderReady()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <input type="file" multiple accept="audio/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
