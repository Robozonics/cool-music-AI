import React from 'react';
import type { TabType } from '../../../components/BottomNav';
import { FloatingGlassPlayer } from '../../../components/FloatingGlassPlayer';
import { SyncedLyrics } from '../../../components/SyncedLyrics';
import { usePlayerStore } from '../../../store/usePlayerStore';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const SoundFusionLayout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const isLyricsOpen = usePlayerStore(state => state.isLyricsOpen);
  const currentTrack = usePlayerStore(state => state.currentTrack);
  
  return (
    <div className="hidden md:flex h-screen w-screen overflow-hidden bg-[#000000] text-white flex-col font-sans antialiased relative">
      {/* 
        1. Header Bar (Sticky Top - 64px Height) 
      */}
      <header className="h-16 w-full shrink-0 flex items-center justify-between px-6 border-b border-white/10 z-50 bg-[#0a0a0c]">
        <div className="flex items-center space-x-4">
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">{'<'}</button>
            <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">{'>'}</button>
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
          {/* Removed non-functional filters for cleaner UI */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-electric-fuchsia to-cyber-cyan cursor-pointer"></div>
        </div>
      </header>

      {/* Middle Section (Sidebars + Main Viewport) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 2. Left Navigation & Library Sidebar (Fixed Width - 280px) */}
        <aside className="w-[280px] shrink-0 h-full bg-[#121216] border-r border-white/5 flex flex-col p-4 overflow-y-auto z-10">
          <nav className="space-y-2 mb-8">
            <button 
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'home' ? 'bg-acid-lime/20 text-acid-lime' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <span className="text-xl">🏠</span> <span className="font-bold tracking-wide">Home</span>
            </button>
            <button 
              onClick={() => setActiveTab('search')}
              className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'search' ? 'bg-acid-lime/20 text-acid-lime' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <span className="text-xl">🔍</span> <span className="font-bold tracking-wide">Explore</span>
            </button>
            <button 
              onClick={() => setActiveTab('mood')}
              className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'mood' ? 'bg-acid-lime/20 text-acid-lime' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <span className="text-xl">📻</span> <span className="font-bold tracking-wide">AI Radio</span>
            </button>
            <button 
              onClick={() => setActiveTab('vault')}
              className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'vault' ? 'bg-acid-lime/20 text-acid-lime' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <span className="text-xl">🎧</span> <span className="font-bold tracking-wide">Vault</span>
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
        <main className="flex-1 h-full overflow-y-auto bg-gradient-to-b from-[#1a1a20] to-[#000000] relative z-0">
          {/* Animated Background Mesh */}
          <div className="absolute inset-0 bg-mesh-gradient opacity-10 mix-blend-screen pointer-events-none" />
          <div className="p-8 relative z-10">
             {/* Dynamic view container switching will happen here */}
             {children}
          </div>
        </main>

        {/* 4. Right Contextual Sidebar (Fixed Width - 320px, Collapsible) */}
        {isLyricsOpen && currentTrack && (
          <aside className="w-[320px] shrink-0 h-full bg-[#121216] border-l border-white/5 flex flex-col transition-all duration-300 z-10 pb-24">
            {/* Upper Section: Now Playing Display */}
            <div className="p-6 border-b border-white/10 shrink-0">
              <div className="w-full aspect-square bg-gray-800 rounded-xl mb-4 relative overflow-hidden group shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                 <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-black text-white truncate">{currentTrack.title}</h3>
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
