import React from 'react';
import type { TabType } from '../../../components/BottomNav';
import { FloatingGlassPlayer } from '../../../components/FloatingGlassPlayer';
import { SyncedLyrics } from '../../../components/SyncedLyrics';
import { usePlayerStore } from '../../../store/usePlayerStore';
import { Camera, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const SoundFusionLayout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const isLyricsOpen = usePlayerStore(state => state.isLyricsOpen);
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const [isDark, setIsDark] = useState(true);

  // Toggle dark/light theme class on document body
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);
  
  return (
    <div className={`hidden md:flex h-screen w-screen overflow-hidden ${isDark ? 'bg-[#000000] text-white' : 'bg-zinc-100 text-zinc-900'} flex-col font-sans antialiased relative`}>
      {/* Animated Background Mesh */}
      <div className={`absolute inset-0 ${isDark ? 'bg-mesh-gradient opacity-20' : 'bg-gradient-to-br from-purple-100 to-lime-100 opacity-50'} mix-blend-screen pointer-events-none transition-all duration-1000`} />
      {/* 
        1. Header Bar (Sticky Top - 64px Height) 
      */}
      <header className={`h-16 w-full shrink-0 flex items-center justify-between px-6 border-b z-50 ${isDark ? 'bg-white/5 border-white/10 backdrop-blur-2xl' : 'bg-white/50 border-black/10 backdrop-blur-2xl'}`}>
        <div className="flex items-center space-x-4">
          <div className="flex gap-2 font-display font-bold text-xl tracking-tighter">
            <span className={isDark ? 'text-white' : 'text-black'}>SOUND</span><span className="text-acid-lime">WAVE</span>
          </div>
        </div>
        
        {/* Dual-Mode Search/Prompt Input */}
        <div className="flex-1 max-w-xl mx-8 relative">
          <input 
            type="text" 
            placeholder='Ask AI: "90s synth-pop for a rainy drive" or Search...'
            className="w-full h-10 bg-white/10 border border-white/20 rounded-full px-5 text-sm focus:outline-none focus:border-acid-lime transition-all"
          />
        </div>

        {/* Global Context Filters & Profile */}
        <div className="flex items-center space-x-4">
          <button className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${isDark ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'}`}>
            <Camera className="w-4 h-4" />
            Share Snippet
          </button>
          
          <button 
            onClick={() => setIsDark(!isDark)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/10 hover:bg-black/20 text-black'}`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-electric-fuchsia to-cyber-cyan cursor-pointer ring-2 ring-white/20"></div>
        </div>
      </header>

      {/* Middle Section (Sidebars + Main Viewport) */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* 2. Left Navigation & Library Sidebar (Fixed Width - 260px) */}
        <aside className={`w-[260px] shrink-0 h-full border-r flex flex-col p-4 overflow-y-auto z-10 ${isDark ? 'bg-white/5 border-white/10 backdrop-blur-[24px]' : 'bg-white/50 border-black/10 backdrop-blur-[24px]'}`}>
          <nav className="space-y-2 mb-8">
            <button 
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'home' ? 'bg-acid-lime text-black shadow-[0_0_15px_rgba(163,230,53,0.3)]' : isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-black hover:bg-black/5'}`}
            >
              <span className="text-xl">🏠</span> <span className="font-display font-bold tracking-wide">Home</span>
            </button>
            <button 
              onClick={() => setActiveTab('search')}
              className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'search' ? 'bg-acid-lime text-black shadow-[0_0_15px_rgba(163,230,53,0.3)]' : isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-black hover:bg-black/5'}`}
            >
              <span className="text-xl">🔍</span> <span className="font-display font-bold tracking-wide">Explore</span>
            </button>
            <button 
              onClick={() => setActiveTab('mood')}
              className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'mood' ? 'bg-acid-lime text-black shadow-[0_0_15px_rgba(163,230,53,0.3)]' : isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-black hover:bg-black/5'}`}
            >
              <span className="text-xl">📻</span> <span className="font-display font-bold tracking-wide">AI Radio</span>
            </button>
            <button 
              onClick={() => setActiveTab('vault')}
              className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'vault' ? 'bg-acid-lime text-black shadow-[0_0_15px_rgba(163,230,53,0.3)]' : isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-black hover:bg-black/5'}`}
            >
              <span className="text-xl">🎧</span> <span className="font-display font-bold tracking-wide">Vault</span>
            </button>
          </nav>
          
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-gray-500 font-bold mb-4">
              <span>Your Library Engine</span>
              <button className="hover:text-white">+</button>
            </div>
            {/* Filterable list placeholders */}
            <ul className="space-y-2 text-sm text-gray-400 font-medium">
              <li className="hover:text-acid-lime cursor-pointer py-2 px-2 rounded-lg hover:bg-white/5 transition-colors" onClick={() => setActiveTab('vault')}>📌 Pinned Favorites</li>
              <li className="hover:text-electric-fuchsia cursor-pointer py-2 px-2 rounded-lg hover:bg-white/5 transition-colors" onClick={() => setActiveTab('vault')}>❤️ Liked Songs</li>
              <li className="hover:text-cyber-cyan cursor-pointer py-2 px-2 rounded-lg hover:bg-white/5 transition-colors" onClick={() => setActiveTab('vault')}>🎧 Downloaded Audiobooks</li>
            </ul>
          </div>
        </aside>

        {/* 3. Main Content Viewport (Fluid Center) */}
        <main className="flex-1 h-full overflow-y-auto relative z-0">
          <div className="p-8 relative z-10 pb-32">
             {/* Dynamic view container switching will happen here */}
             {children}
          </div>
        </main>

        {/* 4. Right Contextual Sidebar (Fixed Width - 320px, Collapsible) */}
        {isLyricsOpen && currentTrack && (
          <aside className={`w-[320px] shrink-0 h-full border-l flex flex-col transition-all duration-300 z-10 pb-24 ${isDark ? 'bg-white/5 border-white/10 backdrop-blur-2xl' : 'bg-white/50 border-black/10 backdrop-blur-2xl'}`}>
            {/* Upper Section: Now Playing Display */}
            <div className={`p-6 border-b shrink-0 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              <div className="w-full aspect-square rounded-xl mb-4 relative overflow-hidden group shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                 <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-display font-black truncate">{currentTrack.title}</h3>
              <p className="text-gray-400 text-sm truncate">{currentTrack.artist}</p>
            </div>
  
            {/* Lower Section: Synced Lyrics Container */}
            <div className="flex-1 overflow-hidden relative bg-[#0a0a0c]">
               <SyncedLyrics inline={true} />
            </div>
          </aside>
        )}
      </div>
      
      {/* Gen Z Floating Glass Player Bar */}
      <FloatingGlassPlayer />
    </div>
  );
};
