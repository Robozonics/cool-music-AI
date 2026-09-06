import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Copy, Camera } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

export const ShareSnippetModal: React.FC = () => {
  const isShareSnippetOpen = usePlayerStore(state => state.isShareSnippetOpen);
  const setShareSnippetOpen = usePlayerStore(state => state.setShareSnippetOpen);
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const [isCopied, setIsCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate a fake waveform for the visual
  useEffect(() => {
    if (!isShareSnippetOpen || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bars = 40;
    const barWidth = canvas.width / bars - 2;

    for (let i = 0; i < bars; i++) {
      const height = Math.random() * (canvas.height - 10) + 10;
      const x = i * (barWidth + 2);
      const y = (canvas.height - height) / 2;
      
      // Create gradient for bars
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#3b82f6'); // blue-500
      gradient.addColorStop(1, '#06b6d4'); // cyan-500
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, height, 4);
      ctx.fill();
    }
  }, [isShareSnippetOpen]);

  const handleCopyLink = () => {
    if (currentTrack) {
      navigator.clipboard.writeText(`Listening to ${currentTrack.title} by ${currentTrack.artist} on MUSIFY!`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    // In a real app this would use html2canvas to capture the card
    alert("Image downloaded to gallery!");
    setShareSnippetOpen(false);
  };

  if (!isShareSnippetOpen || !currentTrack) return null;

  return (
    <AnimatePresence>
      {isShareSnippetOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Blur Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShareSnippetOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-gradient-to-b from-[#0a0f1c] to-[#04080f] border border-blue-500/20 rounded-3xl shadow-[0_0_50px_rgba(59,130,246,0.3)] overflow-hidden"
          >
            {/* Close Button */}
            <button 
              onClick={() => setShareSnippetOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white backdrop-blur-md"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Main Export Card (What gets "shared") */}
            <div className="p-6 pb-4">
              <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl bg-black group">
                {/* Background Image Blurred */}
                <div 
                  className="absolute inset-0 bg-cover bg-center blur-xl opacity-60 scale-110"
                  style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}
                />
                
                {/* Foreground Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-between z-10 bg-gradient-to-t from-black/80 via-transparent to-black/30">
                  <div className="flex justify-between items-start">
                    <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-[10px] font-bold tracking-widest uppercase border border-white/20">
                      MUSIFY
                    </span>
                    <Camera className="w-5 h-5 text-white/50" />
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-32 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] border-2 border-white/10 mb-4">
                      <img src={currentTrack.thumbnail} alt="Album Art" className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-white font-display font-black text-2xl text-center leading-tight">
                      {currentTrack.title}
                    </h2>
                    <p className="text-cyan-400 font-medium text-sm text-center mt-1">
                      {currentTrack.artist}
                    </p>
                    
                    {/* Fake Waveform */}
                    <div className="w-full h-12 mt-6 flex items-center justify-center">
                       <canvas ref={canvasRef} width={200} height={40} className="opacity-80" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 grid grid-cols-2 gap-3 bg-white/5 border-t border-white/10">
              <button 
                onClick={handleCopyLink}
                className="flex items-center justify-center space-x-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white text-sm font-bold border border-white/10"
              >
                <Copy className="w-4 h-4" />
                <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
              </button>
              
              <button 
                onClick={handleDownload}
                className="flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 transition-all text-white text-sm font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                <Download className="w-4 h-4" />
                <span>Save to Story</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
