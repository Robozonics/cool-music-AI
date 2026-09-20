import React from 'react';
import { X, Play, Trash2 } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

export const QueuePanel = () => {
  const queue = usePlayerStore(state => state.queue);
  const isQueueOpen = usePlayerStore(state => state.isQueueOpen);
  const setQueueOpen = usePlayerStore(state => state.setQueueOpen);
  const playTrack = usePlayerStore(state => state.playTrack);
  const removeFromQueue = usePlayerStore(state => state.removeFromQueue);

  if (!isQueueOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-[var(--color-bg)] border-l border-[var(--color-primary)]/20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-[60] flex flex-col transform transition-transform duration-300">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[var(--color-panel)] backdrop-blur-md">
        <h2 className="text-lg font-bold text-white">Up Next</h2>
        <button onClick={() => setQueueOpen(false)} className="text-gray-400 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>Queue is empty</p>
          </div>
        ) : (
          queue.map((track, idx) => (
            <div key={`${track.id}-${idx}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 group transition-colors">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                <button 
                  onClick={() => playTrack(track)}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Play className="w-6 h-6 text-white fill-current" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{track.title}</p>
                <p className="text-xs text-gray-400 truncate">{track.artist}</p>
              </div>
              <button 
                onClick={() => removeFromQueue(idx)}
                className="p-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
