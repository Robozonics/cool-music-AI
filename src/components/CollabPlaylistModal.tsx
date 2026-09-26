import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, Music, Plus, Play, Check,
  Crown,
  Link2, Shuffle,
  Globe, Lock,
  Send, Smile
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── Initial mock data (will be synced via BroadcastChannel) ─────────────
const INITIAL_PARTICIPANTS = [
  { id: 'p1', name: 'You', emoji: '🎧', isHost: true, isListening: true },
];

const INITIAL_ACTIVITY = [
  { id: 'a1', user: 'System', emoji: '🤖', action: 'started', track: 'the session', time: 'just now' },
];

const EMOJI_REACTIONS = ['🔥', '💯', '🎉', '❤️', '😍', '🤩', '👏', '✨'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CollabPlaylistModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const queue = usePlayerStore(s => s.queue);
  const { playTrack } = usePlayerStore.getState();

  const [tab, setTab] = useState<'party' | 'activity' | 'queue'>('party');
  const [sessionName, setSessionName] = useState('🎵 Weekend Vibes');
  const [sessionCode] = useState('VIB-' + Math.random().toString(36).substring(2, 5).toUpperCase());
  const [copiedCode, setCopiedCode] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; user: string; emoji: string; text: string; time: string }>>([
    { id: 'm1', user: 'Alex', emoji: '🎸', text: 'This track is 🔥🔥', time: '3m ago' },
    { id: 'm2', user: 'Sara', emoji: '🎤', text: 'Add some Doja Cat next!', time: '1m ago' },
  ]);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [showReactions, setShowReactions] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [participants, setParticipants] = useState(INITIAL_PARTICIPANTS);
  const [activities] = useState(INITIAL_ACTIVITY);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (isOpen && !channelRef.current && isSupabaseConfigured && supabase) {
      const channel = supabase.channel('global-collab');
      channelRef.current = channel;

      channel.on('broadcast', { event: 'NEW_MESSAGE' }, ({ payload }) => {
        setMessages(prev => [...prev, payload]);
      });
      channel.on('broadcast', { event: 'NEW_REACTION' }, ({ payload }) => {
        setReactions(prev => ({ ...prev, [payload.emoji]: (prev[payload.emoji] || 0) + 1 }));
        showFloatingReaction(payload.emoji);
      });
      channel.on('broadcast', { event: 'NEW_PARTICIPANT' }, ({ payload }) => {
        setParticipants(prev => {
          if (prev.find(p => p.id === payload.id)) return prev;
          return [...prev, payload];
        });
      });

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'NEW_PARTICIPANT',
            payload: { id: user?.id || Math.random().toString(), name: user?.email?.split('@')[0] || 'Collab User', emoji: '😎', isHost: false, isListening: true }
          });
        }
      });
    } else if (isOpen && !channelRef.current && !isSupabaseConfigured) {
      const channel = new BroadcastChannel('musify-collab-session');
      (channelRef as any).current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'NEW_MESSAGE') {
          setMessages(prev => [...prev, payload]);
        } else if (type === 'NEW_REACTION') {
          setReactions(prev => ({ ...prev, [payload.emoji]: (prev[payload.emoji] || 0) + 1 }));
          showFloatingReaction(payload.emoji);
        } else if (type === 'NEW_PARTICIPANT') {
          setParticipants(prev => {
            if (prev.find(p => p.id === payload.id)) return prev;
            return [...prev, payload];
          });
        }
      };

      channel.postMessage({
        type: 'NEW_PARTICIPANT',
        payload: { id: Math.random().toString(), name: 'Collab User', emoji: '😎', isHost: false, isListening: true }
      });
    }

    return () => {
      if (!isOpen && channelRef.current) {
        if (isSupabaseConfigured && supabase) {
          supabase.removeChannel(channelRef.current as RealtimeChannel);
        } else {
          (channelRef.current as any).close();
        }
        channelRef.current = null;
      }
    };
  }, [isOpen, user]);

  const showFloatingReaction = (emoji: string) => {
    const el = document.createElement('div');
    el.textContent = emoji;
    el.style.cssText = 'position:fixed;bottom:200px;right:60px;font-size:2rem;z-index:9999;pointer-events:none;animation:floatUp 1.5s ease-out forwards';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    const newMsg = {
      id: Date.now().toString(),
      user: 'You',
      emoji: '🎧',
      text: message.trim(),
      time: 'now',
    };
    setMessages(prev => [...prev, newMsg]);
    if (isSupabaseConfigured && channelRef.current) {
      (channelRef.current as RealtimeChannel).send({ type: 'broadcast', event: 'NEW_MESSAGE', payload: { ...newMsg, user: user?.email?.split('@')[0] || 'Collab User' } });
    } else {
      (channelRef.current as any)?.postMessage({ type: 'NEW_MESSAGE', payload: { ...newMsg, user: 'Collab User' } });
    }
    setMessage('');
  };

  const handleReact = (emoji: string) => {
    setReactions(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
    setShowReactions(false);
    showFloatingReaction(emoji);
    if (isSupabaseConfigured && channelRef.current) {
      (channelRef.current as RealtimeChannel).send({ type: 'broadcast', event: 'NEW_REACTION', payload: { emoji } });
    } else {
      (channelRef.current as any)?.postMessage({ type: 'NEW_REACTION', payload: { emoji } });
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sessionCode).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-lg"
        />

        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-md bg-[#0d0d0f] border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: '85vh' }}
        >
          {/* Top gradient */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-purple-600/10 via-fuchsia-500/5 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="relative p-4 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <input
                    value={sessionName}
                    onChange={e => setSessionName(e.target.value)}
                    className="font-black text-white text-base bg-transparent border-none focus:outline-none w-full"
                    maxLength={30}
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {participants.filter(p => p.isListening).length} listening now
                    </span>
                    <button
                      onClick={() => setIsPrivate(!isPrivate)}
                      className={`flex items-center gap-1 text-[10px] font-bold transition ${isPrivate ? 'text-amber-400' : 'text-zinc-600'}`}
                    >
                      {isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                      {isPrivate ? 'Private' : 'Public'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Session code */}
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-300 text-[10px] font-black hover:bg-purple-500/25 transition"
                >
                  {copiedCode ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                  {copiedCode ? 'Copied!' : sessionCode}
                </button>
                <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Participants row */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex -space-x-2">
                {participants.map(p => (
                  <div
                    key={p.id}
                    className={`w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/40 to-fuchsia-500/30 border-2 flex items-center justify-center text-sm z-10 relative ${
                      p.isListening ? 'border-purple-500/50' : 'border-white/5 opacity-50'
                    }`}
                    title={p.name}
                  >
                    {p.emoji}
                    {p.isHost && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center">
                        <Crown className="w-2 h-2 text-black fill-black" />
                      </div>
                    )}
                    {p.isListening && !p.isHost && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-[#0d0d0f]" />
                    )}
                  </div>
                ))}
                <button className="w-8 h-8 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <span className="text-xs text-zinc-500">{participants.length} in session</span>
            </div>

            {/* Current track display */}
            {currentTrack && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/8">
                <div className="relative shrink-0">
                  <img src={currentTrack.thumbnail} className="w-10 h-10 rounded-xl object-cover" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-black/60 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{currentTrack.artist} · Playing now</p>
                </div>
                {/* Reaction button */}
                <div className="relative">
                  <button
                    onClick={() => setShowReactions(!showReactions)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-purple-500/20 text-zinc-500 hover:text-purple-300 transition"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  <AnimatePresence>
                    {showReactions && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 5 }}
                        className="absolute bottom-full right-0 mb-2 bg-zinc-900 border border-white/10 rounded-2xl p-2 grid grid-cols-4 gap-1.5 shadow-2xl z-50 w-36"
                      >
                        {EMOJI_REACTIONS.map(e => (
                          <button
                            key={e}
                            onClick={() => handleReact(e)}
                            className="text-xl hover:scale-125 transition-transform"
                          >
                            {e}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Reaction counts */}
            {Object.keys(reactions).length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {Object.entries(reactions).map(([emoji, count]) => (
                  <div key={emoji} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs">
                    <span>{emoji}</span>
                    <span className="text-zinc-400 font-bold">{count}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl mt-3">
              {[
                { id: 'party', label: '💬 Chat' },
                { id: 'activity', label: '⚡ Activity' },
                { id: 'queue', label: '🎵 Queue' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    tab === t.id ? 'bg-white/15 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <AnimatePresence mode="wait">

              {/* Chat */}
              {tab === 'party' && (
                <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex gap-2 ${msg.user === 'You' ? 'flex-row-reverse' : ''}`}>
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm shrink-0">
                          {msg.emoji}
                        </div>
                        <div className={`max-w-[75%] ${msg.user === 'You' ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                          <span className="text-[10px] text-zinc-600">{msg.user} · {msg.time}</span>
                          <div className={`px-3 py-2 rounded-2xl text-sm ${
                            msg.user === 'You'
                              ? 'bg-purple-600/80 text-white rounded-tr-sm'
                              : 'bg-white/10 text-white rounded-tl-sm'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  {/* Input */}
                  <div className="p-3 border-t border-white/5 flex gap-2 pb-[calc(12px+env(safe-area-inset-bottom))]">
                    <input
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Say something..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 transition"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!message.trim()}
                      className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 transition shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Activity feed */}
              {tab === 'activity' && (
                <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-4 space-y-2 pb-[calc(16px+env(safe-area-inset-bottom))]">
                  {activities.map(act => (
                    <div key={act.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/3 transition">
                      <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-sm shrink-0">
                        {act.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white">
                          <span className="font-bold text-purple-300">{act.user}</span>
                          {' '}<span className="text-zinc-500">{act.action}</span>
                          {' '}<span className="font-bold">"{act.track}"</span>
                        </p>
                        <p className="text-[10px] text-zinc-600">{act.time}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Collaborative queue */}
              {tab === 'queue' && (
                <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-4 space-y-2 pb-[calc(16px+env(safe-area-inset-bottom))]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                      {queue.length} tracks in queue
                    </p>
                    <button className="text-xs text-purple-400 font-bold hover:text-purple-300 transition flex items-center gap-1">
                      <Shuffle className="w-3 h-3" /> Shuffle
                    </button>
                  </div>
                  {queue.length === 0 ? (
                    <div className="py-8 text-center">
                      <Music className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500">Queue is empty</p>
                      <p className="text-xs text-zinc-700 mt-1">Add tracks from Search or Home</p>
                    </div>
                  ) : (
                    queue.map((track, i) => (
                      <div key={track.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 group transition">
                        <span className="text-xs text-zinc-700 w-5 text-center tabular-nums">{i + 1}</span>
                        <img src={track.thumbnail} className="w-9 h-9 rounded-lg object-cover" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{track.title}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{track.artist}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => playTrack(track)}
                            className="p-1.5 rounded-lg hover:bg-purple-500/20 text-zinc-500 hover:text-purple-400 transition"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-100px) scale(1.5); }
        }
      `}</style>
    </AnimatePresence>
  );
};
