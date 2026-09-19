export type MusicSource = 'saavn' | 'audius' | 'invidious';
export type PlaylistSegment = 'foundation' | 'peak' | 'cooldown';

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
