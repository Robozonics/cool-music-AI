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
    <div className="fixed bottom-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-bottom,1rem))] pb-[env(safe-area-inset-bottom,1rem)] bg-white/5 backdrop-blur-3xl border-t border-white/10 z-30 px-2 flex justify-around items-center">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex flex-col items-center justify-center space-y-1 flex-1 h-full transition-all active:scale-90 ${
              isActive ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {/* Samples tab gets a special glowing indicator */}
            {tab.id === 'samples' && isActive ? (
              <div className="relative">
                <Icon className="w-6 h-6 stroke-[2.5px] text-acid-lime" />
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-acid-lime rounded-full shadow-[0_0_6px_#a3e635] animate-pulse" />
              </div>
            ) : (
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            )}
            <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
