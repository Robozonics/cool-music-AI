import { useState, useEffect } from 'react';
import { HomeView } from './components/HomeView';
import { SearchView } from './components/SearchView';
import { MoodView } from './components/MoodView';
import { OfflineVault } from './components/OfflineVault';
import { PlaylistView } from './components/PlaylistView';
import { BottomNav } from './components/BottomNav';
import type { TabType } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { FullPlayer } from './components/FullPlayer';
import { SyncedLyrics } from './components/SyncedLyrics';
import { ApiKeyModal } from './components/ApiKeyModal';
import { SpeedWheel } from './components/SpeedWheel';
import { ShareSnippetModal } from './components/ShareSnippetModal';
import { VisualCanvasEngine } from './components/VisualCanvasEngine';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { ConnectDeviceModal } from './components/ConnectDeviceModal';
import { SamplesFeed } from './components/SamplesFeed';
import { QueuePanel } from './components/QueuePanel';
import { MobileAICommandBox } from './components/MobileAICommandBox';
import { AuthModal } from './components/AuthModal';
import { SpotifyAccountButton } from './components/SpotifyAccountButton';
import { ToastContainer } from './components/ToastNotification';
import { SleepTimer } from './components/SleepTimer';
import { usePlayerStore } from './store/usePlayerStore';
import { WifiOff, AlertTriangle, Settings, Sparkles, Mic, Layers, Moon } from 'lucide-react';
import { useAudioAnalyzer } from './store/useAudioAnalyzer';
import { SoundFusionLayout } from './features/soundfusion/layout/SoundFusionLayout';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useWakeWord } from './hooks/useWakeWord';
import { useAICommandProcessor } from './hooks/useAICommandProcessor';
import { useMashupStore } from './store/useMashupStore';
import { MashupStudioPanel } from './components/MashupStudioPanel';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';

const pageVariants: Variants = {
  initial: { opacity: 0, y: 15, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.2 } }
};

function App() {
  useAudioAnalyzer();
  useKeyboardShortcuts();
  const isAutoplayBlocked = usePlayerStore(state => state.isAutoplayBlocked);
  const resolveAutoplayBlock = usePlayerStore(state => state.resolveAutoplayBlock);
  const isApiKeyModalOpen = usePlayerStore(state => state.isApiKeyModalOpen);
  const setApiKeyModalOpen = usePlayerStore(state => state.setApiKeyModalOpen);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const theme = usePlayerStore(state => state.theme);
  const activeEraTheme = usePlayerStore(state => state.activeEraTheme);
  
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isAiCommandOpen, setAiCommandOpen] = useState(false);
  const isMashupOpen = useMashupStore(state => state.isOpen);
  const setMashupOpen = useMashupStore(state => state.setIsOpen);
  const [isSleepTimerOpen, setSleepTimerOpen] = useState(false);

  const { processCommand } = useAICommandProcessor();
  const { isListening, toggleWakeWord } = useWakeWord((command) => {
    if (command) {
      processCommand(command, () => setAiCommandOpen(true));
    } else {
      setAiCommandOpen(true);
    }
  });

  useEffect(() => {
    if (activeEraTheme) {
      document.documentElement.setAttribute('data-theme', activeEraTheme);
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme, activeEraTheme]);

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
    if (activeTab.startsWith('playlist:')) {
      return <PlaylistView playlistId={activeTab.split(':')[1]} setActiveTab={setActiveTab} />;
    }
    
    switch (activeTab) {
      case 'home':
        return <HomeView setActiveTab={setActiveTab} />;
      case 'mood':
        return <MoodView />;
      case 'search':
        return <SearchView />;
      case 'samples':
        return <SamplesFeed />;
      case 'vault':
        return <OfflineVault setActiveTab={setActiveTab} />;
      default:
        return <HomeView setActiveTab={setActiveTab} />;
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
        className="md:hidden h-[100dvh] w-full flex flex-col bg-obsidian text-white overflow-hidden relative font-sans"
        onClick={() => isAutoplayBlocked && resolveAutoplayBlock()}
      >
        <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none -z-20 opacity-20 ${isPlaying ? 'genz-playing-bg' : 'opacity-0'}`} />
        {theme === 'aura' && <div className="absolute inset-0 aura-animated-bg pointer-events-none -z-15" />}
        {/* Aura theme: extra floating orbs - Optimized for mobile performance */}
        {theme === 'aura' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none -z-18">
            <div className="absolute top-[10%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-violet-500/20 blur-[60px] opacity-70" />
            <div className="absolute bottom-[20%] right-[5%] w-[45vw] h-[45vw] rounded-full bg-fuchsia-500/20 blur-[70px] opacity-70" />
          </div>
        )}
        {/* Default orbs (non-aura) - Removed animate-pulse for mobile performance */}
        {theme !== 'aura' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none -z-20">
            <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-purple-600/20 blur-[80px] opacity-70" />
            <div className="absolute top-[40%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-cyan-600/15 blur-[90px] opacity-70" />
            <div className="absolute -bottom-[10%] left-[10%] w-[80vw] h-[80vw] rounded-full bg-pink-600/15 blur-[100px] opacity-70" />
          </div>
        )}
        <div className="absolute inset-0 bg-obsidian/70 vibe-pulse pointer-events-none -z-10" />
        <header className={`px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 sm:px-6 sm:pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:pb-4 flex justify-between items-center z-10 bg-white/5 backdrop-blur-3xl sticky top-0 border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.3)] ${theme === 'aura' ? 'aura-header-glow border-purple-500/20' : ''}`}>
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            MUSI<span className="text-acid-lime drop-shadow-[0_0_15px_rgba(163,230,53,0.5)]">FY</span>
          </h1>
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto overflow-y-hidden no-scrollbar max-w-[65vw] pl-2 py-1">
            <button 
              onClick={toggleWakeWord}
              className={`p-2 shrink-0 transition rounded-full ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Hey Musify (Continuous Listening)"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setAiCommandOpen(!isAiCommandOpen)}
              className="p-2 shrink-0 text-purple-400 hover:text-purple-300 transition"
              title="AI Command Box"
            >
              <Sparkles className="w-6 h-6" />
            </button>

            <button 
              onClick={() => setMashupOpen(!isMashupOpen)}
              className={`p-2 shrink-0 transition rounded-full ${isMashupOpen ? 'text-acid-lime bg-acid-lime/10 shadow-[0_0_15px_rgba(204,255,0,0.4)]' : 'text-gray-400 hover:text-white'}`}
              title="AI Mashup Studio"
            >
              <Layers className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setSleepTimerOpen(true)}
              className="p-2 shrink-0 text-purple-400 hover:text-purple-300 transition"
              title="Sleep Timer"
            >
              <Moon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setApiKeyModalOpen(true)}
              className="p-2 shrink-0 text-gray-400 hover:text-white transition"
              title="Settings"
            >
              <Settings className="w-6 h-6" />
            </button>
            <div className="shrink-0">
              <SpotifyAccountButton />
            </div>
          </div>
        </header>
        <div className="relative z-10">
          <MobileAICommandBox isOpen={isAiCommandOpen} onClose={() => setAiCommandOpen(false)} />
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-0 pb-48">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <MiniPlayer />
        <FullPlayer />
      </div>

      {/* Global Hidden / Overlay Components */}
      <div className="md:hidden">
         <SyncedLyrics />
         <MashupStudioPanel />
      </div>
      <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setApiKeyModalOpen(false)} />
      <SpeedWheel />
      <ShareSnippetModal />
      <ConnectDeviceModal />
      <VisualCanvasEngine />
      <AddToPlaylistModal />
      <QueuePanel />
      <AuthModal />
      <SleepTimer isOpen={isSleepTimerOpen} onClose={() => setSleepTimerOpen(false)} />
      <ToastContainer />
      
      {/* Premium Texture Overlay */}
      <div className="noise-overlay" />
    </>
  );
}

export default App;
