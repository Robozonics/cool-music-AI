import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, X } from 'lucide-react';
import { usePlayerStore, nativeAudio, rampVolume } from '../store/usePlayerStore';
import { showToast } from './ToastNotification';

const PRESETS = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hr', minutes: 60 },
  { label: '2 hrs', minutes: 120 },
];

export const SleepTimer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [endTime, setEndTime] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [customMinutes, setCustomMinutes] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const handleStop = useCallback(() => {
    setEndTime(null);
    setRemaining(0);
    if (timerRef.current) clearInterval(timerRef.current);
    showToast('info', 'Sleep timer cancelled');
  }, []);

  const handleStart = useCallback((minutes: number) => {
    const end = Date.now() + minutes * 60 * 1000;
    setEndTime(end);
    setRemaining(minutes * 60);
    showToast('success', `Sleep timer set for ${minutes} min ✨`);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!endTime) return;

    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      setRemaining(left);

      if (left <= 0) {
        clearInterval(timerRef.current);
        setEndTime(null);
        // Gentle fade-out then pause
        rampVolume(nativeAudio, nativeAudio.volume, 0, 5000, () => {
          nativeAudio.pause();
          usePlayerStore.setState({ isPlaying: false });
          nativeAudio.volume = usePlayerStore.getState().volume;
          showToast('info', 'Goodnight! Sleep timer ended 🌙');
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [endTime]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 25 }}
          className="relative w-full max-w-sm bg-[#111113] border border-white/10 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                <Moon className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-black text-base">Sleep Timer</h3>
                <p className="text-zinc-500 text-[10px]">Auto-pause after duration</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 pb-5 space-y-4">
            {/* Active timer */}
            {endTime && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25 text-center"
              >
                <p className="text-[10px] uppercase tracking-widest text-purple-400 font-bold mb-2">⏳ Time Remaining</p>
                <p className="text-3xl font-black text-white font-mono tracking-wider tabular-nums">{formatTime(remaining)}</p>
                <button
                  onClick={handleStop}
                  className="mt-3 px-5 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold hover:bg-rose-500/30 transition"
                >
                  Cancel Timer
                </button>
              </motion.div>
            )}

            {/* Presets */}
            {!endTime && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map(p => (
                    <button
                      key={p.minutes}
                      onClick={() => handleStart(p.minutes)}
                      className="py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 hover:border-purple-500/30 transition-all active:scale-95"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Custom */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={720}
                    value={customMinutes}
                    onChange={e => setCustomMinutes(e.target.value)}
                    placeholder="Custom (min)"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-purple-500/50 transition placeholder-zinc-600"
                  />
                  <button
                    onClick={() => {
                      const mins = parseInt(customMinutes, 10);
                      if (mins > 0 && mins <= 720) handleStart(mins);
                    }}
                    disabled={!customMinutes || parseInt(customMinutes, 10) <= 0}
                    className="px-4 py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-sm hover:bg-purple-500/30 transition disabled:opacity-40"
                  >
                    Set
                  </button>
                </div>

                <p className="text-center text-[10px] text-zinc-600">
                  Music will gently fade out when the timer ends 🌙
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
