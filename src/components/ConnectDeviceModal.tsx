import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Monitor, Tv, Cast, Bluetooth, Wifi } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

export const ConnectDeviceModal: React.FC = () => {
  const isConnectModalOpen = usePlayerStore(state => state.isConnectModalOpen);
  const setConnectModalOpen = usePlayerStore(state => state.setConnectModalOpen);

  if (!isConnectModalOpen) return null;

  return (
    <AnimatePresence>
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 pb-24 sm:pb-4 pointer-events-auto">
          {/* Blur Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConnectModalOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, y: "100%", scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: "100%", scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-[#18181b] border border-white/10 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-6 pb-4 flex justify-between items-center border-b border-white/5 relative bg-gradient-to-r from-lime-500/10 to-emerald-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center">
                  <Cast className="w-5 h-5 text-lime-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">Connect to a device</h2>
                  <p className="text-zinc-400 text-xs">Listening on This Web Browser</p>
                </div>
              </div>
              <button 
                onClick={() => setConnectModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Device List */}
            <div className="p-4 overflow-y-auto space-y-2">
              <div className="text-xs font-bold tracking-widest text-zinc-500 uppercase px-2 py-1 mb-2 flex items-center gap-2">
                <Wifi className="w-3 h-3" /> Network Devices
              </div>
              
              <DeviceItem icon={<Monitor className="w-5 h-5" />} name="Alex's MacBook Pro" status="Available" />
              <DeviceItem icon={<Tv className="w-5 h-5" />} name="Living Room TV" status="Available" />
              <DeviceItem icon={<Smartphone className="w-5 h-5" />} name="iPhone 15 Pro Max" status="Available" />

              <div className="text-xs font-bold tracking-widest text-zinc-500 uppercase px-2 py-1 mt-6 mb-2 flex items-center gap-2">
                <Bluetooth className="w-3 h-3" /> Bluetooth
              </div>
              
              <button 
                onClick={async () => {
                  try {
                    // Trigger actual native browser Bluetooth dialog
                    await (navigator as any).bluetooth.requestDevice({ acceptAllDevices: true });
                  } catch (e) {
                    console.error("Bluetooth pairing cancelled or failed", e);
                  }
                }}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors text-left group"
              >
                <div className="text-zinc-400 group-hover:text-lime-400 transition-colors">
                  <Bluetooth className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">Pair New Bluetooth Device</div>
                  <div className="text-zinc-500 text-xs">Click to open native pairing</div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="p-4 bg-black/40 border-t border-white/5 mt-auto">
              <button className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white text-sm font-bold border border-white/10">
                Help & Troubleshooting
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const DeviceItem = ({ icon, name, status }: { icon: React.ReactNode, name: string, status: string }) => (
  <button className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors text-left group">
    <div className="text-zinc-400 group-hover:text-lime-400 transition-colors">
      {icon}
    </div>
    <div className="flex-1">
      <div className="text-white font-medium text-sm">{name}</div>
      <div className="text-zinc-500 text-xs">{status}</div>
    </div>
  </button>
);
