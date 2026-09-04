// @ts-nocheck
import { useRef, useEffect, useState, useCallback } from 'react';
import type { Track } from '../../../types/music';

const CROSSFADE_DURATION = 3.0; // seconds

/**
 * useGaplessPlayer
 * Manages dual <audio> elements for seamless, gapless playback
 * and applies equal-power crossfade curves between tracks.
 */
export const useGaplessPlayer = () => {
  const playerA = useRef<HTMLAudioElement | null>(null);
  const playerB = useRef<HTMLAudioElement | null>(null);
  
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A');
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [nextTrack, setNextTrack] = useState<Track | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const rafRef = useRef<number>();
  const isPreloadingRef = useRef(false);

  // Crossfade Loop
  useEffect(() => {
    const monitorCrossfade = () => {
      const active = activePlayer === 'A' ? playerA.current : playerB.current;
      const inactive = activePlayer === 'A' ? playerB.current : playerA.current;
      
      if (active && nextTrack && !isCrossfading && !isPreloadingRef.current) {
        const remaining = active.duration - active.currentTime;
        
        // Start preloading if within transition window + 2 seconds buffer
        if (remaining <= CROSSFADE_DURATION + 2 && inactive.src !== nextTrack.streamUrl) {
          isPreloadingRef.current = true;
          inactive.src = nextTrack.streamUrl;
          inactive.load();
        }
        
        // Trigger Crossfade
        if (remaining <= CROSSFADE_DURATION && remaining > 0) {
          setIsCrossfading(true);
          inactive.play().catch(e => console.error("Auto-play prevented", e));
          
          // Execute Equal-Power Crossfade step
          // T goes from 0 to 1 over CROSSFADE_DURATION
          const t = 1 - (remaining / CROSSFADE_DURATION);
          
          // Volume_A = cos( (pi/2) * t )
          // Volume_B = sin( (pi/2) * t )
          active.volume = Math.max(0, Math.cos((Math.PI / 2) * t));
          inactive.volume = Math.max(0, Math.sin((Math.PI / 2) * t));
        }
      }
      
      // Complete Crossfade
      if (isCrossfading) {
         if (active && active.currentTime >= active.duration - 0.1) {
            active.pause();
            active.currentTime = 0;
            active.volume = 1;
            
            if (inactive) {
                inactive.volume = 1;
            }
            
            setCurrentTrack(nextTrack);
            setNextTrack(null);
            setActivePlayer(activePlayer === 'A' ? 'B' : 'A');
            setIsCrossfading(false);
            isPreloadingRef.current = false;
         } else {
             // Continue interpolating crossfade curves
             const remaining = active ? (active.duration - active.currentTime) : 0;
             const t = Math.max(0, Math.min(1, 1 - (remaining / CROSSFADE_DURATION)));
             
             if (active) active.volume = Math.max(0, Math.cos((Math.PI / 2) * t));
             if (inactive) inactive.volume = Math.max(0, Math.sin((Math.PI / 2) * t));
         }
      }
      
      rafRef.current = requestAnimationFrame(monitorCrossfade);
    };
    
    rafRef.current = requestAnimationFrame(monitorCrossfade);
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activePlayer, nextTrack, isCrossfading]);

  const loadTrack = useCallback((track: Track, queueNextTrack?: Track) => {
     const active = activePlayer === 'A' ? playerA.current : playerB.current;
     if (active) {
         active.src = track.streamUrl;
         active.volume = 1;
         active.play();
     }
     setCurrentTrack(track);
     if (queueNextTrack) setNextTrack(queueNextTrack);
     setIsCrossfading(false);
     isPreloadingRef.current = false;
  }, [activePlayer]);

  return {
    playerA,
    playerB,
    activePlayer,
    currentTrack,
    isCrossfading,
    loadTrack,
    setNextTrack
  };
};
