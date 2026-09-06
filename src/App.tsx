import { useState, useEffect } from 'react';
import { HomeView } from './components/HomeView';
import { SearchView } from './components/SearchView';
import { MoodView } from './components/MoodView';
import { OfflineVault } from './components/OfflineVault';
import { BottomNav } from './components/BottomNav';
import type { TabType } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { FullPlayer } from './components/FullPlayer';
import { SyncedLyrics } from './components/SyncedLyrics';
import YouTubeAudioEngine from './components/YouTubeAudioEngine';
import { ApiKeyModal } from './components/ApiKeyModal';
import { SpeedWheel } from './components/SpeedWheel';
import { ShareSnippetModal } from './components/ShareSnippetModal';
import { ConnectDeviceModal } from './components/ConnectDeviceModal';
import { usePlayerStore } from './store/usePlayerStore';
import { WifiOff, AlertTriangle, Settings } from 'lucide-react';

import { useAudioAnalyzer } from './store/useAudioAnalyzer';
import { SoundFusionLayout } from './features/soundfusion/layout/SoundFusionLayout';

function App() {
  useAudioAnalyzer();
  const setYtEngine = usePlayerStore(state => state.setYtEngine);
  const isAutoplayBlocked = usePlayerStore(state => state.isAutoplayBlocked);
  const resolveAutoplayBlock = usePlayerStore(state => state.resolveAutoplayBlock);
  const isApiKeyModalOpen = usePlayerStore(state => state.isApiKeyModalOpen);
  const setApiKeyModalOpen = usePlayerStore(state => state.setApiKeyModalOpen);
  
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeView />;
      case 'mood':
        return <MoodView />;
      case 'search':
        return <SearchView />;
      case 'vault':
        return <OfflineVault />;
      default:
        return <HomeView />;
    }
  };

  return (
    <>
      {/* Global Banners */}
      <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col pointer-events-none">
        {isOffline && (
          <div className="bg-electric-fuchsia text-white py-1.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 w-full pointer-events-auto">
            <WifiOff className="w-4 h-4" />
            Offline Mode 📡 - Serving from Vault
          </div>
        )}
        {isAutoplayBlocked && (
          <div className="bg-acid-lime text-obsidian py-2 px-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 w-full shadow-lg pointer-events-auto cursor-pointer animate-pulse" onClick={resolveAutoplayBlock}>
            <AlertTriangle className="w-5 h-5" />
            Browser blocked autoplay. Click anywhere to play.
          </div>
        )}
      </div>

      {/* --- DESKTOP UI (VIBESTREAM 3.0 / SOUNDFUSION HYBRID) --- */}
      <SoundFusionLayout activeTab={activeTab} setActiveTab={setActiveTab}>
         <div onClick={() => isAutoplayBlocked && resolveAutoplayBlock()} className="h-full">
            {renderContent()}
         </div>
      </SoundFusionLayout>

      {/* --- MOBILE UI (ORIGINAL VIBESTREAM) --- */}
      <div 
        className="md:hidden h-screen w-full flex flex-col bg-obsidian text-white overflow-hidden relative font-sans transition-all duration-100 ease-out"
        onClick={() => isAutoplayBlocked && resolveAutoplayBlock()}
      >
        <header className="px-6 py-4 flex justify-between items-center z-10 glass-panel sticky top-0 border-b border-white/5">
          <h1 className="text-2xl font-black tracking-tighter text-white">
            MUSI<span className="text-acid-lime">FY</span>
          </h1>
          <button 
            onClick={() => setApiKeyModalOpen(true)}
            className="p-2 text-gray-400 hover:text-white transition"
          >
            <Settings className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 overflow-hidden relative z-0 pb-40">
          {renderContent()}
        </main>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <MiniPlayer />
        <FullPlayer />
      </div>

      {/* Global Hidden / Overlay Components */}
      <div className="md:hidden">
         <SyncedLyrics />
      </div>
      <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setApiKeyModalOpen(false)} />
      <SpeedWheel />
      <ShareSnippetModal />
      <ConnectDeviceModal />
      <YouTubeAudioEngine ref={(engine) => setYtEngine(engine)} />
    </>
  );
}

export default App;
