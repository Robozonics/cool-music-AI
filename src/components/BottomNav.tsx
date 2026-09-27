import React from 'react';
import { Home, Sparkles, Search, Library, Zap } from 'lucide-react';

export type TabType = string;

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'mood', icon: Sparkles, label: 'Mood AI' },
    { id: 'samples', icon: Zap, label: 'Samples' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'vault', icon: Library, label: 'Library' },
  ];

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,1rem)+0.5rem)] left-4 right-4 h-16 bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] z-30 px-3 rounded-[2rem] flex justify-around items-center group">
      
      {/* Animated Aura Glow Behind Nav */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[3rem] -z-10" />

      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`relative flex flex-col items-center justify-center space-y-1 flex-1 h-full transition-all duration-300 active:scale-90 ${
              isActive ? 'text-white' : 'text-white/40 hover:text-white/80'
            }`}
          >
            {/* Active Glow Drop */}
            {isActive && (
              <div className="absolute top-0 w-8 h-[2px] bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent shadow-[0_0_10px_rgba(232,121,249,0.8)]" />
            )}
            
            {/* Icon */}
            <div className={`relative transition-transform duration-300 ${isActive ? '-translate-y-1' : ''}`}>
              {tab.id === 'samples' && isActive ? (
                <>
                  <Icon className="w-6 h-6 stroke-[2.5px] text-fuchsia-400 drop-shadow-[0_0_10px_rgba(232,121,249,0.5)]" />
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-fuchsia-400 rounded-full shadow-[0_0_6px_#e879f9] animate-pulse" />
                </>
              ) : (
                <Icon className={`w-5 h-5 md:w-6 md:h-6 ${isActive ? 'stroke-[2.5px] text-fuchsia-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'stroke-2'}`} />
              )}
            </div>
            
            <span className={`text-[9px] md:text-[10px] tracking-wide transition-all duration-300 ${isActive ? 'font-black text-fuchsia-100 opacity-100' : 'font-medium opacity-0 translate-y-2 absolute bottom-2'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
