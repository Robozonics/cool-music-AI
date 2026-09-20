import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check, Scissors, Globe, Music } from 'lucide-react';
import { usePlayerStore, nativeAudio } from '../store/usePlayerStore';

// ─── Deep link builder ───────────────────────────────────────────────────────
const buildShareUrl = (trackId: string, startSec: number, title: string, artist: string): string => {
  const base = window.location.origin;
  const params = new URLSearchParams({
    t: String(Math.floor(startSec)),
    title: title,
    artist: artist,
  });
  return `${base}/track/${encodeURIComponent(trackId)}?${params.toString()}`;
};

// ─── OG meta injection so social crawlers pick up the preview card ────────────
const injectOGMeta = (title: string, artist: string, thumbnail: string, url: string) => {
  const setMeta = (property: string, content: string) => {
    let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };
  setMeta('og:title', `🎵 ${title} – ${artist}`);
  setMeta('og:description', `Listen to this snippet on MUSIFY`);
  setMeta('og:image', thumbnail);
  setMeta('og:url', url);
  setMeta('og:type', 'music.song');
};

export const ShareSnippetModal: React.FC = () => {
  const isShareSnippetOpen = usePlayerStore(state => state.isShareSnippetOpen);
  const setShareSnippetOpen = usePlayerStore(state => state.setShareSnippetOpen);
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const currentTime = usePlayerStore(state => state.currentTime);

  // Snippet window (default = current position, 15s window)
  const [snippetStart, setSnippetStart] = useState(0);
  const [snippetEnd, setSnippetEnd] = useState(15);
  const [isCopied, setIsCopied] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimError, setTrimError] = useState<string | null>(null);
  const [waveformBars, setWaveformBars] = useState<number[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sync snippet start to current playback position when modal opens
  useEffect(() => {
    if (isShareSnippetOpen && currentTrack) {
      const start = Math.max(0, Math.floor(currentTime));
      setSnippetStart(start);
      setSnippetEnd(Math.min(start + 15, currentTrack.duration || start + 15));
    }
  }, [isShareSnippetOpen]);

  // ── Live waveform from AnalyserNode ──────────────────────────────────────
  useEffect(() => {
    if (!isShareSnippetOpen) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaElementSource(nativeAudio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        const bars = Array.from(dataArray).map(v => v / 255);
        setWaveformBars(bars);
      };
      draw();

      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        source.disconnect();
        analyser.disconnect();
        ctx.close();
      };
    } catch {
      // Fallback: random bars if AudioContext is unavailable
      const fallback = Array.from({ length: 32 }, () => Math.random() * 0.8 + 0.2);
      setWaveformBars(fallback);
    }
  }, [isShareSnippetOpen]);

  // ── Draw waveform onto canvas ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformBars.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barW = canvas.width / waveformBars.length - 1;
    waveformBars.forEach((val, i) => {
      const h = val * canvas.height;
      const x = i * (barW + 1);
      const y = (canvas.height - h) / 2;
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#a78bfa');   // violet
      grad.addColorStop(0.5, '#ec4899'); // pink
      grad.addColorStop(1, '#a3e635');   // lime
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, h, 3);
      ctx.fill();
    });
  }, [waveformBars]);

  // ── Share / Copy Link ────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!currentTrack) return;

    const url = buildShareUrl(currentTrack.id, snippetStart, currentTrack.title, currentTrack.artist);
    injectOGMeta(currentTrack.title, currentTrack.artist, currentTrack.thumbnail, url);

    // Native share sheet on mobile, clipboard fallback on desktop
    if (navigator.share) {
      try {
        await navigator.share({
          title: `🎵 ${currentTrack.title} – ${currentTrack.artist}`,
          text: `Check out this snippet starting at ${formatTime(snippetStart)} on MUSIFY!`,
          url,
        });
      } catch {
        // user cancelled — that's fine
      }
    } else {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  }, [currentTrack, snippetStart]);

  // ── Web Audio API clip export ───────────────────────────────────────────
  const handleTrimExport = useCallback(async () => {
    if (!currentTrack || currentTrack.source === 'invidious') {
      setTrimError('Audio export is only available for native stream tracks.');
      return;
    }
    setIsTrimming(true);
    setTrimError(null);

    try {
      const response = await fetch(currentTrack.streamUrl);
      if (!response.ok) throw new Error('Failed to fetch audio');
      const arrayBuffer = await response.arrayBuffer();

      const audioCtx = new AudioContext();
      const fullBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const sampleRate = fullBuffer.sampleRate;
      const channels = fullBuffer.numberOfChannels;
      const startSample = Math.floor(snippetStart * sampleRate);
      const endSample = Math.min(Math.floor(snippetEnd * sampleRate), fullBuffer.length);
      const frameCount = endSample - startSample;

      const offlineCtx = new OfflineAudioContext(channels, frameCount, sampleRate);
      const clipped = offlineCtx.createBuffer(channels, frameCount, sampleRate);

      for (let ch = 0; ch < channels; ch++) {
        const src = fullBuffer.getChannelData(ch).slice(startSample, endSample);
        clipped.copyToChannel(src, ch);
      }

      const srcNode = offlineCtx.createBufferSource();
      srcNode.buffer = clipped;
      srcNode.connect(offlineCtx.destination);
      srcNode.start();

      const rendered = await offlineCtx.startRendering();

      // Encode to WAV
      const wav = encodeWav(rendered);
      const blob = new Blob([wav], { type: 'audio/wav' });
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${currentTrack.title}_snippet_${formatTime(snippetStart)}-${formatTime(snippetEnd)}.wav`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    } catch (err: any) {
      setTrimError(err.message || 'Export failed. Try a different track.');
    } finally {
      setIsTrimming(false);
    }
  }, [currentTrack, snippetStart, snippetEnd]);

  if (!isShareSnippetOpen || !currentTrack) return null;

  const duration = currentTrack.duration || 300;
  const snippetLength = snippetEnd - snippetStart;
  const shareUrl = buildShareUrl(currentTrack.id, snippetStart, currentTrack.title, currentTrack.artist);

  return (
    <AnimatePresence>
      {isShareSnippetOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShareSnippetOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="relative w-full max-w-sm bg-gradient-to-b from-[#0d0720] to-[#05020f] border border-purple-500/25 rounded-3xl shadow-[0_0_60px_rgba(139,92,246,0.4)] overflow-hidden"
          >
            {/* Close */}
            <button
              onClick={() => setShareSnippetOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0">
                <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white text-sm truncate">{currentTrack.title}</p>
                <p className="text-purple-300 text-xs truncate">{currentTrack.artist}</p>
              </div>
              <Music className="w-4 h-4 text-purple-400 ml-auto shrink-0" />
            </div>

            {/* Live Waveform */}
            <div className="px-6 pb-2">
              <canvas ref={canvasRef} width={300} height={48} className="w-full opacity-90 rounded-lg" />
            </div>

            {/* Snippet Window Selector */}
            <div className="px-6 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Snippet Window</span>
                <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  {snippetLength}s clip
                </span>
              </div>

              {/* Start slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>Start: {formatTime(snippetStart)}</span>
                  <span>End: {formatTime(snippetEnd)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, duration - 5)}
                  step={1}
                  value={snippetStart}
                  onChange={e => {
                    const s = Number(e.target.value);
                    setSnippetStart(s);
                    // Keep the current snippet length if possible
                    setSnippetEnd(Math.min(s + snippetLength, duration));
                  }}
                  className="w-full h-2 appearance-none bg-white/10 rounded-full cursor-pointer accent-purple-500"
                />
              </div>

              {/* Length slider */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 font-mono">Length: {snippetLength}s</span>
                <input
                  type="range"
                  min={5}
                  max={Math.max(5, duration - snippetStart)}
                  step={1}
                  value={snippetLength}
                  onChange={e => setSnippetEnd(snippetStart + Number(e.target.value))}
                  className="w-full h-2 appearance-none bg-white/10 rounded-full cursor-pointer accent-pink-500"
                />
              </div>
            </div>

            {/* Deep Link Preview */}
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <Globe className="w-3 h-3 text-zinc-500 shrink-0" />
                <span className="text-[10px] text-zinc-400 font-mono truncate flex-1">{shareUrl}</span>
              </div>
            </div>

            {/* Error */}
            {trimError && (
              <div className="mx-6 mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">
                {trimError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-4 pt-0 grid grid-cols-2 gap-3">
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all text-white text-sm font-bold shadow-[0_0_20px_rgba(139,92,246,0.35)]"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{isCopied ? 'Link Copied!' : 'Share'}</span>
              </button>

              <button
                onClick={handleTrimExport}
                disabled={isTrimming || currentTrack.source === 'invidious'}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-white text-sm font-bold border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTrimming ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Scissors className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <Scissors className="w-4 h-4" />
                )}
                <span>{isTrimming ? 'Trimming…' : 'Export Clip'}</span>
              </button>
            </div>

            {/* Copy link directly */}
            <div className="px-4 pb-5">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(shareUrl);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2500);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-purple-500/40 transition-all text-xs font-bold"
              >
                <Copy className="w-3 h-3" />
                <span>Copy deep link with timestamp</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** Minimal WAV encoder from an AudioBuffer */
function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = numFrames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) =>
    [...str].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return arrayBuffer;
}
