import { useEffect } from 'react';
import { usePlayerStore } from './usePlayerStore';

export const useAudioAnalyzer = () => {
  const isPlaying = usePlayerStore((state) => state.isPlaying);

  useEffect(() => {
    let rafId: number;
    let phase = 0;
    
    const updateVibe = () => {
      if (isPlaying) {
        // Create a simulated beat pulse based on time
        // Fast pulse roughly around 120bpm -> 2 beats per second -> Math.sin(time)
        phase += 0.1;
        const pulse = (Math.sin(phase) + 1) / 2; // 0 to 1
        // Smooth random intensity for "vibe"
        const randomVibe = (Math.sin(phase * 0.3) + Math.cos(phase * 0.7) + 2) / 4; 
        const intensity = pulse * randomVibe;
        
        document.documentElement.style.setProperty('--vibe-intensity', intensity.toString());
      } else {
        document.documentElement.style.setProperty('--vibe-intensity', '0');
      }
      
      rafId = requestAnimationFrame(updateVibe);
    };
    
    updateVibe();
    
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isPlaying]);
};
