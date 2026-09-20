export type MusicSource = 'saavn' | 'audius' | 'invidious';
export type PlaylistSegment = 'foundation' | 'peak' | 'cooldown';

export interface DjEvent {
  timestamp: number; // in seconds - when this event fires in the mashup timeline
  trackId: string;
  type: 'play' | 'pause' | 'fade_in' | 'fade_out' | 'cut_vocals' | 'restore_vocals' | 'cut_bass' | 'restore_bass' | 'seek' | 'set_volume';
  seekTo?: number;  // only for 'seek' - seek the track to this position (seconds) before playing
  volume?: number;  // only for 'set_volume' - 0.0 to 1.0
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
