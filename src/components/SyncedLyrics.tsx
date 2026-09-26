import React, { useEffect, useState, useRef } from 'react';
import { X, Globe, ChevronDown, Loader2, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../store/usePlayerStore';
import { fetchLyrics, translateLyrics, translatePlainLyrics } from '../services/lyricsService';
import type { LyricLine, TranslatedLyricLine } from '../types/music';

const LANGUAGE_OPTIONS = [
  { code: 'English', label: 'English', flag: '🇬🇧' },
  { code: 'Hindi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'Spanish', label: 'Español', flag: '🇪🇸' },
  { code: 'French', label: 'Français', flag: '🇫🇷' },
  { code: 'Japanese', label: '日本語', flag: '🇯🇵' },
  { code: 'Korean', label: '한국어', flag: '🇰🇷' },
  { code: 'German', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'Portuguese', label: 'Português', flag: '🇧🇷' },
  { code: 'Arabic', label: 'العربية', flag: '🇸🇦' },
];

export const SyncedLyrics: React.FC<{ inline?: boolean }> = ({ inline = false }) => {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const currentTime = usePlayerStore(state => state.currentTime);
  const seek = usePlayerStore(state => state.seek);
  const isLyricsOpen = usePlayerStore(state => state.isLyricsOpen);
  const setLyricsOpen = usePlayerStore(state => state.setLyricsOpen);
  const isKaraokeMode = usePlayerStore(state => state.isKaraokeMode);
  const toggleKaraokeMode = usePlayerStore(state => state.toggleKaraokeMode);

  const [synced, setSynced] = useState<LyricLine[] | null>(null);
  const [plain, setPlain] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Translation state
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGE_OPTIONS[0]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedLines, setTranslatedLines] = useState<TranslatedLyricLine[] | null>(null);
  const [translatedPlain, setTranslatedPlain] = useState<string | null>(null);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);

  // ── Fetch lyrics when track or panel opens ────────────────────────────────
  useEffect(() => {
    if (!currentTrack || !isLyricsOpen) return;

    const loadLyrics = async () => {
      setIsLoading(true);
      setSynced(null);
      setPlain(null);
      setTranslatedLines(null);
      setTranslatedPlain(null);
      setShowTranslation(false);

      const { synced, plain } = await fetchLyrics(currentTrack.title, currentTrack.artist, currentTrack.duration);
      setSynced(synced);
      setPlain(plain);
      setIsLoading(false);
    };

    loadLyrics();
  }, [currentTrack, isLyricsOpen]);

  // ── Translation trigger ──────────────────────────────────────────────────
  const handleTranslate = async () => {
    if (!currentTrack) return;
    setIsTranslating(true);
    try {
      if (synced && synced.length > 0) {
        const result = await translateLyrics(synced, selectedLang.code, currentTrack.id);
        setTranslatedLines(result);
      } else if (plain) {
        const result = await translatePlainLyrics(plain, selectedLang.code, currentTrack.id);
        setTranslatedPlain(result);
      }
      setShowTranslation(true);
    } catch (e: any) {
      console.error(e);
      if (e.message && e.message.toLowerCase().includes('api key')) {
        usePlayerStore.getState().setApiKeyModalOpen(true);
      } else {
        alert(e.message || "Translation failed. Please try again.");
      }
    } finally {
      setIsTranslating(false);
    }
  };

  // ── Active line detection ────────────────────────────────────────────────
  const displayLines = translatedLines ?? synced;
  const activeIndex = displayLines
    ? displayLines.findIndex((line, index) => {
        const nextTime = index < displayLines.length - 1 ? displayLines[index + 1].time : Infinity;
        return currentTime >= line.time && currentTime < nextTime;
      })
    : -1;

  // Auto scroll to active line
  useEffect(() => {
    if (activeIndex !== -1 && lineRefs.current[activeIndex]) {
      lineRefs.current[activeIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  if (!inline && !isLyricsOpen) return null;

  return (
    <div className={
      inline
        ? 'w-full h-full flex flex-col bg-transparent text-white'
        : 'fixed inset-0 z-50 bg-[#08080A]/95 backdrop-blur-2xl text-white flex flex-col items-center pt-8 pb-32'
    }>
      {/* ── Non-Inline Header (Track Info, Translate, Close) ── */}
      {!inline && (
        <div className="w-full flex flex-col sm:flex-row items-center justify-between px-6 gap-4 z-50 mb-4 sm:mb-8 max-w-5xl shrink-0">
          
          {/* Track Info */}
          {currentTrack && (
            <div className="flex items-center gap-4 self-start sm:self-auto">
              <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-12 h-12 rounded-lg shadow-lg" />
              <div className="text-left">
                <h2 className="font-bold text-lg truncate max-w-[200px]">{currentTrack.title}</h2>
                <p className="text-sm text-gray-400 truncate max-w-[200px]">{currentTrack.artist}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            
            {/* Karaoke Toggle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleKaraokeMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                isKaraokeMode
                  ? 'bg-acid-lime/20 border-acid-lime/40 text-acid-lime'
                  : 'bg-white/10 border-white/15 text-white hover:bg-white/15'
              }`}
            >
              {isKaraokeMode ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              <span>{isKaraokeMode ? 'Karaoke On' : 'Full Karaoke Mode'}</span>
            </motion.button>

            {/* Translation Toolbar */}
            {((synced && synced.length > 0) || plain) && !isLoading && (
              <div className="flex items-center gap-2 relative">
                {/* Language picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowLangPicker(!showLangPicker)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-bold hover:bg-white/15 transition-all"
                  >
              <span>{selectedLang.flag}</span>
              <span>{selectedLang.label}</span>
              <ChevronDown className="w-3 h-3 text-white/50" />
            </button>

            <AnimatePresence>
              {showLangPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute top-full mt-2 left-0 bg-zinc-900/95 border border-white/15 rounded-2xl p-2 shadow-2xl z-50 min-w-[160px]"
                >
                  {LANGUAGE_OPTIONS.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLang(lang);
                        setShowLangPicker(false);
                        // Reset translation so user can re-trigger
                        setTranslatedLines(null);
                        setTranslatedPlain(null);
                        setShowTranslation(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/10 ${selectedLang.code === lang.code ? 'text-purple-400 bg-purple-500/10' : 'text-white'}`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Translate toggle button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={showTranslation ? () => setShowTranslation(false) : handleTranslate}
            disabled={isTranslating}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              showTranslation
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-white/10 border-white/15 text-white hover:bg-white/15'
            } disabled:opacity-50`}
          >
            {isTranslating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Globe className="w-3 h-3" />
            )}
            <span>{isTranslating ? 'Translating…' : showTranslation ? 'Original' : 'Translate'}</span>
          </motion.button>
        </div>
      )}

          {/* Close button */}
          <button
            onClick={() => setLyricsOpen(false)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/10 shadow-lg shrink-0"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
        </div>
      )}

      {/* ── Main lyric scroll ── */}
      <div
        ref={containerRef}
        className={`w-full ${inline ? 'flex-1' : 'flex-1 max-w-2xl'} overflow-y-auto px-6 ${inline ? 'py-4' : 'py-8'} no-scrollbar relative`}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="flex space-x-1 items-center justify-center">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-2 h-8 bg-acid-lime rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-acid-lime/70 animate-pulse mt-4 font-bold tracking-widest uppercase">Syncing Vibes...</p>
          </div>
        ) : displayLines ? (
          <div className="flex flex-col space-y-4 pb-64">
            {displayLines.map((line, i) => {
              const isActive = i === activeIndex;
              const isPast = i < activeIndex;
              const translLine = line as TranslatedLyricLine;

              return (
                <div
                  key={i}
                  ref={el => { lineRefs.current[i] = el; }}
                  onClick={() => seek(line.time)}
                  className={`cursor-pointer transition-all duration-500 ease-out ${isActive ? 'py-2' : ''}`}
                >
                  {/* Main lyric line */}
                  <div
                    className={`leading-tight transition-all duration-500 ${
                      isActive
                        ? 'text-3xl sm:text-4xl font-black bg-gradient-to-r from-acid-lime via-[#e0ff80] to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(204,255,0,0.5)] scale-105 origin-left'
                        : isPast
                        ? 'text-base sm:text-lg font-semibold text-neutral-600 hover:text-neutral-400'
                        : 'text-base sm:text-lg font-semibold text-neutral-500 hover:text-neutral-300'
                    }`}
                    style={{ transform: isActive ? 'scale(1.05)' : 'scale(1)', transformOrigin: 'left center', display: 'inline-block' }}
                  >
                    {isKaraokeMode && isActive ? (
                      // Word-by-word glow effect for karaoke
                      line.text.split(' ').map((word, wi) => (
                        <motion.span
                          key={wi}
                          initial={{ opacity: 0.4, textShadow: 'none' }}
                          animate={{ opacity: 1, textShadow: '0 0 20px rgba(204,255,0,0.8)' }}
                          transition={{ delay: wi * 0.12, duration: 0.3 }}
                          className="mr-2 inline-block"
                        >
                          {word}
                        </motion.span>
                      ))
                    ) : (
                      <span>{line.text}</span>
                    )}
                  </div>

                  {/* Active line accent bar */}
                  {isActive && (
                    <motion.div
                      layoutId="activeLyricBar"
                      className="mt-1.5 h-0.5 w-16 bg-gradient-to-r from-acid-lime to-cyan-400 rounded-full"
                    />
                  )}

                  {/* Translation beneath active line */}
                  <AnimatePresence>
                    {showTranslation && translLine.translation && translLine.translation !== line.text && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`overflow-hidden mt-1 ${
                          isActive
                            ? 'text-lg sm:text-xl font-medium text-acid-lime/60'
                            : 'text-sm text-neutral-600'
                        }`}
                      >
                        {translLine.translation}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : plain ? (
          <div className="text-center text-gray-300 whitespace-pre-wrap leading-relaxed text-lg">
            <div className="mb-6 pill-tag-secondary inline-block">Unsynced Lyrics</div>
            <div>{showTranslation && translatedPlain ? translatedPlain : plain}</div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full flex-col">
            <span className="pill-tag-secondary mb-4">Vibing without lyrics 🎧</span>
            <p className="text-gray-500 font-medium">(Instrumental / Unwritten)</p>
          </div>
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
