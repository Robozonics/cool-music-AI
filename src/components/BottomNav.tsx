import React from 'react';
import { Home, Sparkles, Search, HardDrive } from 'lucide-react';

export type TabType = 'home' | 'mood' | 'search' | 'vault';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'mood', icon: Sparkles, label: 'Mood AI' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'vault', icon: HardDrive, label: 'Vault' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-obsidian/90 backdrop-blur-2xl border-t border-white/5 z-30 px-6 flex justify-between items-center pb-safe">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex flex-col items-center justify-center space-y-1 w-16 transition-colors ${
              isActive ? 'text-acid-lime' : 'text-gray-500 hover:text-white'
            }`}
          >
            <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
