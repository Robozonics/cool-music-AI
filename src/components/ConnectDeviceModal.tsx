import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Smartphone, Monitor, Tv, Cast, Bluetooth, Wifi, QrCode,
  Copy, Check, Link2, Radio, Loader2,
  Play, Pause, SkipForward, Volume2,
  Laptop, Watch, Speaker, Headphones, Zap, Lock
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

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

// ── Simulated peer devices ─────────────────────────────────────────────
const MOCK_DEVICES = [
  { id: 'dev1', name: 'My MacBook Pro', type: 'laptop', status: 'available' as const, signal: 4 },
  { id: 'dev2', name: 'Living Room TV', type: 'tv', status: 'available' as const, signal: 3 },
  { id: 'dev3', name: 'iPhone 15 Pro', type: 'phone', status: 'available' as const, signal: 5 },
  { id: 'dev4', name: 'Galaxy Watch', type: 'watch', status: 'busy' as const, signal: 2 },
  { id: 'dev5', name: 'Sonos Speaker', type: 'speaker', status: 'available' as const, signal: 4 },
  { id: 'dev6', name: 'AirPods Pro', type: 'headphones', status: 'available' as const, signal: 5 },
];

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
const RemoteControl: React.FC<{ deviceName: string; onDisconnect: () => void }> = ({
  deviceName, onDisconnect
}) => {
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const volume = usePlayerStore(s => s.volume);
  const { togglePlay, nextTrack, prevTrack, setVolume } = usePlayerStore.getState();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-acid-lime/30 bg-acid-lime/5 overflow-hidden"
    >
      <div className="p-3 border-b border-acid-lime/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-acid-lime rounded-full animate-pulse" />
          <span className="text-xs font-bold text-acid-lime">Controlling: {deviceName}</span>
        </div>
        <button onClick={onDisconnect} className="text-xs text-gray-500 hover:text-white transition">
          Disconnect
        </button>
      </div>
      
      {currentTrack && (
        <div className="p-3 flex items-center gap-3">
          <img src={currentTrack.thumbnail} className="w-10 h-10 rounded-lg object-cover" alt="" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
            <p className="text-[10px] text-gray-400 truncate">{currentTrack.artist}</p>
          </div>
        </div>
      )}

      <div className="p-3 flex items-center justify-center gap-4">
        <button onClick={prevTrack} className="p-2 rounded-full hover:bg-white/10 text-white transition">
          <SkipForward className="w-4 h-4 rotate-180" />
        </button>
        <button
          onClick={togglePlay}
          className="p-3 rounded-full bg-acid-lime text-black hover:bg-[#b3ff00] transition"
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black" />}
        </button>
        <button onClick={nextTrack} className="p-2 rounded-full hover:bg-white/10 text-white transition">
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Volume */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <Volume2 className="w-3.5 h-3.5 text-gray-500" />
        <input
          type="range" min={0} max={1} step={0.01} value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-acid-lime cursor-pointer"
        />
        <span className="text-xs text-gray-500 w-8 text-right tabular-nums">{Math.round(volume * 100)}%</span>
      </div>
    </motion.div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────
export const ConnectDeviceModal: React.FC = () => {
  const isConnectModalOpen = usePlayerStore(state => state.isConnectModalOpen);
  const setConnectModalOpen = usePlayerStore(state => state.setConnectModalOpen);
  const currentTrack = usePlayerStore(state => state.currentTrack);

  const [tab, setTab] = useState<'devices' | 'sync' | 'remote'>('devices');
  const [sessionCode] = useState(generateSessionCode);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<'host' | 'join'>('host');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionPeers, setSessionPeers] = useState<string[]>([]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sessionCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = async (deviceId: string, deviceName: string) => {
    setIsConnecting(deviceId);
    await new Promise(r => setTimeout(r, 1200));
    setIsConnecting(null);
    setConnectedDevice(deviceName);
    setTab('remote');
  };

  const handleJoinSession = () => {
    if (joinCode.length < 7) return;
    setIsSessionActive(true);
    setSessionPeers(['User_Alpha', 'User_Beta']);
  };

  const handleStartSession = () => {
    setIsSessionActive(true);
    setSessionPeers([]);
    // Simulate someone joining
    setTimeout(() => setSessionPeers(['User_Gamma']), 3000);
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
                      {MOCK_DEVICES.filter(d => d.type !== 'headphones').map(device => (
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
                        try { await (navigator as any).bluetooth?.requestDevice({ acceptAllDevices: true }); }
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
                    {MOCK_DEVICES.filter(d => d.type === 'headphones').map(device => (
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
                        {copied && <p className="text-xs text-emerald-400 mt-2 font-bold">Copied to clipboard!</p>}
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

                      {/* Session status */}
                      {!isSessionActive ? (
                        <button
                          onClick={handleStartSession}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-sm flex items-center justify-center gap-2"
                        >
                          <Zap className="w-4 h-4" /> Start Live Session
                        </button>
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
                          onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 7))}
                          placeholder="ABC-123"
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg font-black tracking-widest uppercase focus:outline-none focus:border-emerald-500/50 transition text-center placeholder-zinc-700"
                          maxLength={7}
                        />
                      </div>
                      <button
                        onClick={handleJoinSession}
                        disabled={joinCode.length < 7}
                        className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                          joinCode.length >= 7
                            ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white'
                            : 'bg-white/5 text-zinc-600 cursor-not-allowed'
                        }`}
                      >
                        <Link2 className="w-4 h-4" /> Join Session
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
                  {connectedDevice ? (
                    <RemoteControl
                      deviceName={connectedDevice}
                      onDisconnect={() => { setConnectedDevice(null); setTab('devices'); }}
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
