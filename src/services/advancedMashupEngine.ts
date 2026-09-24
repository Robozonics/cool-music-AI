import type { Track, DjEvent } from '../types/music';

// ── 1. AI AUDIO ANALYSIS & METADATA EXTRACTION ──────────────────────────────
export interface StructuralMarkers {
  intro_end: number;
  verse_start: number;
  chorus_start: number;
  chorus_end: number;
  bridge_start: number;
  outro_end: number;
}

export interface AnalyzedTrack extends Track {
  bpm: number;
  key: string;
  markers: StructuralMarkers;
  vocalStemUrl?: string;
  instrumentalStemUrl?: string;
}

export class AdvancedMashupEngine {
  /**
   * MOCK AI BACKEND: Inspect actual song files, extract structural markers,
   * calculate precise cue points, and perform stem separation.
   * In production, this would call a Python backend running Librosa & Demucs.
   */
  static async analyzeAndSeparateStems(tracks: Track[]): Promise<AnalyzedTrack[]> {
    console.log('[AI Backend] Analyzing audio features and extracting stems...');
    return Promise.all(tracks.map(async (track) => {
      // Simulate API latency for AI extraction
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mocked structural boundaries based on track duration
      const d = track.duration || 180;
      return {
        ...track,
        bpm: 120 + Math.floor(Math.random() * 10 - 5),
        key: '8A', // Mock Camelot key
        markers: {
          intro_end: d * 0.1,
          verse_start: d * 0.1,
          chorus_start: d * 0.3,
          chorus_end: d * 0.5,
          bridge_start: d * 0.7,
          outro_end: d * 0.9,
        },
        // In a real app, these would point to isolated audio files on S3/GCS
        vocalStemUrl: `${track.streamUrl}?stem=vocals`,
        instrumentalStemUrl: `${track.streamUrl}?stem=instrumental`
      };
    }));
  }

  // ── 2. DYNAMIC TIMELINE & TRANSITION LOGIC ────────────────────────────────
  static calculateDynamicTimeline(analyzedTracks: AnalyzedTrack[]): DjEvent[] {
    if (analyzedTracks.length < 2) {
      throw new Error("Mashup requires at least 2 tracks.");
    }

    const events: DjEvent[] = [];
    let currentTime = 0;

    // Song 1 (The Foundation)
    const song1 = analyzedTracks[0];
    
    // Play Song 1 Instrumental (Master Bed) from intro_end
    events.push({
      timestamp: currentTime,
      trackId: `${song1.id}_inst`, // using custom ID to represent the instrumental stem
      type: 'play',
      seekTo: song1.markers.intro_end,
      volume: 1.0
    });

    // Duration until Song 1's chorus_start where we swap to Song 2
    const foundationDuration = song1.markers.chorus_start - song1.markers.intro_end;
    currentTime += foundationDuration;

    // Songs 2 to N-1 (The Core Vocal Swaps)
    for (let i = 1; i < analyzedTracks.length - 1; i++) {
      const intermediateSong = analyzedTracks[i];
      const vocalDuration = intermediateSong.markers.chorus_end - intermediateSong.markers.chorus_start;
      
      // Start isolated vocal stem exactly at chorus_start
      events.push({
        timestamp: currentTime,
        trackId: `${intermediateSong.id}_vocal`,
        type: 'play',
        seekTo: intermediateSong.markers.chorus_start,
        volume: 1.0
      });

      // Duck the backing track by -3dB automatically when vocals enter
      events.push({
        timestamp: currentTime,
        trackId: `${song1.id}_inst`,
        type: 'set_volume',
        volume: 0.707 // -3dB linear equivalent
      });

      // Stop vocal stem exactly at chorus_end
      events.push({
        timestamp: currentTime + vocalDuration,
        trackId: `${intermediateSong.id}_vocal`,
        type: 'fade_out',
        volume: 0.0
      });

      // Restore backing track volume
      events.push({
        timestamp: currentTime + vocalDuration,
        trackId: `${song1.id}_inst`,
        type: 'set_volume',
        volume: 1.0
      });

      currentTime += vocalDuration;
    }

    // Song N (The Grand Finale Outro)
    const finaleSong = analyzedTracks[analyzedTracks.length - 1];

    // WHERE TO SLOW (The Audio Brake): Exactly 1.5 seconds before transitioning
    const brakeTime = Math.max(0, currentTime - 1.5);
    events.push({
      timestamp: brakeTime,
      trackId: `${song1.id}_inst`, // Brake the active master bed
      type: 'lowpass', // Apply low-pass sweep
      filterHz: 400
    });
    
    // Also simulate the half-speed pitch down by throwing a custom 'brake_pitch' event
    // that the execution engine will map to playbackRate dropping
    events.push({
      timestamp: brakeTime,
      trackId: `${song1.id}_inst`,
      type: 'brake_pitch' as any // We will handle this in execution
    });

    // Crossfade out the master bed smoothly over 2 seconds at the exact transition point
    events.push({
      timestamp: currentTime,
      trackId: `${song1.id}_inst`,
      type: 'fade_out',
      volume: 0.0
    });

    // Play Song N starting from bridge_start through to outro_end
    events.push({
      timestamp: currentTime,
      trackId: finaleSong.id,
      type: 'fade_in',
      seekTo: finaleSong.markers.bridge_start,
      volume: 1.0
    });

    const finaleDuration = finaleSong.markers.outro_end - finaleSong.markers.bridge_start;
    currentTime += finaleDuration;

    // Fade out Grand Finale
    events.push({
      timestamp: currentTime,
      trackId: finaleSong.id,
      type: 'fade_out',
      volume: 0.0
    });

    // Sort timeline
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }
}

// ── 3. PROGRAMMATIC EXECUTION & AUDIO EFFECTS CODE ────────────────────────
export class WebAudioMashupPlayer {
  private ctx: AudioContext;
  private trackNodes: Map<string, {
    source: AudioBufferSourceNode,
    gain: GainNode,
    filter: BiquadFilterNode
  }> = new Map();
  private startTime: number = 0;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private timers: number[] = [];

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  // Pre-load all required audio buffers (Stems & Originals)
  async loadTracks(analyzedTracks: AnalyzedTrack[]) {
    // In production, this fetches and decodes the audio streams
    // Simulated buffer loading for demonstration
    console.log('[WebAudioEngine] Loading stems and full tracks into memory...');
    for (const track of analyzedTracks) {
      // We simulate creating empty buffers of appropriate duration
      const buffer = this.ctx.createBuffer(2, this.ctx.sampleRate * (track.duration || 180), this.ctx.sampleRate);
      this.audioBuffers.set(track.id, buffer);
      this.audioBuffers.set(`${track.id}_inst`, buffer);
      this.audioBuffers.set(`${track.id}_vocal`, buffer);
    }
  }

  playTimeline(events: DjEvent[]) {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    this.startTime = this.ctx.currentTime;
    console.log('[WebAudioEngine] Starting timeline execution. Base Time:', this.startTime);

    for (const event of events) {
      const scheduleTime = this.startTime + event.timestamp;
      
      // We use setTimeout to trigger execution logic exactly on time,
      // while AudioParam automation handles sample-accurate audio rendering.
      const delayMs = (scheduleTime - this.ctx.currentTime) * 1000;
      
      if (delayMs >= 0) {
        const timer = window.setTimeout(() => this.executeEvent(event, scheduleTime), delayMs);
        this.timers.push(timer);
      } else {
        // Event is in the past, execute immediately
        this.executeEvent(event, this.ctx.currentTime);
      }
    }
  }

  private executeEvent(event: DjEvent, absoluteTime: number) {
    console.log(`[WebAudioEngine] Executing ${event.type} at ${event.timestamp}s on ${event.trackId}`);
    
    let node = this.trackNodes.get(event.trackId);

    switch (event.type) {
      case 'play':
      case 'fade_in':
        if (!node) {
          node = this.setupTrackNode(event.trackId);
        }
        
        // Start playback
        if (event.seekTo !== undefined) {
          node.source.start(absoluteTime, event.seekTo);
        } else {
          node.source.start(absoluteTime);
        }

        if (event.type === 'fade_in') {
          node.gain.gain.setValueAtTime(0, absoluteTime);
          node.gain.gain.linearRampToValueAtTime(event.volume || 1.0, absoluteTime + 2.0); // 2s smooth crossfade
        } else {
          node.gain.gain.setValueAtTime(event.volume || 1.0, absoluteTime);
        }
        break;

      case 'set_volume':
        if (node && event.volume !== undefined) {
          // Automatic ducking/restoring with a smooth 0.3s glide
          node.gain.gain.setTargetAtTime(event.volume, absoluteTime, 0.3);
        }
        break;

      case 'fade_out':
        if (node) {
          const currentVol = node.gain.gain.value;
          node.gain.gain.setValueAtTime(currentVol, absoluteTime);
          // 2-second crossfade out
          node.gain.gain.linearRampToValueAtTime(0, absoluteTime + 2.0);
          
          // Stop node completely after fade
          node.source.stop(absoluteTime + 2.1);
        }
        break;

      case 'lowpass':
        if (node && event.filterHz) {
          // Real-time low-pass filter sweep (muffling highs)
          node.filter.type = 'lowpass';
          node.filter.frequency.setValueAtTime(20000, absoluteTime);
          node.filter.frequency.exponentialRampToValueAtTime(event.filterHz, absoluteTime + 1.5);
        }
        break;
        
      case 'brake_pitch' as any:
        if (node) {
          // Brief half-speed time-stretch / pitch-down effect simulating a DJ turntable brake
          const currentRate = node.source.playbackRate.value;
          node.source.playbackRate.setValueAtTime(currentRate, absoluteTime);
          node.source.playbackRate.linearRampToValueAtTime(0.5, absoluteTime + 1.5); // Slow down to half-speed
        }
        break;

      case 'pause':
        if (node) {
          node.source.stop(absoluteTime);
        }
        break;
    }
  }

  private setupTrackNode(trackId: string) {
    const buffer = this.audioBuffers.get(trackId);
    if (!buffer) throw new Error(`Audio buffer for ${trackId} not loaded.`);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'allpass'; // Transparent by default

    const gain = this.ctx.createGain();
    gain.gain.value = 0;

    // Routing: Source -> Filter -> Gain -> Destination
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    const node = { source, filter, gain };
    this.trackNodes.set(trackId, node);
    return node;
  }
  
  stopAll() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    this.trackNodes.forEach(node => {
      try { node.source.stop(); } catch(e) {}
      node.source.disconnect();
      node.filter.disconnect();
      node.gain.disconnect();
    });
    this.trackNodes.clear();
  }
}
