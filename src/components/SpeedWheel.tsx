import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../store/usePlayerStore';
import { X } from 'lucide-react';

export const SpeedWheel: React.FC = () => {
  const isSpeedWheelOpen = usePlayerStore(state => state.isSpeedWheelOpen);
  const setSpeedWheelOpen = usePlayerStore(state => state.setSpeedWheelOpen);
  const playbackRate = usePlayerStore(state => state.playbackRate);
  const setPlaybackRate = usePlayerStore(state => state.setPlaybackRate);

  const wheelRef = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);

  // Convert speed (0.5 to 3.0) to angle (-135 to 135 degrees)
  const speedToAngle = (speed: number) => {
    return -135 + (speed - 0.5) * 108;
  };

  const angleToSpeed = (deg: number) => {
    let speed = 0.5 + (deg + 135) / 108;
    speed = Math.max(0.5, Math.min(3.0, speed));
    // Snap to nearest 0.1
    return Math.round(speed * 10) / 10;
  };

  useEffect(() => {
    setAngle(speedToAngle(playbackRate));
  }, [playbackRate, isSpeedWheelOpen]);

  const handlePointerMove = (e: PointerEvent) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    
    let rad = Math.atan2(dy, dx);
    let deg = rad * (180 / Math.PI) + 90;
    
    if (deg > 180) deg -= 360;
    
    const clampedDeg = Math.max(-135, Math.min(135, deg));
    const newSpeed = angleToSpeed(clampedDeg);
    setPlaybackRate(newSpeed);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    
    // Initial jump to tapped angle
    const rect = wheelRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let rad = Math.atan2(dy, dx);
    let deg = rad * (180 / Math.PI) + 90;
    if (deg > 180) deg -= 360;
    const clampedDeg = Math.max(-135, Math.min(135, deg));
    setPlaybackRate(angleToSpeed(clampedDeg));

    const onMove = (ev: PointerEvent) => handlePointerMove(ev);
    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <AnimatePresence>
      {isSpeedWheelOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={() => setSpeedWheelOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="relative flex flex-col items-center justify-center w-[90vw] max-w-sm aspect-square bg-zinc-950/80 rounded-[3rem] border border-white/10 shadow-[0_0_80px_rgba(163,230,53,0.15)] overflow-hidden backdrop-blur-3xl"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-lime-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />

            <button 
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/20 transition-all"
              onClick={() => setSpeedWheelOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="absolute top-8 left-8 text-white font-black tracking-widest uppercase text-xs opacity-70">
              Tempo Control
            </h3>
            
            {/* The Wheel Container */}
            <div 
              className="relative w-64 h-64 rounded-full mt-6 touch-none select-none cursor-pointer"
              ref={wheelRef}
              onPointerDown={handlePointerDown}
            >
              {/* Wheel Background */}
              <div className="absolute inset-0 rounded-full border-[10px] border-zinc-900/80 shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)]" />
              
              {/* Wheel Tick Marks */}
              <div className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none">
                {Array.from({ length: 21 }).map((_, i) => {
                  const angleDeg = -135 + (i * 270) / 20;
                  const isActive = angleDeg <= angle + 1; // +1 for floating point safety
                  return (
                    <div 
                      key={i}
                      className="absolute w-[3px] h-3 rounded-full"
                      style={{
                        transform: `rotate(${angleDeg}deg) translateY(-112px)`,
                        backgroundColor: isActive ? '#a3e635' : '#27272a',
                        boxShadow: isActive ? '0 0 12px rgba(163,230,53,0.8)' : 'none',
                        transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
                      }}
                    />
                  );
                })}
              </div>

              {/* The Rotating Knob */}
              <motion.div
                className="absolute inset-[18px] rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[0_10px_40px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.05)] border border-zinc-800 flex items-center justify-center"
                style={{ rotate: angle }}
              >
                {/* Knob Indicator */}
                <div className="absolute top-4 w-2 h-8 bg-lime-400 rounded-full shadow-[0_0_15px_rgba(163,230,53,1)]" />
              </motion.div>

              {/* Center Readout */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-28 h-28 rounded-full bg-zinc-950 shadow-[inset_0_4px_20px_rgba(0,0,0,1)] border border-zinc-800/50 flex items-center justify-center flex-col relative z-10">
                  <span className="text-4xl font-black text-white tracking-tighter drop-shadow-md">
                    {playbackRate.toFixed(1)}<span className="text-2xl text-lime-400 ml-0.5">x</span>
                  </span>
                </div>
              </div>
            </div>
            
            <p className="mt-8 text-zinc-500 font-bold text-[10px] tracking-[0.2em] uppercase">
              Drag to Adjust Speed
            </p>

            {/* Quick Modifiers */}
            <div className="absolute bottom-6 flex space-x-3">
              <button 
                onClick={() => setPlaybackRate(0.8)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  playbackRate === 0.8
                  ? 'bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.8)]'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                Slowed + Reverb
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
