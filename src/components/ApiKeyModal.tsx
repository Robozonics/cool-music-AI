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
  ] as const;

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
          <div className="grid grid-cols-2 gap-3">
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
