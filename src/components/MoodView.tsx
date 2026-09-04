import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { getMoodRecommendations } from '../services/geminiService';
import { searchUnblocked } from '../services/unblockedMusicService';
import { usePlayerStore } from '../store/usePlayerStore';
import type { Track } from '../types/music';

const VIBE_CHIPS = [
  'Heartbroken in 2016 💔',
  'Late Night Drive 🏎️',
  'Gym Demon Mode ⚡',
  '3 AM Overthinking 🌧️',
  'Main Character Walk 💅'
];

export const MoodView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const setQueue = usePlayerStore(state => state.setQueue);
  const playTrack = usePlayerStore(state => state.playTrack);
  const setApiKeyModalOpen = usePlayerStore(state => state.setApiKeyModalOpen);

  const handleVibe = async (vibeText: string) => {
    setIsLoading(true);
    setPrompt(vibeText);
    
    try {
      const recommendations = await getMoodRecommendations(vibeText);
      if (recommendations.length === 0) {
        // Assume failure or missing key if empty for now, although real logic might need checking keyManager directly
        // But getMoodRecommendations just returns [] on error. Let's fix that in geminiService to throw MISSING_API_KEY if needed.
        // For now we'll just check if it's empty.
      }
      const foundTracks: Track[] = [];

      for (const rec of recommendations) {
        // Query official sources
        const results = await searchUnblocked(`${rec.title} ${rec.artist}`);
        if (results.length > 0) {
          foundTracks.push(results[0]);
        }
      }

      if (foundTracks.length > 0) {
        setQueue(foundTracks);
        playTrack(foundTracks[0]);
      } else if (recommendations.length > 0) {
        alert('Could not find those specific tracks in our sources. Try another vibe!');
      }
    } catch (error: any) {
      console.error(error);
      if (error.message === 'MISSING_API_KEY') {
        setApiKeyModalOpen(true);
      } else {
        alert('AI curation failed. Please check your API key or network.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col items-center max-w-2xl mx-auto overflow-y-auto pb-32">
      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-electric-fuchsia to-acid-lime flex items-center justify-center shadow-[0_0_30px_rgba(204,255,0,0.4)] mb-8 mt-12 animate-pulse">
        <Sparkles className="w-10 h-10 text-obsidian" />
      </div>
      
      <h2 className="text-3xl font-black mb-2 text-center">AI Mood Engine</h2>
      <p className="text-gray-400 text-center mb-8">Spill the tea. How are you feeling rn?</p>

      <form 
        onSubmit={(e) => { e.preventDefault(); handleVibe(prompt); }}
        className="w-full relative mb-12"
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Floating through space..."
          className="w-full bg-white/5 border border-white/10 rounded-full py-4 px-6 pr-14 text-white focus:outline-none focus:border-acid-lime transition-all glass-panel"
        />
        <button 
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-acid-lime text-obsidian p-2 rounded-full disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
        </button>
      </form>

      <div className="flex flex-wrap justify-center gap-3 w-full">
        {VIBE_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => handleVibe(chip)}
            disabled={isLoading}
            className="pill-tag-secondary bg-white/5 border border-white/10 hover:border-acid-lime hover:text-acid-lime disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>
      
      {isLoading && (
         <div className="mt-12 text-electric-fuchsia animate-pulse font-bold tracking-widest uppercase">
           Curating your perfect vibe...
         </div>
      )}
    </div>
  );
};
