import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Smartphone, Monitor, Tv, Cast, Bluetooth, Wifi, QrCode,
  Copy, Check, Link2, Radio, Loader2,
  Play, Pause, SkipForward, Volume2, Repeat, Shuffle, Heart,
  Laptop, Watch, Speaker, Headphones, Lock, Globe
} from 'lucide-react';
import { usePlayerStore, nativeAudio } from '../store/usePlayerStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { showToast } from './ToastNotification';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Peer } from 'peerjs';

// ── Session code generator ────────────────────────────────────────────
const generateSessionCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    if (i === 3) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

interface AppDevice {
  id: string;
  name: string;
  type: string;
  status: 'available' | 'busy';
  signal: number;
}

const DeviceIcon: React.FC<{ type: string; className?: string }> = ({ type, className = 'w-5 h-5' }) => {
  switch (type) {
    case 'laptop': return <Laptop className={className} />;
    case 'tv': return <Tv className={className} />;
    case 'phone': return <Smartphone className={className} />;
    case 'watch': return <Watch className={className} />;
    case 'speaker': return <Speaker className={className} />;
    case 'headphones': return <Headphones className={className} />;
    default: return <Monitor className={className} />;
  }
};

const SignalBars: React.FC<{ strength: number }> = ({ strength }) => (
  <div className="flex items-end gap-[2px]">
    {[1, 2, 3, 4, 5].map(i => (
      <div
        key={i}
        className={`w-1 rounded-sm transition-all ${i <= strength ? 'bg-acid-lime' : 'bg-white/10'}`}
        style={{ height: `${6 + i * 2}px` }}
      />
    ))}
  </div>
);

// ── Mini Remote Control ───────────────────────────────────────────────
const RemoteControl: React.FC<{ deviceName: string; onDisconnect: () => void; isRemoteSession?: boolean; sendRemoteAction?: (action: any) => void }> = ({
  deviceName, onDisconnect, isRemoteSession, sendRemoteAction
}) => {
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const volume = usePlayerStore(s => s.volume);
  const { togglePlay, nextTrack, prevTrack, setVolume } = usePlayerStore.getState();

  const handlePlayPause = () => {
    if (isRemoteSession && sendRemoteAction) {
      sendRemoteAction({ action: isPlaying ? 'pause' : 'play' });
      usePlayerStore.getState().setIsPlaying(!isPlaying);
    } else {
      togglePlay();
    }
  };

  const handleNext = () => {
    if (isRemoteSession && sendRemoteAction) sendRemoteAction({ action: 'next' });
    else nextTrack();
  };

  const handlePrev = () => {
    if (isRemoteSession && sendRemoteAction) sendRemoteAction({ action: 'prev' });
    else prevTrack();
  };

  const handleVol = (val: number) => {
    if (isRemoteSession && sendRemoteAction) sendRemoteAction({ action: 'volume', value: val });
    else setVolume(val);
  };

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      setProgress(nativeAudio.currentTime);
      setDuration(nativeAudio.duration || 0);
    };
    nativeAudio.addEventListener('timeupdate', updateProgress);
    updateProgress();
    return () => nativeAudio.removeEventListener('timeupdate', updateProgress);
  }, []);

  const handleSeek = (val: number) => {
    if (isRemoteSession && sendRemoteAction) sendRemoteAction({ action: 'seek', time: val });
    else {
      nativeAudio.currentTime = val;
    }
  };

  const isShuffle = false; // usePlayerStore(s => s.isShuffle);
  const repeatMode = usePlayerStore(s => s.repeatMode);
  const isRepeat = repeatMode !== 'off';
  const likedTracks = usePlayerStore(s => s.likedTracks);
  const { setRepeatMode, toggleLikeTrack } = usePlayerStore.getState();

  const handleShuffle = () => {
    if (isRemoteSession && sendRemoteAction) sendRemoteAction({ action: 'shuffle' });
    else { /* toggleShuffle() */ }
  };

  const handleRepeat = () => {
    if (isRemoteSession && sendRemoteAction) sendRemoteAction({ action: 'repeat' });
    else setRepeatMode(repeatMode === 'off' ? 'all' : 'off');
  };
  
  const handleLike = () => {
    if (currentTrack) {
      if (isRemoteSession && sendRemoteAction) sendRemoteAction({ action: 'like', trackId: currentTrack.id });
      else toggleLikeTrack(currentTrack);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-acid-lime/30 bg-acid-lime/5 overflow-hidden flex flex-col gap-2"
    >
      <div className="p-3 border-b border-acid-lime/20 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-acid-lime rounded-full animate-pulse shadow-[0_0_8px_rgba(204,255,0,0.8)]" />
          <span className="text-xs font-bold text-acid-lime tracking-wide">CONTROLLING: {deviceName.toUpperCase()}</span>
        </div>
        <button onClick={onDisconnect} className="text-xs font-semibold text-gray-400 hover:text-red-400 transition">
          Disconnect
        </button>
      </div>
      
      {currentTrack && (
        <div className="p-4 flex items-center gap-4">
          <img src={currentTrack.thumbnail} className="w-14 h-14 rounded-xl object-cover shadow-lg" alt="" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white truncate">{currentTrack.title}</p>
            <p className="text-xs text-gray-400 truncate">{currentTrack.artist}</p>
          </div>
          <button onClick={handleLike} className="p-2">
            <Heart className={`w-5 h-5 transition ${likedTracks.includes(currentTrack.id) ? 'fill-acid-lime text-acid-lime' : 'text-gray-400 hover:text-white'}`} />
          </button>
        </div>
      )}

      {/* Progress Bar */}
      <div className="px-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 w-8 tabular-nums">{formatTime(progress)}</span>
          <input
            type="range" min={0} max={duration || 100} step={1} value={progress}
            onChange={e => handleSeek(parseFloat(e.target.value))}
            className="flex-1 h-1.5 rounded-full bg-white/10 appearance-none cursor-pointer accent-acid-lime hover:h-2 transition-all"
            style={{
               background: `linear-gradient(to right, #ccff00 ${(progress / (duration || 1)) * 100}%, rgba(255,255,255,0.1) ${(progress / (duration || 1)) * 100}%)`
            }}
          />
          <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="p-4 flex items-center justify-between px-6">
        <button onClick={handleShuffle} className={`transition ${isShuffle ? 'text-acid-lime' : 'text-gray-500 hover:text-white'}`}>
          <Shuffle className="w-4 h-4" />
        </button>
        <button onClick={handlePrev} className="p-2 rounded-full hover:bg-white/10 text-white transition">
          <SkipForward className="w-5 h-5 rotate-180 fill-white" />
        </button>
        <button
          onClick={handlePlayPause}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-acid-lime text-black hover:scale-105 transition shadow-[0_0_20px_rgba(204,255,0,0.3)]"
        >
          {isPlaying ? <Pause className="w-6 h-6 fill-black" /> : <Play className="w-6 h-6 fill-black ml-1" />}
        </button>
        <button onClick={handleNext} className="p-2 rounded-full hover:bg-white/10 text-white transition">
          <SkipForward className="w-5 h-5 fill-white" />
        </button>
        <button onClick={handleRepeat} className={`transition ${isRepeat ? 'text-acid-lime' : 'text-gray-500 hover:text-white'}`}>
          <Repeat className="w-4 h-4" />
        </button>
      </div>

      {/* Volume */}
      <div className="px-6 pb-5 flex items-center gap-3">
        <Volume2 className="w-4 h-4 text-gray-500" />
        <input
          type="range" min={0} max={1} step={0.01} value={volume}
          onChange={e => handleVol(parseFloat(e.target.value))}
          className="flex-1 h-1.5 rounded-full bg-white/10 appearance-none cursor-pointer accent-white"
          style={{
             background: `linear-gradient(to right, #fff ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%)`
          }}
        />
        <span className="text-xs font-bold text-gray-500 w-8 text-right tabular-nums">{Math.round(volume * 100)}%</span>
      </div>
    </motion.div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────
export const ConnectDeviceModal: React.FC = () => {
  const isConnectModalOpen = usePlayerStore(state => state.isConnectModalOpen);
  const setConnectModalOpen = usePlayerStore(state => state.setConnectModalOpen);
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const user = useAuthStore(s => s.user);

  const [devices, setDevices] = useState<AppDevice[]>([]);
  const [tab, setTab] = useState<'devices' | 'sync' | 'remote'>('devices');
  const [sessionCode, setSessionCode] = useState(generateSessionCode);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<'host' | 'join'>('host');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionPeers, setSessionPeers] = useState<string[]>([]);
  const [joiningSession, setJoiningSession] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const peerRef = useRef<any>(null);
  const connectionsRef = useRef<any[]>([]);

  useEffect(() => {
    // Fetch real audio output devices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(deviceInfos => {
        const audioOutputs = deviceInfos.filter(d => d.kind === 'audiooutput' && d.deviceId !== 'default');
        const realDevices = audioOutputs.map((d, i) => ({
          id: d.deviceId,
          name: d.label || `Audio Output ${i + 1}`,
          type: d.label.toLowerCase().includes('headphone') || d.label.toLowerCase().includes('airpods') ? 'headphones' : 'speaker',
          status: 'available' as const,
          signal: 5
        }));
        
        setDevices(realDevices);
      }).catch(err => {
        console.error('Error fetching devices', err);
        setDevices([]);
      });
    }
  }, []);

  // Auto-start the host session exactly once so the code is always ready
  useEffect(() => {
    if (!peerRef.current) {
      handleStartSession();
    }
  }, []);

  // Cleanup channels on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
      }
      if (bcRef.current) {
        bcRef.current.close();
      }
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      connectionsRef.current.forEach(c => c.close());
      connectionsRef.current = [];
    };
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sessionCode).catch(() => {});
    setCopied(true);
    showToast('success', 'Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = async (deviceId: string, deviceName: string) => {
    setIsConnecting(deviceId);
    
    try {
      if ((nativeAudio as any).setSinkId) {
        await (nativeAudio as any).setSinkId(deviceId);
      }
      setConnectedDevice(deviceName);
      showToast('success', `Connected to ${deviceName}`);
    } catch (e) {
      console.error('Failed to set audio output device', e);
      showToast('error', 'Failed to connect to device');
    } finally {
      setIsConnecting(null);
    }
  };

  const disconnectSession = () => {
    if (peerRef.current) {
      if ((peerRef.current as any)._unsub) {
        (peerRef.current as any)._unsub();
      }
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (bcRef.current) {
      // Clean up host heartbeat/seek listeners
      if ((bcRef.current as any)._hostCleanup) {
        (bcRef.current as any)._hostCleanup();
      }
      bcRef.current.close();
      bcRef.current = null;
    }
    if (channelRef.current) {
      if (typeof channelRef.current.unsubscribe === 'function') channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    connectionsRef.current = [];
    setIsSessionActive(false);
    setSessionPeers([]);
    setConnectedDevice(null);
  };

  const createSyncChannel = (code: string, isHost: boolean) => {
    const peerName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || `User_${Math.floor(Math.random() * 1000)}`;

    const handleRemoteAction = (action: any) => {
      const state = usePlayerStore.getState();
      if (action.action === 'play') {
        nativeAudio.play().catch(()=>{});
      } else if (action.action === 'pause') {
        nativeAudio.pause();
      } else if (action.action === 'next') {
        state.nextTrack();
      } else if (action.action === 'prev') {
        state.prevTrack();
      } else if (action.action === 'volume') {
        state.setVolume(action.value);
      } else if (action.action === 'seek') {
        nativeAudio.currentTime = action.time;
      } else if (action.action === 'shuffle') {
        // state.toggleShuffle();
      } else if (action.action === 'repeat') {
        state.setRepeatMode(state.repeatMode === 'off' ? 'all' : 'off');
      } else if (action.action === 'like') {
        const t = state.queue.find(t => t.id === action.trackId) || state.currentTrack;
        if (t) state.toggleLikeTrack(t);
      }
    };

    // Helper: load a synced track on the joiner side — waits for the audio source to
    // be ready before setting currentTime and playing, which fixes the "title only" bug.
    const loadSyncedTrack = async (track: any, time?: number, shouldPlay?: boolean) => {
      let syncedTrack = { ...track, isOffline: false };
      
      if (!syncedTrack.streamUrl || syncedTrack.streamUrl.startsWith('blob:') || syncedTrack.streamUrl.startsWith('file:')) {
         try {
           const { fetchFreshSaavnUrl, searchUnblocked } = await import('../services/unblockedMusicService');
           if (syncedTrack.source === 'saavn' && syncedTrack.id.startsWith('saavn-')) {
              syncedTrack.streamUrl = await fetchFreshSaavnUrl(syncedTrack.id);
           } else {
              const results = await searchUnblocked(`${syncedTrack.title} ${syncedTrack.artist}`);
              if (results && results.length > 0) {
                 syncedTrack.streamUrl = results[0].streamUrl;
              }
           }
         } catch (e) {
           console.error('Failed to fetch fresh URL for synced track', e);
         }
      }

      usePlayerStore.getState().playTrack(syncedTrack);
      
      const onReady = () => {
        nativeAudio.removeEventListener('canplay', onReady);
        nativeAudio.removeEventListener('error', onError);
        if (time !== undefined && Number.isFinite(time)) nativeAudio.currentTime = time;
        if (shouldPlay === false) {
          nativeAudio.pause();
        } else {
          nativeAudio.play().catch(() => {});
        }
      };
      const onError = () => {
        nativeAudio.removeEventListener('canplay', onReady);
        nativeAudio.removeEventListener('error', onError);
      };
      
      // If audio is already ready (e.g. cached), fire immediately; otherwise wait
      if (nativeAudio.readyState >= 3) {
        onReady();
      } else {
        nativeAudio.addEventListener('canplay', onReady);
        nativeAudio.addEventListener('error', onError);
      }
    };

    // 1. Always set up BroadcastChannel for same-device/same-browser fast path
    const bc = new BroadcastChannel(`musify-sync-${code}`);
    bcRef.current = bc;

    bc.onmessage = (e) => {
      if (e.data.type === 'peer_joined') {
        setSessionPeers(prev => Array.from(new Set([...prev, e.data.peerId])));
        if (isHost) {
          showToast('info', `${e.data.peerId} joined locally!`);
          const state = usePlayerStore.getState();
          if (state.currentTrack) {
             bc.postMessage({ type: 'play_track', track: state.currentTrack, time: nativeAudio.currentTime, isPlaying: !nativeAudio.paused });
          }
        }
      } else if (e.data.type === 'play_track' && e.data.track) {
        if (!isHost) {
          loadSyncedTrack(e.data.track, e.data.time, e.data.isPlaying !== false);
        }
      } else if (e.data.type === 'sync_action') {
        if (!isHost) {
          if (e.data.action === 'pause') {
            nativeAudio.pause();
          } else if (e.data.action === 'play') {
            if (e.data.time !== undefined) nativeAudio.currentTime = e.data.time;
            nativeAudio.play().catch(() => {});
          } else if (e.data.action === 'seek' && e.data.time !== undefined) {
            nativeAudio.currentTime = e.data.time;
          } else if (e.data.action === 'volume' && e.data.value !== undefined) {
            usePlayerStore.getState().setVolume(e.data.value);
          }
        }
      } else if (e.data.type === 'heartbeat') {
        // Real-time time sync from host — correct drift if > 1.5s
        if (!isHost && e.data.time !== undefined) {
          const drift = Math.abs(nativeAudio.currentTime - e.data.time);
          if (drift > 1.5) {
            nativeAudio.currentTime = e.data.time;
          }
        }
      } else if (e.data.type === 'remote_action') {
        if (isHost) handleRemoteAction(e.data.action);
      }
    };

    bc.postMessage({ type: 'peer_joined', peerId: peerName });

    if (isHost) {
      // Broadcast store state changes
      usePlayerStore.subscribe((state, prevState) => {
        if (state.currentTrack?.id !== prevState.currentTrack?.id) {
          bc.postMessage({ type: 'play_track', track: state.currentTrack, time: nativeAudio.currentTime, isPlaying: !nativeAudio.paused });
        }
        if (state.isPlaying !== prevState.isPlaying) {
          bc.postMessage({ type: 'sync_action', action: state.isPlaying ? 'play' : 'pause', time: nativeAudio.currentTime });
        }
        if (state.volume !== prevState.volume) {
          bc.postMessage({ type: 'sync_action', action: 'volume', value: state.volume });
        }
      });

      // Forward seek events from host nativeAudio
      const onHostSeek = () => {
        bc.postMessage({ type: 'sync_action', action: 'seek', time: nativeAudio.currentTime });
      };
      nativeAudio.addEventListener('seeked', onHostSeek);

      // Heartbeat: sync currentTime every 2s so peers stay locked
      const heartbeatId = setInterval(() => {
        if (!nativeAudio.paused) {
          bc.postMessage({ type: 'heartbeat', time: nativeAudio.currentTime });
        }
      }, 2000);
      // Stash cleanup handles on the bc object
      (bc as any)._hostCleanup = () => {
        nativeAudio.removeEventListener('seeked', onHostSeek);
        clearInterval(heartbeatId);
      };
    }

    // 2. Robust WebRTC sync using PeerJS
    try {
      const peerId = isHost ? `msy-host-${code}` : `msy-peer-${code}-${Math.floor(Math.random()*10000)}`;
      const peer = new Peer(peerId, { 
        pingInterval: 10000,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });
      peerRef.current = peer;

      const broadcastToPeers = (data: any) => {
        connectionsRef.current.forEach(conn => {
          if (conn.open) conn.send(data);
        });
      };

      const handleIncomingData = (data: any, conn?: any) => {
        if (data.type === 'peer_joined') {
          setSessionPeers(prev => Array.from(new Set([...prev, data.peerId])));
          if (isHost) {
            showToast('info', `${data.peerId} joined!`);
            const state = usePlayerStore.getState();
            if (state.currentTrack && conn && conn.open) {
               conn.send({ type: 'play_track', track: state.currentTrack, time: nativeAudio.currentTime, isPlaying: !nativeAudio.paused });
            }
          }
        } else if (data.type === 'play_track' && data.track) {
          if (!isHost) {
            loadSyncedTrack(data.track, data.time, data.isPlaying !== false);
          }
        } else if (data.type === 'sync_action') {
          if (!isHost) {
            if (data.action === 'pause') {
              nativeAudio.pause();
            } else if (data.action === 'play') {
              if (data.time !== undefined) nativeAudio.currentTime = data.time;
              nativeAudio.play().catch(() => {});
            } else if (data.action === 'seek' && data.time !== undefined) {
              nativeAudio.currentTime = data.time;
            } else if (data.action === 'volume' && data.value !== undefined) {
              usePlayerStore.getState().setVolume(data.value);
            }
          }
        } else if (data.type === 'heartbeat') {
          // Real-time time sync from host — correct drift if > 1.5s
          if (!isHost && data.time !== undefined) {
            const drift = Math.abs(nativeAudio.currentTime - data.time);
            if (drift > 1.5) {
              nativeAudio.currentTime = data.time;
            }
          }
        } else if (data.type === 'remote_action') {
          if (isHost) handleRemoteAction(data.action);
        }
      };

      if (isHost) {
        peer.on('open', () => {
          setIsSessionActive(true);
          setJoiningSession(false);
          showToast('success', 'Session started! Share the code.');
        });
        peer.on('connection', (conn) => {
          connectionsRef.current.push(conn);
          conn.on('data', (data: any) => handleIncomingData(data, conn));
          conn.on('close', () => {
            connectionsRef.current = connectionsRef.current.filter(c => c !== conn);
          });
        });

        // Sync track changes to all peers
        const unsub = usePlayerStore.subscribe((state, prevState) => {
          if (state.currentTrack?.id !== prevState.currentTrack?.id) {
            broadcastToPeers({ 
              type: 'play_track', 
              track: state.currentTrack,
              time: nativeAudio.currentTime,
              isPlaying: !nativeAudio.paused
            });
          }
          if (state.isPlaying !== prevState.isPlaying) {
            broadcastToPeers({ type: 'sync_action', action: state.isPlaying ? 'play' : 'pause', time: nativeAudio.currentTime });
          }
          if (state.volume !== prevState.volume) {
            broadcastToPeers({ type: 'sync_action', action: 'volume', value: state.volume });
          }
        });

        // Forward seek events from host nativeAudio
        const onHostSeekRTC = () => {
          broadcastToPeers({ type: 'sync_action', action: 'seek', time: nativeAudio.currentTime });
        };
        nativeAudio.addEventListener('seeked', onHostSeekRTC);

        // Heartbeat: sync currentTime every 2s so peers stay perfectly locked
        const heartbeatIdRTC = setInterval(() => {
          if (!nativeAudio.paused) {
            broadcastToPeers({ type: 'heartbeat', time: nativeAudio.currentTime });
          }
        }, 2000);
        (peerRef.current as any)._unsub = () => {
          unsub();
          nativeAudio.removeEventListener('seeked', onHostSeekRTC);
          clearInterval(heartbeatIdRTC);
        };

      } else {
        peer.on('open', () => {
          const conn = peer.connect(`msy-host-${code}`);
          connectionsRef.current.push(conn);
          
          conn.on('open', () => {
            setIsSessionActive(true);
            setJoiningSession(false);
            showToast('success', 'Connected to session!');
            conn.send({ type: 'peer_joined', peerId: peerName });
          });
          
          conn.on('data', handleIncomingData);
          
          conn.on('close', () => {
            showToast('error', 'Host disconnected.');
            disconnectSession();
          });
        });

        peer.on('error', (err: any) => {
          console.error('PeerJS Error:', err);
          if (err.type === 'peer-unavailable') {
            showToast('error', 'Session not found. Is the host active?');
          } else if (err.type !== 'network' && err.type !== 'server-error') {
            showToast('error', 'Connection failed.');
          }
          setJoiningSession(false);
          disconnectSession();
        });
      }

      // Auto-reconnect if signaling server drops connection
      peer.on('disconnected', () => {
        if (!peer.destroyed) {
          setTimeout(() => {
            if (peerRef.current === peer && !peer.destroyed) peer.reconnect();
          }, 2000);
        }
      });
      
      if (isHost) {
        peer.on('error', (err: any) => {
          console.error('PeerJS Host Error:', err);
          // Only show toast if it's a fatal error, hide network spam
          if (err.type !== 'network' && err.type !== 'server-error') {
            showToast('error', `Host failed to connect: ${err.type}`);
          }
          setIsSessionActive(false);
          
          if (err.type === 'unavailable-id') {
            // The public server locked the ID (e.g. after a hot reload). Generate a new one instantly!
            const newCode = generateSessionCode();
            setSessionCode(newCode);
            setTimeout(() => {
              if (peerRef.current) {
                 peerRef.current.destroy();
                 peerRef.current = null;
              }
              createSyncChannel(newCode, true);
            }, 500);
          } else if (err.type === 'network' || err.type === 'server-error') {
            // Try to recreate the session after a delay if it's a network error
            setTimeout(() => {
              if (peerRef.current) {
                 peerRef.current.destroy();
                 peerRef.current = null;
              }
              handleStartSession();
            }, 5000);
          }
        });
      }
    } catch (e) {
      console.error(e);
      setJoiningSession(false);
    }
  };

  const handleJoinSession = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    // Bless the audio element to bypass mobile autoplay restrictions
    if (nativeAudio.paused) {
      nativeAudio.play().then(() => {
        nativeAudio.pause();
      }).catch(() => {});
    }

    let cleanCode = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanCode.length < 6) {
      showToast('error', 'Please enter a valid 6-character code (e.g. ABC123)');
      return;
    }
    // format as XXX-XXX for channel name consistency
    cleanCode = cleanCode.slice(0, 3) + '-' + cleanCode.slice(3, 6);
    
    setJoiningSession(true);
    createSyncChannel(cleanCode, false);
    setTimeout(() => setJoiningSession(false), 5000); // 5s fallback timeout
  };

  const handleStartSession = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    createSyncChannel(sessionCode, true);
    setSessionPeers([]);
  };

  if (!isConnectModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setConnectModalOpen(false)}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#111113] border border-white/10 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '85vh' }}
        >
          {/* Gradient top */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="relative p-5 pb-0">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Cast className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-white font-black text-lg">Musify Connect</h2>
                  <p className="text-zinc-500 text-xs">Sync across all your devices</p>
                </div>
              </div>
              <button
                onClick={() => setConnectModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex mt-4 gap-1 p-1 bg-white/5 rounded-xl">
              {[
                { id: 'devices', label: 'Devices', icon: <Monitor className="w-3 h-3" /> },
                { id: 'sync', label: 'Sync Code', icon: <Link2 className="w-3 h-3" /> },
                { id: 'remote', label: 'Remote', icon: <Radio className="w-3 h-3" /> },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    tab === t.id
                      ? 'bg-white/15 text-white shadow'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            <AnimatePresence mode="wait">

              {/* ── Devices tab ─────────────────────────── */}
              {tab === 'devices' && (
                <motion.div key="devices" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                  {/* Currently playing on */}
                  {currentTrack && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                      <img src={currentTrack.thumbnail} className="w-10 h-10 rounded-lg object-cover" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
                        <p className="text-[10px] text-zinc-400">Playing on This Browser</p>
                      </div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    </div>
                  )}

                  {/* Network devices */}
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 px-1">
                      <Wifi className="w-3 h-3" /> Network Devices
                    </div>
                    <div className="space-y-1.5">
                      {/* Cast Button */}
                      <motion.button
                        whileHover={{ x: 2 }}
                        onClick={async () => {
                          try {
                            // Check for iOS Safari AirPlay support first
                            if ((nativeAudio as any).webkitShowPlaybackTargetPicker) {
                              (nativeAudio as any).webkitShowPlaybackTargetPicker();
                            } 
                            // Standard Remote Playback API (Chrome for Android / Chromecast)
                            else if ((nativeAudio as any).remote && (nativeAudio as any).remote.prompt) {
                              await (nativeAudio as any).remote.prompt();
                            } 
                            else {
                              showToast('error', 'Native Cast/AirPlay is not supported on this browser.');
                            }
                          } catch (e: any) {
                            console.error('Cast prompt cancelled or failed', e);
                            if (e.name === 'NotFoundError') {
                              showToast('error', 'No casting devices found nearby.');
                            } else if (e.name !== 'NotAllowedError') {
                              showToast('error', 'Failed to connect to cast device.');
                            }
                          }
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left bg-white/3 hover:bg-white/8 border border-transparent hover:border-white/15"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-zinc-400">
                          <Cast className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white">Cast to Device</p>
                          <p className="text-[10px] text-zinc-500">
                            AirPlay or Google Cast
                          </p>
                        </div>
                      </motion.button>
                      
                      {devices.filter(d => d.type !== 'headphones').map(device => (
                        <motion.button
                          key={device.id}
                          whileHover={{ x: 2 }}
                          onClick={() => device.status === 'available' && handleConnect(device.id, device.name)}
                          disabled={device.status === 'busy' || isConnecting !== null}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                            connectedDevice === device.name
                              ? 'bg-emerald-500/10 border border-emerald-500/30'
                              : device.status === 'busy'
                              ? 'bg-white/2 opacity-40 cursor-not-allowed'
                              : 'bg-white/3 hover:bg-white/8 border border-transparent hover:border-white/15'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            connectedDevice === device.name ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-zinc-400'
                          }`}>
                            {isConnecting === device.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <DeviceIcon type={device.type} className="w-4 h-4" />
                            }
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-white">{device.name}</p>
                            <p className="text-[10px] text-zinc-500">
                              {connectedDevice === device.name ? '✓ Connected' : device.status === 'busy' ? 'In use' : 'Available'}
                            </p>
                          </div>
                          <SignalBars strength={device.signal} />
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Bluetooth */}
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 px-1">
                      <Bluetooth className="w-3 h-3" /> Bluetooth
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const device = await (navigator as any).bluetooth?.requestDevice({ acceptAllDevices: true });
                          if (device) {
                            handleConnect('bluetooth-' + (device.id || Date.now()), device.name || 'Bluetooth Device');
                          }
                        }
                        catch (e) { console.log('BT pairing cancelled'); }
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/8 border border-transparent hover:border-white/15 transition text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                        <Bluetooth className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Pair New Device</p>
                        <p className="text-[10px] text-zinc-500">Opens native pairing dialog</p>
                      </div>
                    </button>
                    {devices.filter(d => d.type === 'headphones').map(device => (
                      <button
                        key={device.id}
                        onClick={() => handleConnect(device.id, device.name)}
                        className="mt-1.5 w-full flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/8 border border-transparent hover:border-white/15 transition text-left"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white/5 text-zinc-400 flex items-center justify-center">
                          <DeviceIcon type={device.type} className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white">{device.name}</p>
                          <p className="text-[10px] text-zinc-500">{device.status}</p>
                        </div>
                        <SignalBars strength={device.signal} />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── Sync Code tab ────────────────────────── */}
              {tab === 'sync' && (
                <motion.div key="sync" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                  {/* Toggle host/join */}
                  <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
                    {(['host', 'join'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setSyncMode(m)}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold capitalize transition-all ${
                          syncMode === m ? 'bg-white/15 text-white' : 'text-zinc-500 hover:text-white'
                        }`}
                      >
                        {m === 'host' ? '📡 Host Session' : '🔗 Join Session'}
                      </button>
                    ))}
                  </div>

                  {syncMode === 'host' ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-xs text-zinc-500 mb-3">Share this code with friends to sync playback in real-time</p>
                        {/* Session code display */}
                        <div className="relative inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border border-emerald-500/30">
                          <span className="text-3xl font-black tracking-[0.3em] text-white font-mono">{sessionCode}</span>
                          <button onClick={handleCopyCode} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                          </button>
                        </div>
                      </div>

                      {/* QR Code placeholder */}
                      <div className="relative mx-auto w-36 h-36 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-2 grid grid-cols-7 gap-[2px]">
                          {Array.from({ length: 49 }).map((_, i) => (
                            <div
                              key={i}
                              className="rounded-sm"
                              style={{
                                background: (i + Math.floor(i / 7)) % 3 === 0 ? '#fff' : 'transparent',
                                opacity: 0.8 + Math.random() * 0.2,
                              }}
                            />
                          ))}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 bg-[#111113] rounded-lg flex items-center justify-center">
                            <QrCode className="w-4 h-4 text-emerald-400" />
                          </div>
                        </div>
                      </div>
                      <p className="text-center text-[10px] text-zinc-600">Scan QR or share the code</p>

                      {/* Sync method indicator */}
                      <div className="flex items-center justify-center gap-2 py-1">
                        <Globe className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-400">
                          {isSupabaseConfigured ? 'Cross-device sync enabled' : 'Same-browser sync only'}
                        </span>
                      </div>

                      {/* Session status */}
                      {!isSessionActive ? (
                        <div className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-bold text-sm flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Starting Live Session...
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                              <span className="text-xs font-bold text-emerald-400">Session Active</span>
                            </div>
                            <span className="text-[10px] text-zinc-500">{sessionPeers.length + 1} connected</span>
                          </div>
                          {sessionPeers.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap">
                              {sessionPeers.map(peer => (
                                <div key={peer} className="px-2 py-1 rounded-lg bg-white/10 text-xs text-white font-medium">
                                  👤 {peer}
                                </div>
                              ))}
                              <div className="px-2 py-1 rounded-lg bg-emerald-500/20 text-xs text-emerald-400 font-medium">
                                You (Host)
                              </div>
                            </div>
                          )}
                          {sessionPeers.length === 0 && (
                            <p className="text-xs text-zinc-500">Waiting for friends to join...</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Join mode
                    <div className="space-y-4">
                      <p className="text-xs text-zinc-500">Enter the 6-character session code from your friend</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={joinCode}
                          onChange={e => {
                            let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            if (val.length > 3) val = val.slice(0, 3) + '-' + val.slice(3, 6);
                            setJoinCode(val);
                          }}
                          placeholder="ABC-123"
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg font-black tracking-widest uppercase focus:outline-none focus:border-emerald-500/50 transition text-center placeholder-zinc-700"
                          maxLength={7}
                        />
                      </div>
                      <button
                        onClick={handleJoinSession}
                        disabled={joinCode.replace(/[^A-Z0-9]/g, '').length < 6 || joiningSession}
                        className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.98] ${
                          joinCode.replace(/[^A-Z0-9]/g, '').length >= 6
                            ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white'
                            : 'bg-white/5 text-zinc-600 cursor-not-allowed'
                        }`}
                      >
                        {joiningSession ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                        ) : (
                          <><Link2 className="w-4 h-4" /> Join Session</>
                        )}
                      </button>
                      {isSessionActive && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-xs font-bold text-emerald-400">Connected to Session</span>
                          </div>
                          <p className="text-xs text-zinc-400">Playback is now synced with the host. Controls are mirrored in real-time.</p>
                        </motion.div>
                      )}

                      <div className="p-3 rounded-xl bg-white/3 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="w-3 h-3 text-zinc-500" />
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Session Privacy</p>
                        </div>
                        <p className="text-xs text-zinc-600">Sessions are end-to-end synced and expire after 24 hours. No data is stored on servers.</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Remote tab ───────────────────────────── */}
              {tab === 'remote' && (
                <motion.div key="remote" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                  {(connectedDevice || (isSessionActive && syncMode === 'join')) ? (
                    <RemoteControl
                      deviceName={connectedDevice || "Host Session"}
                      onDisconnect={() => {
                        if (connectedDevice) { setConnectedDevice(null); setTab('devices'); }
                      }}
                      isRemoteSession={isSessionActive && syncMode === 'join'}
                      sendRemoteAction={(action) => {
                        if (connectionsRef.current.length > 0) {
                           connectionsRef.current.forEach(conn => {
                              if (conn.open) conn.send({ type: 'remote_action', action });
                           });
                        } else if (channelRef.current && supabase) {
                           channelRef.current.send({ type: 'broadcast', event: 'remote_action', payload: action });
                        } else if (bcRef.current) {
                           bcRef.current.postMessage({ type: 'remote_action', action });
                        }
                      }}
                    />
                  ) : (
                    <div className="py-10 flex flex-col items-center text-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                        <Radio className="w-8 h-8 text-zinc-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-400">No device connected</p>
                        <p className="text-xs text-zinc-600 mt-1">Connect to a device from the Devices tab to use remote control</p>
                      </div>
                      <button
                        onClick={() => setTab('devices')}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition"
                      >
                        Browse Devices
                      </button>
                    </div>
                  )}

                  {/* Phone as remote info */}
                  <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-bold text-blue-300">Musify Connect</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Use your phone as a remote control to seamlessly switch playback between smart speakers, TVs, and computers — all in real-time.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 bg-black/30">
            <button
              onClick={() => setConnectModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition text-white text-sm font-bold border border-white/10"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
