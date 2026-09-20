import React, { useEffect, useState } from 'react';
import { Reorder, AnimatePresence } from 'framer-motion';
import { X, Loader2, Cpu, Waves, Sparkles, Disc, Crosshair, Upload, Search, Music, Plus, Check, Layers } from 'lucide-react';
import { useMashupStore } from '../store/useMashupStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { generateAiMashup } from '../services/mashupService';
import { searchUnblocked } from '../services/unblockedMusicService';
import type { Track } from '../types/music';

export const MashupStudioPanel: React.FC = () => {
  const { 
    isOpen, setIsOpen, selectedTracks, anchorTrackId, 
    status, progress, setStatus, removeTrack, 
    setAnchorTrack, clearQueue, reorderTracks,
    step, targetCount, setStep, setTargetCount, addTrack
  } = useMashupStore();
  const { playTrack, setQueue, queue } = usePlayerStore();
  
  const [localTracks, setLocalTracks] = useState<Track[]>(selectedTracks);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setLocalTracks(selectedTracks);
  }, [selectedTracks]);

  // Debounced search for the mini search bar
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUnblocked(searchQuery);
        setSearchResults(results.slice(0, 15)); // Limit results for mini panel
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  if (!isOpen) return null;
  
  const isGenerating = status !== 'idle' && status !== 'complete' && status !== 'error';
  const canGenerate = selectedTracks.length === targetCount && targetCount !== null;
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    let added = 0;
    files.forEach(file => {
      if (selectedTracks.length + added >= (targetCount || 7)) return;
      
      const tempUrl = URL.createObjectURL(file);
      const newTrack: Track = {
        id: `local-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Local Upload',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=500&auto=format&fit=crop',
        duration: 180, 
        streamUrl: tempUrl,
        source: 'saavn', 
        sourceBadge: 'Upload',
      };
      addTrack(newTrack);
      added++;
    });
    
    if (e.target) {
      e.target.value = '';
    }
  };
  
  const handleGenerate = async () => {
    if (!canGenerate || !anchorTrackId) return;
    try {
      const generatedTrack = await generateAiMashup(selectedTracks, anchorTrackId);
      
      const newQueue = [generatedTrack, ...queue];
      setQueue(newQueue);
      playTrack(generatedTrack);
      
      setStatus('idle');
      clearQueue();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };
  
  const renderStatus = () => {
    if (status === 'idle') return null;
    if (status === 'error') return <div className="text-red-400 text-sm mt-4 text-center">Generation failed. Please try again.</div>;
    
    let icon = <Cpu className="w-5 h-5 animate-pulse text-acid-lime" />;
    let text = 'Processing...';
    
    if (status === 'extracting') {
      icon = <Waves className="w-5 h-5 animate-pulse text-cyan-400" />;
      text = 'Extracting Stems (Demucs v4)...';
    } else if (status === 'syncing') {
      icon = <Crosshair className="w-5 h-5 animate-spin-slow text-fuchsia-400" />;
      text = 'Beatmatching & Key Syncing...';
    } else if (status === 'mastering') {
      icon = <Disc className="w-5 h-5 animate-spin text-acid-lime" />;
      text = 'Mastering Audio & Mixdown...';
    }
    
    return (
      <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/10 relative overflow-hidden">
        <div 
          className="absolute left-0 top-0 bottom-0 bg-white/5 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        <div className="relative flex flex-col items-center justify-center space-y-2 z-10">
          {icon}
          <span className="text-sm font-bold tracking-wide text-white">{text}</span>
          <span className="text-xs text-gray-400 font-mono">{progress}%</span>
        </div>
      </div>
    );
  };

  const renderSelectCount = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-acid-lime/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Layers className="w-8 h-8 text-acid-lime" />
        </div>
        <h3 className="text-xl font-black text-white">New AI Mashup</h3>
        <p className="text-sm text-gray-400">How many tracks do you want to mix together?</p>
      </div>
      
      <div className="grid grid-cols-3 gap-3 w-full">
        {[2, 3, 4, 5, 6, 7].map(num => (
          <button
            key={num}
            onClick={() => setTargetCount(num)}
            className="aspect-square rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-acid-lime/50 text-2xl font-black text-white hover:text-acid-lime transition-all flex flex-col items-center justify-center group"
          >
            {num}
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider group-hover:text-acid-lime/70 mt-1">Tracks</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderSearchTracks = () => (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="p-4 shrink-0 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Select Tracks</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-acid-lime/20 text-acid-lime">
            {selectedTracks.length} / {targetCount}
          </span>
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs to add..."
            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-acid-lime transition-colors"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2 border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/40 rounded-xl flex items-center justify-center gap-2 transition text-xs font-bold tracking-wider"
        >
          <Upload className="w-3 h-3" />
          Upload Local Audio
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isSearching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : searchResults.length > 0 ? (
          searchResults.map(track => {
            const isSelected = selectedTracks.some(t => t.id === track.id);
            return (
              <div 
                key={track.id} 
                onClick={() => !isSelected && addTrack(track)}
                className={`flex items-center p-2 rounded-xl transition-all cursor-pointer ${isSelected ? 'opacity-50 pointer-events-none' : 'hover:bg-white/5 group'}`}
              >
                <img src={track.thumbnail} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{track.title}</p>
                  <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                </div>
                <div className="shrink-0 p-2">
                  {isSelected ? <Check className="w-4 h-4 text-acid-lime" /> : <Plus className="w-4 h-4 text-gray-500 group-hover:text-white" />}
                </div>
              </div>
            );
          })
        ) : searchQuery ? (
          <div className="text-center py-8 text-sm text-gray-500">No results found</div>
        ) : (
          <div className="text-center py-12 px-4 flex flex-col items-center space-y-3">
            <Music className="w-8 h-8 text-gray-600" />
            <p className="text-sm text-gray-400">Search for tracks or use the upload button above to fill your queue.</p>
          </div>
        )}
      </div>
      
      {/* Mini Selected Tracks Tray */}
      {selectedTracks.length > 0 && (
        <div className="p-3 bg-black/40 border-t border-white/10 shrink-0 flex items-center gap-2 overflow-x-auto">
          {selectedTracks.map(t => (
            <div key={t.id} className="relative group shrink-0">
              <img src={t.thumbnail} className="w-10 h-10 rounded-lg object-cover" />
              <button 
                onClick={() => removeTrack(t.id)}
                className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderReady = () => (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="p-4 shrink-0 border-b border-white/10 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Review & Order</span>
        <button onClick={() => setStep('search_tracks')} className="text-xs text-acid-lime hover:underline">Edit Selection</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="text-xs text-gray-500 mb-4 px-2">Drag to reorder. The <strong className="text-acid-lime">Anchor</strong> dictates the final tempo & key.</div>
        <Reorder.Group 
          axis="y" 
          values={localTracks} 
          onReorder={setLocalTracks} 
          className="space-y-2"
        >
          <AnimatePresence>
            {localTracks.map((track) => {
              const isAnchor = track.id === anchorTrackId;
              return (
                <Reorder.Item 
                  key={track.id} 
                  value={track}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  onDragEnd={() => {
                    const newIndex = localTracks.findIndex((t: Track) => t.id === track.id);
                    const oldIndex = selectedTracks.findIndex((t: Track) => t.id === track.id);
                    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                       reorderTracks(oldIndex, newIndex);
                    }
                  }}
                  className={`flex items-center p-2 rounded-xl group relative overflow-hidden transition-colors cursor-grab active:cursor-grabbing ${isAnchor ? 'bg-acid-lime/10 border border-acid-lime/30' : 'bg-white/5 border border-white/5'}`}
                >
                  <img src={track.thumbnail} alt={track.title} className="w-10 h-10 rounded-md object-cover shrink-0" />
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{track.title}</p>
                    <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-black/80 p-1 rounded-lg backdrop-blur-md">
                    {!isAnchor && (
                      <button 
                        onClick={() => setAnchorTrack(track.id)}
                        className="p-1.5 text-gray-400 hover:text-cyan-400 transition"
                        title="Set as Anchor"
                      >
                        <Crosshair className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {isAnchor && (
                    <div className="absolute top-0 right-0 bg-acid-lime text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg">
                      Anchor
                    </div>
                  )}
                </Reorder.Item>
              );
            })}
          </AnimatePresence>
        </Reorder.Group>
      </div>

      <div className="p-4 border-t border-white/10 shrink-0 bg-black/40">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-2 ${
            canGenerate && !isGenerating 
              ? 'bg-acid-lime text-black hover:bg-[#b3ff00] shadow-[0_0_20px_rgba(204,255,0,0.3)] hover:scale-[1.02] active:scale-[0.98]' 
              : 'bg-white/10 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {isGenerating ? 'Processing...' : 'Generate AI Mashup'}
        </button>
        {renderStatus()}
      </div>
    </div>
  );

  return (
    <aside className="w-[340px] shrink-0 h-full border-l border-white/10 flex flex-col transition-all duration-300 z-10 pb-24 bg-[#0a0a0c]/95 md:bg-[#0a0a0c]/80 backdrop-blur-2xl">
      <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-acid-lime" />
          <h2 className="font-display font-black tracking-wide text-lg text-white">Mashup Studio</h2>
        </div>
        <div className="flex items-center gap-2">
           {step !== 'select_count' && (
             <button onClick={clearQueue} className="text-xs text-gray-400 hover:text-white mr-2">Reset</button>
           )}
           <button 
             onClick={() => setIsOpen(false)}
             className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
           >
             <X className="w-5 h-5" />
           </button>
        </div>
      </div>
      
      {step === 'select_count' && renderSelectCount()}
      {step === 'search_tracks' && renderSearchTracks()}
      {step === 'ready' && renderReady()}

      <input 
        type="file" 
        multiple 
        accept="audio/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />
    </aside>
  );
};
