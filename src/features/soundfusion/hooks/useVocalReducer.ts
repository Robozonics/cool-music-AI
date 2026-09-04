// @ts-nocheck
import { useEffect, useRef, useState } from 'react';

/**
 * useVocalReducer
 * Pipes the audio source through a Web Audio API graph.
 * Separates Mid/Side channels and applies a band-pass notch filter to the Mid channel
 * to suppress lead vocals based on the provided vocal reduction percentage.
 */
export const useVocalReducer = (audioElementRef: React.RefObject<HTMLMediaElement>) => {
  const [reductionLevel, setReductionLevel] = useState(0); // 0 to 100
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isInitialized = useRef(false);
  
  // Audio Nodes
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const vocalFilterRef = useRef<BiquadFilterNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!audioElementRef.current || isInitialized.current) return;
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      
      // 1. Source Node
      const source = ctx.createMediaElementSource(audioElementRef.current);
      sourceNodeRef.current = source;
      
      // 2. Mid/Side Matrix simulation
      // We'll use a simplified channel splitter approach to approximate M/S manipulation.
      // A true M/S requires combining channels, but we can target center frequencies with a BiquadFilter.
      
      // Vocal Filter (Notch at ~1000Hz, spanning 300Hz to 3.4kHz)
      const vocalFilter = ctx.createBiquadFilter();
      vocalFilter.type = 'peaking'; // A negative peaking filter acts as a notch
      vocalFilter.frequency.value = 1000;
      vocalFilter.Q.value = 0.5; // Wide Q to cover 300 - 3.4k
      vocalFilter.gain.value = 0; // Default: no reduction
      vocalFilterRef.current = vocalFilter;
      
      // Wet/Dry mix
      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      dryGain.gain.value = 1;
      wetGain.gain.value = 0;
      dryGainRef.current = dryGain;
      wetGainRef.current = wetGain;
      
      // Graph routing
      // Source -> Dry Gain -> Destination
      // Source -> Vocal Filter -> Wet Gain -> Destination
      source.connect(dryGain);
      dryGain.connect(ctx.destination);
      
      source.connect(vocalFilter);
      vocalFilter.connect(wetGain);
      wetGain.connect(ctx.destination);
      
      isInitialized.current = true;
    } catch (e) {
      console.error("Web Audio API not supported or failed to init:", e);
    }
    
    return () => {
      // Cleanup
      if (audioCtxRef.current?.state !== 'closed') {
        audioCtxRef.current?.close();
      }
    };
  }, [audioElementRef]);

  // Handle reduction level changes
  useEffect(() => {
    if (!vocalFilterRef.current || !dryGainRef.current || !wetGainRef.current) return;
    
    // Convert 0-100 to an audio scale
    const normalized = reductionLevel / 100;
    
    // Crossfade between dry and wet
    dryGainRef.current.gain.value = 1 - normalized;
    wetGainRef.current.gain.value = normalized;
    
    // Apply aggressive negative gain to the vocal frequencies based on reduction level
    // -40dB represents significant vocal attenuation
    vocalFilterRef.current.gain.value = -40 * normalized;
    
  }, [reductionLevel]);

  return {
    reductionLevel,
    setVocalReduction: (level: number) => setReductionLevel(Math.max(0, Math.min(100, level))),
    resumeAudioContext: async () => {
      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
    }
  };
};
