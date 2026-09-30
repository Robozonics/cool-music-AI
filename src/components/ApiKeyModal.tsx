import React from 'react';
import { X, Palette, Keyboard } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const theme = usePlayerStore(state => state.theme);
  const setTheme = usePlayerStore(state => state.setTheme);

  if (!isOpen) return null;

  const themes = [
    { id: 'default', name: 'Acid Lime', color: '#CCFF00', bg: '#050505' },
    { id: 'cyberpunk', name: 'Cyberpunk', color: '#FF00FF', bg: '#090014' },
    { id: 'midnight', name: 'Midnight', color: '#00E5FF', bg: '#000B18' },
    { id: 'sunset', name: 'Sunset', color: '#FF4D00', bg: '#1A0500' },
    { id: 'aura', name: 'Aura', color: '#B200FF', bg: '#030008' },
    { id: 'aura-blue', name: 'Aura Blue', color: '#0066FF', bg: '#000B1A' },
    { id: 'aura-green', name: 'Aura Green', color: '#00FF66', bg: '#001A0B' },
    { id: 'aura-red', name: 'Aura Red', color: '#FF0033', bg: '#1A0005' },
    { id: 'aura-pink', name: 'Aura Pink', color: '#FF0099', bg: '#1A0010' },
    { id: 'aura-yellow', name: 'Aura Yellow', color: '#FFD700', bg: '#1A1600' },
    { id: 'aura-orange', name: 'Aura Orange', color: '#FF6600', bg: '#1A0A00' },
    { id: 'aura-cyan', name: 'Aura Cyan', color: '#00FFFF', bg: '#001A1A' },
    { id: 'aura-teal', name: 'Aura Teal', color: '#008080', bg: '#001A1A' },
    { id: 'aura-emerald', name: 'Aura Emerald', color: '#50C878', bg: '#0B1A10' },
    { id: 'aura-rose', name: 'Aura Rose', color: '#FF007F', bg: '#1A000D' },
    { id: 'aura-y2k', name: 'Y2K Pink', color: '#FF00CC', bg: '#110011' },
    { id: 'aura-vaporwave', name: 'Vaporwave', color: '#00FFFF', bg: '#1A0033' },
    { id: 'aura-goth', name: 'Pastel Goth', color: '#DDA0DD', bg: '#0F0F1A' },
    { id: 'aura-matcha', name: 'Matcha Latte', color: '#C1E1C1', bg: '#0A120A' },
    { id: 'aura-lavender', name: 'Lavender Haze', color: '#E6E6FA', bg: '#100B1A' },
    { id: 'aura-peach', name: 'Peach Fuzz', color: '#FFDAB9', bg: '#1A0F0A' },
    { id: 'aura-electric', name: 'Electric Indigo', color: '#6F00FF', bg: '#06001A' },
    { id: 'aura-neon-lime', name: 'Neon Lime', color: '#39FF14', bg: '#051A05' },
    { id: 'aura-blood', name: 'Vampire Red', color: '#8A0303', bg: '#140000' },
    { id: 'aura-ice', name: 'Glacier Blue', color: '#A5F2F3', bg: '#001414' },
    { id: 'aura-slime', name: 'Slime Green', color: '#BFFF00', bg: '#0A1400' },
    { id: 'aura-barbie', name: 'Barbiecore', color: '#E0218A', bg: '#1A0010' },
    { id: 'aura-sunset-glow', name: 'Sunset Glow', color: '#FF7E67', bg: '#1A0B05' },
    { id: 'aura-cosmic', name: 'Cosmic Dust', color: '#B0C4DE', bg: '#050A14' },
    { id: 'aura-holographic', name: 'Holographic', color: '#E6A8D7', bg: '#0D0A14' },
    { id: 'aura-grunge', name: 'Fairy Grunge', color: '#8F9779', bg: '#0F120F' },
    { id: 'aura-ocean', name: 'Deep Ocean', color: '#006994', bg: '#000A14' },
    { id: 'aura-cherry', name: 'Cherry Bomb', color: '#D2042D', bg: '#140005' },
    { id: 'aura-acid', name: 'Acid Wash', color: '#7DF9FF', bg: '#00141A' },
    { id: 'aura-midnight-plum', name: 'Midnight Plum', color: '#4A0E4E', bg: '#0A000A' },
    { id: 'aura-toxic', name: 'Toxic Waste', color: '#7FFF00', bg: '#051400' },
    { id: 'aura-bubblegum', name: 'Bubblegum', color: '#FFC1CC', bg: '#140A0F' },
    { id: 'aura-starlight', name: 'Starlight', color: '#F4F6F0', bg: '#0A0A0A' },
    { id: 'aura-abyss', name: 'Abyss', color: '#2F4F4F', bg: '#050A0A' },
    { id: 'aura-tangerine', name: 'Tangerine', color: '#F28500', bg: '#140A00' },
    { id: 'aura-raspberry', name: 'Raspberry', color: '#E30B5D', bg: '#14000A' },
    { id: 'aura-mint', name: 'Mint Frost', color: '#98FF98', bg: '#05140F' },
    { id: 'aura-obsidian', name: 'Obsidian', color: '#4B0082', bg: '#000000' },
    { id: 'aura-chrome', name: 'Liquid Chrome', color: '#C0C0C0', bg: '#0A0A0A' },
    { id: 'aura-sunflower', name: 'Sunflower', color: '#FFC512', bg: '#141000' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-[var(--color-bg)] border border-[var(--color-primary)]/30 rounded-3xl p-8 shadow-[0_0_50px_-12px_var(--color-primary)] animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-8">
          <h2 className="text-2xl font-black text-white tracking-tighter">APP SETTINGS</h2>
        </div>

        {/* Theme Engine */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4 text-gray-300 font-bold">
            <Palette className="w-5 h-5 text-[var(--color-primary)]" />
            <h3>Aura Themes</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${theme === t.id ? 'border-[var(--color-primary)] bg-[var(--color-panel)] shadow-[0_0_15px_rgba(var(--color-primary),0.2)]' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
              >
                <div className="w-6 h-6 rounded-full border border-white/20 shadow-inner" style={{ background: `linear-gradient(135deg, ${t.color} 0%, ${t.bg} 100%)` }} />
                <span className="text-sm font-semibold text-white">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hotkeys Reference */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4 text-gray-300 font-bold">
            <Keyboard className="w-5 h-5 text-[var(--color-primary)]" />
            <h3>Global Hotkeys</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-400 bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex justify-between"><span>Play / Pause</span><kbd className="bg-white/10 px-2 py-0.5 rounded text-white">Space</kbd></div>
            <div className="flex justify-between"><span>Next / Prev</span><kbd className="bg-white/10 px-2 py-0.5 rounded text-white">Arrows</kbd></div>
            <div className="flex justify-between"><span>Mute Toggle</span><kbd className="bg-white/10 px-2 py-0.5 rounded text-white">M</kbd></div>
            <div className="flex justify-between"><span>Video Mode</span><kbd className="bg-white/10 px-2 py-0.5 rounded text-white">F</kbd></div>
            <div className="flex justify-between"><span>Toggle Lyrics</span><kbd className="bg-white/10 px-2 py-0.5 rounded text-white">L</kbd></div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-4 rounded-full font-black text-lg bg-[var(--color-primary)] text-[var(--color-bg)] hover:brightness-110 shadow-[0_0_20px_var(--color-primary)] transition-all"
        >
          Save & Close
        </button>
      </div>
    </div>
  );
};
