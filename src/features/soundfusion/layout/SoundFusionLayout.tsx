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
    <div className={`hidden md:flex h-screen w-screen overflow-hidden ${isDark ? 'bg-[#00040a] text-white' : 'bg-zinc-100 text-zinc-900'} flex-col font-sans antialiased relative`}>
      {/* Vibe Orbs (Behind everything) - Navy Blue/Cyan Vibe */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[120px] opacity-20 pointer-events-none mix-blend-screen animate-pulse" />
      <div className="absolute top-1/2 right-1/4 w-[800px] h-[800px] bg-cyan-500 rounded-full blur-[150px] opacity-10 pointer-events-none mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute -bottom-48 -right-32 w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[100px] opacity-20 pointer-events-none mix-blend-screen animate-pulse" style={{ animationDelay: '4s' }} />
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-blue-900 rounded-full blur-[120px] opacity-20 pointer-events-none mix-blend-screen animate-pulse" />
      <div className="absolute top-1/2 right-1/4 w-[800px] h-[800px] bg-cyan-900 rounded-full blur-[150px] opacity-10 pointer-events-none mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute -bottom-48 -right-32 w-[500px] h-[500px] bg-blue-800 rounded-full blur-[100px] opacity-20 pointer-events-none mix-blend-screen animate-pulse" style={{ animationDelay: '4s' }} />

      {/* Animated Background Mesh */}
      <div className={`absolute inset-0 ${isDark ? 'bg-mesh-gradient opacity-20' : 'bg-gradient-to-br from-purple-100 to-lime-100 opacity-50'} mix-blend-screen pointer-events-none transition-all duration-1000`} />
      {/* 
        1. Header Bar (Sticky Top - 64px Height) 
      */}
      <header className={`h-16 w-full shrink-0 flex items-center justify-between px-6 border-b z-50 ${isDark ? 'bg-white/5 border-white/10 backdrop-blur-2xl' : 'bg-white/50 border-black/10 backdrop-blur-2xl'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <AudioWaveform className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-black text-xl tracking-tighter">MUSIFY</span>
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
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => usePlayerStore.getState().setShareSnippetOpen?.(true)}
            className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs uppercase tracking-widest flex items-center space-x-2 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
          >
            <Camera className="w-4 h-4" />
            <span>Share Snippet</span>
          </motion.button>
          
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
