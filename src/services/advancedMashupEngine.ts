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

    const anchor = analyzedTracks[0];
    const secondaryTracks = analyzedTracks.slice(1);

    // Anchor Track (The Foundation) plays continuously for its whole duration
    // We use the full track for the anchor to maintain the beat
    events.push({
      timestamp: currentTime,
      trackId: anchor.id, // Play full anchor track
      type: 'play',
      seekTo: 0,
      volume: 1.0
    });

    const anchorDuration = anchor.duration || 180;

    // For each secondary track, we overlay its vocals/hooks over the anchor track
    for (let i = 0; i < secondaryTracks.length; i++) {
      const secTrack = secondaryTracks[i];
      
      // Calculate where to drop the secondary track. 
      // Example: Drop track 2's vocal on track 1's chorus
      // If we have multiple secondary tracks, stagger them
      const dropTime = anchor.markers.chorus_start + (i * 30);
      
      if (dropTime < anchorDuration) {
        // Overlay secondary vocals starting from its verse
        events.push({
          timestamp: dropTime,
          trackId: `${secTrack.id}_vocal`,
          type: 'fade_in',
          seekTo: secTrack.markers.verse_start,
          volume: 0.9 // slightly lower than anchor
        });

        // Duck anchor bass/mids slightly to make room
        events.push({
          timestamp: dropTime,
          trackId: anchor.id,
          type: 'cut_vocals'
        });

        const vocalDuration = secTrack.markers.chorus_end - secTrack.markers.verse_start;
        const endVocalTime = dropTime + vocalDuration;

        // Fade out secondary vocals
        events.push({
          timestamp: endVocalTime,
          trackId: `${secTrack.id}_vocal`,
          type: 'fade_out',
          volume: 0.0
        });

        // Restore anchor
        events.push({
          timestamp: endVocalTime,
          trackId: anchor.id,
          type: 'restore_vocals'
        });
      }
    }

    // Grand Finale: Let the last secondary track take over the instrumental at the bridge
    const finaleTrack = secondaryTracks[secondaryTracks.length - 1];
    const finaleDropTime = anchor.markers.bridge_start;

    if (finaleDropTime < anchorDuration) {
      // Brake the anchor track
      events.push({
        timestamp: finaleDropTime - 1.5,
        trackId: anchor.id,
        type: 'lowpass',
        filterHz: 400
      });
      events.push({
        timestamp: finaleDropTime - 1.5,
        trackId: anchor.id,
        type: 'brake_pitch' as any
      });

      // Crossfade out anchor
      events.push({
        timestamp: finaleDropTime,
        trackId: anchor.id,
        type: 'fade_out',
        volume: 0.0
      });

      // Bring in the full finale track
      events.push({
        timestamp: finaleDropTime,
        trackId: finaleTrack.id,
        type: 'fade_in',
        seekTo: finaleTrack.markers.chorus_start,
        volume: 1.0
      });

      // End of Mashup
      events.push({
        timestamp: finaleDropTime + (finaleTrack.markers.outro_end - finaleTrack.markers.chorus_start),
        trackId: finaleTrack.id,
        type: 'fade_out',
        volume: 0.0
      });
    } else {
      // If anchor ends first, just fade it out
      events.push({
        timestamp: anchorDuration - 5,
        trackId: anchor.id,
        type: 'fade_out',
        volume: 0.0
      });
    }

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
