import { X, Play, Trash2, GripVertical } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { usePlayerStore } from '../store/usePlayerStore';

export const QueuePanel = () => {
  const queue = usePlayerStore(state => state.queue);
  const isQueueOpen = usePlayerStore(state => state.isQueueOpen);
  const setQueueOpen = usePlayerStore(state => state.setQueueOpen);
  const playTrack = usePlayerStore(state => state.playTrack);
  const removeFromQueue = usePlayerStore(state => state.removeFromQueue);
  const reorderQueue = usePlayerStore(state => state.reorderQueue);

  if (!isQueueOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[59] sm:hidden" 
        onClick={() => setQueueOpen(false)}
      />
      
      <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-[#08080A]/95 backdrop-blur-3xl border-l border-white/10 shadow-[-20px_0_60px_rgba(0,0,0,0.8)] z-[60] flex flex-col transform transition-transform duration-300">
        <div className="p-4 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">Up Next</h2>
            <span className="text-xs font-bold bg-white/10 text-gray-300 px-2 py-1 rounded-full">{queue.length}</span>
          </div>
          <button onClick={() => setQueueOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 sm:p-3 no-scrollbar pb-[max(5rem,env(safe-area-inset-bottom))]">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Play className="w-8 h-8 text-white/20" />
              </div>
              <p className="font-bold">Queue is empty</p>
            </div>
          ) : (
            <Reorder.Group axis="y" values={queue} onReorder={reorderQueue} className="space-y-1.5 sm:space-y-2">
              {queue.map((track, idx) => (
                <Reorder.Item 
                  key={`${track.id}-${idx}`} 
                  value={track}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 group transition-colors relative cursor-default"
                >
                  <div className="text-gray-500 hover:text-white cursor-grab active:cursor-grabbing p-2 touch-none">
                    <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  
                  {/* Clickable area for playing track */}
                  <div 
                    className="flex-1 flex items-center gap-3 min-w-0 cursor-pointer"
                    onClick={() => playTrack(track)}
                  >
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                      <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover pointer-events-none" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Play className="w-6 h-6 text-white fill-current drop-shadow-md" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm sm:text-base font-bold text-white truncate pointer-events-none">{track.title}</p>
                      <p className="text-xs sm:text-sm text-gray-400 truncate pointer-events-none">{track.artist}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => removeFromQueue(idx)}
                    className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all active:scale-95"
                    aria-label="Remove from queue"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </div>
      </div>
    </>
  );
};
