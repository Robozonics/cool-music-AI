import { useEffect, useRef } from 'react';
import { nativeAudio } from './usePlayerStore';

export const useAudioAnalyzer = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // Only set up if we don't have it yet and the audio element exists
    if (!audioCtxRef.current && nativeAudio) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;
      
      const source = ctx.createMediaElementSource(nativeAudio);
      source.connect(analyzer);
      analyzer.connect(ctx.destination);
      
      audioCtxRef.current = ctx;
      analyzerRef.current = analyzer;
      dataArrayRef.current = new Uint8Array(analyzer.frequencyBinCount);
    }

    const updateVibe = () => {
      if (analyzerRef.current && dataArrayRef.current) {
        analyzerRef.current.getByteFrequencyData(dataArrayRef.current as any);
        
        // Calculate bass (lower frequencies)
        let bassSum = 0;
        const bassCount = 10;
        for (let i = 0; i < bassCount; i++) {
          bassSum += dataArrayRef.current[i];
        }
        const bassAvg = bassSum / bassCount;
        
        // Vibe intensity (0.0 to 1.0)
        const intensity = bassAvg / 255;
        
        // Update a CSS variable on the document root
        document.documentElement.style.setProperty('--vibe-intensity', intensity.toString());
      }
      
      rafId.current = requestAnimationFrame(updateVibe);
    };

    // Ensure audio context is resumed on user interaction
    const handleInteraction = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };
    
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    
    updateVibe();

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);
};
