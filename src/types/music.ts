export type MusicSource = 'saavn' | 'audius' | 'invidious';

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
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface MoodPrompt {
  vibe: string;
  energy: string;
  genres: string[];
  rawQuery: string;
}
