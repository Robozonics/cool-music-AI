import React from 'react';
import { Clock } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const RecentlyPlayedSection: React.FC = () => {
  const recentlyPlayed = useAuthStore((state) => state.recentlyPlayed);

  if (!recentlyPlayed || recentlyPlayed.length === 0) {
    return null; // Don't show if empty
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-emerald-400" />
        <h3 className="text-xl font-bold text-white">Recently Played</h3>
      </div>
      
      <div className="flex overflow-x-auto gap-4 pb-4 snap-x no-scrollbar">
        {recentlyPlayed.map((item, idx) => (
          <div 
            key={`${item.id}-${idx}`} 
            className="snap-start flex-shrink-0 w-32 group cursor-pointer"
          >
            <div className="w-32 h-32 rounded-xl overflow-hidden mb-2 relative">
              <img 
                src={item.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=500'} 
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {/* Visual feedback on hover */}
              </div>
            </div>
            <h4 className="text-white text-sm font-bold truncate">{item.title}</h4>
            <p className="text-zinc-400 text-xs truncate">{item.artist}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
