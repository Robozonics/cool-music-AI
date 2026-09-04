// @ts-nocheck
import { useEffect, useRef, useState } from 'react';

interface SyncState {
  hostTime: number;
  timestamp: number;
  isPlaying: boolean;
}

/**
 * useJamSync
 * Connects to a generic WebSocket for live jam sessions.
 * Implements NTP-style drift compensation to ensure sub-150ms playback synchronization.
 */
export const useJamSync = (
  audioElementRef: React.RefObject<HTMLMediaElement>,
  roomUrl: string
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [latency, setLatency] = useState(0);
  const [drift, setDrift] = useState(0);
  const pingIntervalRef = useRef<number>();

  useEffect(() => {
    if (!roomUrl) return;

    // Connect to WebSocket room
    const ws = new WebSocket(roomUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Start NTP-style ping to calculate round-trip latency
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING', clientTime: Date.now() }));
        }
      }, 5000) as unknown as number;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // Latency Calculation (NTP approach)
        if (msg.type === 'PONG') {
           const now = Date.now();
           const rtt = now - msg.clientTime;
           setLatency(rtt / 2); // One-way offset estimate
           return;
        }

        // Sync State Handler
        if (msg.type === 'SYNC_STATE' && audioElementRef.current) {
           const state = msg.payload as SyncState;
           const now = Date.now();
           
           // Target Time = Host Time + Latency Offset + (Time elapsed since host sent event)
           const timeSinceEvent = (now - state.timestamp) / 1000; 
           const targetTime = state.hostTime + (latency / 1000) + timeSinceEvent;
           
           const currentLocalTime = audioElementRef.current.currentTime;
           const calculatedDrift = targetTime - currentLocalTime;
           
           setDrift(Math.abs(calculatedDrift));

           // Correction Rules
           if (Math.abs(calculatedDrift) > 0.150) { // 150ms hard threshold
              console.log(`Drift too high (${Math.abs(calculatedDrift).toFixed(3)}s), performing hard seek`);
              audioElementRef.current.currentTime = targetTime;
              if (state.isPlaying && audioElementRef.current.paused) {
                 audioElementRef.current.play();
              } else if (!state.isPlaying && !audioElementRef.current.paused) {
                 audioElementRef.current.pause();
              }
           } else {
              // Graceful playback rate adjustment (soft sync)
              if (calculatedDrift > 0.05) { // Behind by >50ms
                  audioElementRef.current.playbackRate = 1.02; // Speed up 2%
              } else if (calculatedDrift < -0.05) { // Ahead by >50ms
                  audioElementRef.current.playbackRate = 0.98; // Slow down 2%
              } else {
                  audioElementRef.current.playbackRate = 1.0; // Perfect sync
              }
           }
        }
      } catch (e) {
        console.error("JamSync Parse Error", e);
      }
    };

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [roomUrl, latency, audioElementRef]);

  // Expose a method to broadcast local state if this user is the Host
  const broadcastSync = () => {
     if (wsRef.current?.readyState === WebSocket.OPEN && audioElementRef.current) {
        wsRef.current.send(JSON.stringify({
           type: 'SYNC_STATE',
           payload: {
              hostTime: audioElementRef.current.currentTime,
              timestamp: Date.now(),
              isPlaying: !audioElementRef.current.paused
           }
        }));
     }
  };

  return {
    latency,
    drift,
    broadcastSync
  };
};
