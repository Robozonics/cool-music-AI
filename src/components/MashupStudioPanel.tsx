import React, { useEffect, useState } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { X, Play, Loader2, Music2, Cpu, Waves, Sparkles, Disc, Trash2, Crosshair } from 'lucide-react';
import { useMashupStore, MashupStatus } from '../../store/useMashupStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { generateAiMashup } from '../../services/mashupService';
import type { Track } from '../../types/music';

export const MashupStudioPanel: React.FC = () => {
  const { 
    isOpen, setIsOpen, selectedTracks, anchorTrackId, 
    status, progress, setStatus, removeTrack, 
    setAnchorTrack, clearQueue, reorderTracks
  } = useMashupStore();
  const { playTrack, setQueue, queue } = usePlayerStore();
  
  const [localTracks, setLocalTracks] = useState<Track[]>(selectedTracks);
  
  useEffect(() => {
    setLocalTracks(selectedTracks);
  }, [selectedTracks]);
  
  if (!isOpen) return null;
  
  const isGenerating = status !== 'idle' && status !== 'complete' && status !== 'error';
  const canGenerate = selectedTracks.length >= 2 && selectedTracks.length <= 7;
  
  const handleGenerate = async () => {
    if (!canGenerate || !anchorTrackId) return;
    try {
      const generatedTrack = await generateAiMashup(selectedTracks, anchorTrackId);
      
      // Add to player queue and play
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

  return (
    <aside className="w-[340px] shrink-0 h-full border-l border-white/10 flex flex-col transition-all duration-300 z-10 pb-24 bg-[#0a0a0c]/80 backdrop-blur-2xl">
      <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-acid-lime" />
          <h2 className="font-display font-black tracking-wide text-lg text-white">Mashup Studio</h2>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-4 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Selected Tracks</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedTracks.length >= 2 ? 'bg-acid-lime/20 text-acid-lime' : 'bg-white/10 text-gray-400'}`}>
            {selectedTracks.length} / 7
          </span>
        </div>
        
        {selectedTracks.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-500 border border-dashed border-white/10 rounded-xl">
            Select 2 to 7 tracks from your library or search to create an AI Mashup.
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
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
                    const newIndex = localTracks.findIndex(t => t.id === track.id);
                    const oldIndex = selectedTracks.findIndex(t => t.id === track.id);
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
                        title="Set as Anchor (Tempo/Key)"
                      >
                        <Crosshair className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => removeTrack(track.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 transition"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs text-gray-400">Anchor dictates the final tempo & key.</span>
          <button 
            onClick={clearQueue}
            disabled={isGenerating || selectedTracks.length === 0}
            className="text-xs text-gray-400 hover:text-white transition disabled:opacity-50"
          >
            Clear All
          </button>
        </div>
        
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
    </aside>
  );
};
