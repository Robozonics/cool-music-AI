import { translateLyrics } from './src/services/lyricsService.js';
import fetch from 'node-fetch';

// Mock fetch for testing
globalThis.fetch = fetch as any;

const lines = [
  { time: 10, text: "Hello from the other side" },
  { time: 20, text: "I must've called a thousand times" }
];

translateLyrics(lines, "Spanish", "track1").then(res => {
  console.log(JSON.stringify(res, null, 2));
}).catch(err => {
  console.error("Error:", err);
});
