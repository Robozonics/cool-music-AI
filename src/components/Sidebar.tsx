import React from 'react';
import { Home, Sparkles, Search, HardDrive, Settings } from 'lucide-react';
import type { TabType } from './BottomNav';
import { usePlayerStore } from '../store/usePlayerStore';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'mood', icon: Sparkles, label: 'Mood AI' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'vault', icon: HardDrive, label: 'Offline Vault' },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-obsidian border-r border-white/5 h-full p-6">
      <h1 className="text-3xl font-black tracking-tighter text-white mb-12">
        MUSI<span className="text-acid-lime">FY</span>
      </h1>

      <nav className="flex-1 space-y-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center space-x-4 w-full p-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-white/10 text-acid-lime' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : ''}`} />
              <span className="font-bold tracking-wide">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => usePlayerStore.getState().setApiKeyModalOpen(true)}
          className="flex items-center space-x-4 w-full p-3 rounded-xl transition-all text-gray-400 hover:text-white hover:bg-white/5"
        >
          <Settings className="w-6 h-6" />
          <span className="font-bold tracking-wide">Settings</span>
        </button>
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5">
        <p className="text-xs text-gray-500 font-medium">Made by robozonnics</p>
        <p className="text-xs text-acid-lime/70 font-medium mt-1">Crafted with love by rehan</p>
      </div>
    </div>
  );
};
