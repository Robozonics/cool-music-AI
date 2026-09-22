import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronRight, Clock } from 'lucide-react';
import { searchUnblocked } from '../services/unblockedMusicService';
import { usePlayerStore } from '../store/usePlayerStore';
import type { Track, DaylistEntry } from '../types/music';

// ── Time-Contextual Playlist Definitions ──────────────────────────────────────
// Each entry maps to a { dayOfWeek (0=Sun..6=Sat), hourStart, hourEnd }
const DAYLIST_TABLE: Array<{
  days: number[];
  hourStart: number;
  hourEnd: number;
  entry: DaylistEntry;
}> = [
  // ── Weekday mornings ──
  {
    days: [1, 2, 3, 4, 5],
    hourStart: 5, hourEnd: 9,
    entry: {
      title: 'Morning Momentum',
      subtitle: 'Wake up and own the day',
      emoji: '☀️',
      gradient: 'from-amber-500/30 via-orange-400/20 to-yellow-300/10',
      textColor: 'text-amber-300',
      query: 'uplifting morning motivation indie pop',
    },
  },
  // ── Weekday focus hours ──
  {
    days: [1, 2, 3, 4, 5],
    hourStart: 9, hourEnd: 12,
    entry: {
      title: 'Deep Focus Mode',
      subtitle: 'Locked in, no distractions',
      emoji: '🧠',
      gradient: 'from-cyan-500/25 via-blue-400/15 to-indigo-300/10',
      textColor: 'text-cyan-300',
      query: 'lofi study beats deep focus instrumental',
    },
  },
  // ── Weekday lunch ──
  {
    days: [1, 2, 3, 4, 5],
    hourStart: 12, hourEnd: 14,
    entry: {
      title: 'Midday Recharge',
      subtitle: 'Casual, breezy vibes',
      emoji: '🌤️',
      gradient: 'from-lime-500/25 via-green-400/15 to-teal-300/10',
      textColor: 'text-lime-300',
      query: 'breezy indie pop midday chill acoustic',
    },
  },
  // ── Weekday afternoon grind ──
  {
    days: [1, 2, 3, 4, 5],
    hourStart: 14, hourEnd: 18,
    entry: {
      title: 'Afternoon Flow',
      subtitle: 'Keeping the rhythm going',
      emoji: '⚡',
      gradient: 'from-violet-500/25 via-purple-400/15 to-pink-300/10',
      textColor: 'text-violet-300',
      query: 'electronic chillwave afternoon productivity synthpop',
    },
  },
  // ── Weekday evening wind-down ──
  {
    days: [1, 2, 3, 4, 5],
    hourStart: 18, hourEnd: 21,
    entry: {
      title: 'Evening Unwind',
      subtitle: 'The commute back to yourself',
      emoji: '🌆',
      gradient: 'from-orange-500/25 via-rose-400/15 to-purple-300/10',
      textColor: 'text-orange-300',
      query: 'evening chill r&b neo soul acoustic',
    },
  },
  // ── Late night weekday ──
  {
    days: [1, 2, 3, 4],
    hourStart: 21, hourEnd: 24,
    entry: {
      title: 'Late Night Feels',
      subtitle: 'The city never really sleeps',
      emoji: '🌙',
      gradient: 'from-indigo-600/30 via-purple-500/20 to-violet-400/10',
      textColor: 'text-indigo-300',
      query: 'lofi night drive ambient bedroom pop',
    },
  },
  // ── Friday night ──
  {
    days: [5],
    hourStart: 18, hourEnd: 24,
    entry: {
      title: 'Friday Night Hype',
      subtitle: "It's the weekend, finally",
      emoji: '🔥',
      gradient: 'from-pink-600/35 via-fuchsia-500/25 to-purple-400/15',
      textColor: 'text-pink-300',
      query: 'friday night party hip hop trap hype',
    },
  },
  // ── Saturday morning ──
  {
    days: [6],
    hourStart: 8, hourEnd: 13,
    entry: {
      title: 'Saturday Morning Coffee',
      subtitle: 'Slow it down, you earned it',
      emoji: '☕',
      gradient: 'from-amber-600/25 via-yellow-500/15 to-orange-300/10',
      textColor: 'text-amber-300',
      query: 'jazz cafe acoustic saturday morning chill',
    },
  },
  // ── Saturday night ──
  {
    days: [6],
    hourStart: 20, hourEnd: 24,
    entry: {
      title: 'Saturday Night Anthem',
      subtitle: 'Main character moment',
      emoji: '🎉',
      gradient: 'from-fuchsia-600/35 via-pink-500/25 to-rose-400/15',
      textColor: 'text-fuchsia-300',
      query: 'saturday night dance pop electronic hits',
    },
  },
  // ── Sunday chilling ──
  {
    days: [0],
    hourStart: 10, hourEnd: 18,
    entry: {
      title: 'Sunday Soul Reset',
      subtitle: 'Breathe, reflect, recharge',
      emoji: '🌿',
      gradient: 'from-emerald-600/25 via-teal-500/15 to-cyan-300/10',
      textColor: 'text-emerald-300',
      query: 'sunday chill indie folk acoustic soul',
    },
  },
  // ── Default catch-all (midnight–5am any day) ──
  {
    days: [0, 1, 2, 3, 4, 5, 6],
    hourStart: 0, hourEnd: 5,
    entry: {
      title: '3AM Headspace',
      subtitle: "You shouldn't still be awake",
      emoji: '🌌',
      gradient: 'from-slate-700/40 via-indigo-600/20 to-violet-500/10',
      textColor: 'text-slate-300',
      query: 'sad lofi 3am ambient overthinking bedroom',
    },
  },
];

const getActiveDaylistEntry = (): DaylistEntry => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  // Sort by specificity — more specific day arrays first
  const sorted = [...DAYLIST_TABLE].sort((a, b) => a.days.length - b.days.length);

  for (const entry of sorted) {
    if (entry.days.includes(day) && hour >= entry.hourStart && hour < entry.hourEnd) {
      return entry.entry;
    }
  }
  // Absolute fallback
  return DAYLIST_TABLE[DAYLIST_TABLE.length - 1].entry;
};

const formatCurrentTime = (now: Date): string => {
  const h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

export const DaylistWidget: React.FC = () => {
  const [daylist, setDaylist] = useState<DaylistEntry>(getActiveDaylistEntry);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clockStr, setClockStr] = useState(formatCurrentTime(new Date()));

  const playTrack = usePlayerStore(state => state.playTrack);
  const setQueue = usePlayerStore(state => state.setQueue);

  const fetchTracks = useCallback(async (entry: DaylistEntry) => {
    setIsLoading(true);
    try {
      const results = await searchUnblocked(entry.query);
      setTracks(results.slice(0, 8));
    } catch {
      setTracks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and refresh every 30 minutes
  useEffect(() => {
    fetchTracks(daylist);

    const refreshInterval = setInterval(() => {
      const freshEntry = getActiveDaylistEntry();
      setDaylist(freshEntry);
      fetchTracks(freshEntry);
    }, 30 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Update live clock every minute
  useEffect(() => {
    const tick = setInterval(() => {
      setClockStr(formatCurrentTime(new Date()));
    }, 60_000);
    return () => clearInterval(tick);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={daylist.title}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`relative rounded-3xl p-4 md:p-5 overflow-hidden border border-white/8 shadow-[0_8px_40px_rgba(0,0,0,0.5)] bg-gradient-to-br ${daylist.gradient}`}
      >
        {/* Subtle animated blob */}
        <motion.div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20 blur-3xl"
          animate={{ scale: [1, 1.15, 1], rotate: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: 'radial-gradient(circle, white, transparent)' }}
        />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{daylist.emoji}</span>
              <h3 className={`font-black text-lg tracking-tight ${daylist.textColor}`}>{daylist.title}</h3>
            </div>
            <p className="text-white/50 text-xs font-medium">{daylist.subtitle}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1.5 rounded-full border border-white/10">
            <Clock className="w-3 h-3 text-white/40" />
            <span className="text-[10px] font-mono text-white/50">{clockStr}</span>
          </div>
        </div>

        {/* Track horizontal scroll */}
        {isLoading ? (
          <div className="flex gap-3 pb-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-24 shrink-0 animate-pulse">
                <div className="w-24 h-24 rounded-2xl bg-white/10 mb-2" />
                <div className="h-2 bg-white/10 rounded w-20 mb-1" />
                <div className="h-2 bg-white/5 rounded w-14" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 hide-scrollbar">
            {tracks.map((track, i) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => { setQueue(tracks); playTrack(track); }}
                className="w-24 shrink-0 group cursor-pointer"
              >
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden mb-2 shadow-lg border border-white/10">
                  <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>
                </div>
                <p className="text-white text-[10px] font-bold truncate">{track.title}</p>
                <p className="text-white/40 text-[9px] truncate">{track.artist}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* CTA */}
        {tracks.length > 0 && !isLoading && (
          <button
            onClick={() => { setQueue(tracks); playTrack(tracks[0]); }}
            className={`mt-4 flex items-center gap-1.5 text-xs font-bold ${daylist.textColor} hover:opacity-80 transition-opacity`}
          >
            Play all {tracks.length} tracks
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
      </motion.div>
    </AnimatePresence>
  );
};
