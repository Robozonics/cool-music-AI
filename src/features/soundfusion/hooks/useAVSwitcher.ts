// @ts-nocheck
import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * useAVSwitcher
 * Handles sub-200ms transitions between independent audio and video elements
 * by maintaining a master timeline and utilizing requestAnimationFrame.
 */
export const useAVSwitcher = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const [activeMode, setActiveMode] = useState<'audio' | 'video'>('audio');
  const [isSwitching, setIsSwitching] = useState(false);
  const masterTimeRef = useRef(0);
  const rafRef = useRef<number>();

  // Maintain Master Timeline
  useEffect(() => {
    const updateMasterTime = () => {
      const activeElement = activeMode === 'audio' ? audioRef.current : videoRef.current;
      if (activeElement && !isSwitching) {
        masterTimeRef.current = activeElement.currentTime;
      }
      rafRef.current = requestAnimationFrame(updateMasterTime);
    };
    rafRef.current = requestAnimationFrame(updateMasterTime);
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activeMode, isSwitching]);

  const switchToVideo = useCallback(async () => {
    if (!audioRef.current || !videoRef.current || activeMode === 'video' || isSwitching) return;
    
    setIsSwitching(true);
    const transitionTime = audioRef.current.currentTime;
    
    // Mute audio temporarily, prepare video
    audioRef.current.muted = true;
    videoRef.current.currentTime = transitionTime;
    videoRef.current.muted = true;
    
    // Wait for video buffer
    const onCanPlay = async () => {
      videoRef.current?.removeEventListener('canplaythrough', onCanPlay);
      
      if (videoRef.current && audioRef.current) {
        audioRef.current.pause();
        videoRef.current.muted = false; // unmute video
        await videoRef.current.play();
        
        // Sync check: max drift 50ms
        const drift = Math.abs(videoRef.current.currentTime - audioRef.current.currentTime);
        if (drift > 0.05) {
           videoRef.current.currentTime = audioRef.current.currentTime;
        }
      }
      
      setActiveMode('video');
      setIsSwitching(false);
    };
    
    if (videoRef.current.readyState >= 3) {
      onCanPlay();
    } else {
      videoRef.current.addEventListener('canplaythrough', onCanPlay);
    }
  }, [activeMode, isSwitching]);

  const switchToAudio = useCallback(async () => {
    if (!audioRef.current || !videoRef.current || activeMode === 'audio' || isSwitching) return;
    
    setIsSwitching(true);
    const transitionTime = videoRef.current.currentTime;
    
    videoRef.current.muted = true;
    audioRef.current.currentTime = transitionTime;
    audioRef.current.muted = true;
    
    const onCanPlay = async () => {
      audioRef.current?.removeEventListener('canplaythrough', onCanPlay);
      
      if (audioRef.current && videoRef.current) {
        videoRef.current.pause();
        audioRef.current.muted = false;
        await audioRef.current.play();
        
        const drift = Math.abs(audioRef.current.currentTime - videoRef.current.currentTime);
        if (drift > 0.05) {
           audioRef.current.currentTime = videoRef.current.currentTime;
        }
      }
      
      setActiveMode('audio');
      setIsSwitching(false);
    };

    if (audioRef.current.readyState >= 3) {
      onCanPlay();
    } else {
      audioRef.current.addEventListener('canplaythrough', onCanPlay);
    }
  }, [activeMode, isSwitching]);

  return {
    audioRef,
    videoRef,
    activeMode,
    isSwitching,
    switchToVideo,
    switchToAudio,
    masterTime: () => masterTimeRef.current
  };
};
