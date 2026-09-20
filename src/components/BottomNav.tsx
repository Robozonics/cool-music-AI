import React from 'react';
import { Home, Sparkles, Search, HardDrive, Zap } from 'lucide-react';

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
    { id: 'vault', icon: HardDrive, label: 'Vault' },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 h-16 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-30 px-2 flex justify-between items-center pb-safe overflow-hidden">
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
