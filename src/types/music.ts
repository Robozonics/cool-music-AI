export type MusicSource = 'saavn' | 'audius' | 'invidious';
export type PlaylistSegment = 'foundation' | 'peak' | 'cooldown';

export interface DjEvent {
  timestamp: number; // in seconds - when this event fires in the mashup timeline
  trackId: string;
  type: 'play' | 'pause' | 'fade_in' | 'fade_out' | 'cut_vocals' | 'restore_vocals' | 'cut_bass' | 'restore_bass' | 'seek' | 'set_volume' | 'highpass' | 'lowpass' | 'filter_reset' | 'set_tempo' | 'brake_pitch';
  seekTo?: number;
  volume?: number;
  filterHz?: number;   // for highpass/lowpass events
  playbackRate?: number; // for tempo-syncing tracks
}

// ── Professional DJ Blueprint (Camelot / Bar-based) ──────────────────────────

export interface ActiveStem {
  track_id: string;
  stem_type: 'drums' | 'bass' | 'vocals' | 'other' | 'full';
  volume_db: number;
  pitch_shift_semitones: number;
}

export interface TimelineBlock {
  bar_start: number;
  bar_end: number;
  active_stems: ActiveStem[];
  effects: {
    transition_type: 'none' | 'crossfade' | 'high_pass_sweep' | 'low_pass_sweep' | 'cut';
    filter_cutoff_hz?: number;
    filter_sweep?: string | null;
  };
}

export interface MashupBlueprint {
  mashup_metadata: {
    final_bpm: number;
    total_duration_bars: number;
    target_key?: string;
    track_bpms?: Record<string, number>;
  };
  timeline_blocks: TimelineBlock[];
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number; // in seconds
  streamUrl: string;
  source: MusicSource;
  sourceBadge?: string;
  isOffline?: boolean;
  reason?: string; // AI reason
  segment?: PlaylistSegment; // AI playlist segment
  mashupStreamUrls?: { id: string, url: string }[]; // Used to play multiple tracks concurrently
  arrangement?: DjEvent[]; // AI generated timeline for DJ actions
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface TranslatedLyricLine extends LyricLine {
  translation?: string;
}

export interface MoodPrompt {
  vibe: string;
  energy: string;
  genres: string[];
  rawQuery: string;
}

export interface DaylistEntry {
  title: string;
  subtitle: string;
  emoji: string;
  gradient: string;
  query: string;
  textColor: string;
}

export interface AudioFeatures {
  bpm: number;
  key: string;
  energy: number;
  danceability: number;
  acousticness: number;
  mood: 'happy' | 'sad' | 'energetic' | 'calm' | 'aggressive' | 'romantic';
}

export interface SavedPlaylist {
  id: string;
  name: string;
  tracks: Track[];
}
