import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';

export interface YouTubeEngineRef {
  playVideo: (queryOrId: string) => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
}

const YouTubeAudioEngine = forwardRef<YouTubeEngineRef, {}>((_, ref) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isReady = useRef(false);
  const currentInterval = useRef<any>(null);

  useEffect(() => {
    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '0',
        width: '0',
        videoId: '',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            isReady.current = true;
          },
          onStateChange: (event: any) => {
            const store = usePlayerStore.getState();
            if (event.data === window.YT.PlayerState.PLAYING) {
              store.setIsPlaying(true);
              store.setDuration(playerRef.current.getDuration());
              
              if (currentInterval.current) clearInterval(currentInterval.current);
              currentInterval.current = setInterval(() => {
                store.setCurrentTime(playerRef.current.getCurrentTime());
              }, 1000);
            } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
              store.setIsPlaying(false);
              if (currentInterval.current) clearInterval(currentInterval.current);
              if (event.data === window.YT.PlayerState.ENDED) {
                store.nextTrack();
              }
            }
          },
          onError: (e: any) => {
            console.error('YouTube Player Error:', e);
            usePlayerStore.getState().nextTrack();
          }
        },
      });
    };

    return () => {
      if (currentInterval.current) clearInterval(currentInterval.current);
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    playVideo: (queryOrId: string) => {
      if (!isReady.current || !playerRef.current) return;
      // If it's a search query, loadPlaylist allows searching by keywords!
      // But we need to use loadVideoById or loadPlaylist
      if (queryOrId.includes(' ') || !/^[a-zA-Z0-9_-]{11}$/.test(queryOrId)) {
         // It's a query
         playerRef.current.loadPlaylist({
           listType: 'search',
           list: queryOrId,
           index: 0,
           suggestedQuality: 'small'
         });
      } else {
         playerRef.current.loadVideoById(queryOrId);
      }
    },
    pause: () => {
      if (playerRef.current && isReady.current) {
        playerRef.current.pauseVideo();
      }
    },
    resume: () => {
      if (playerRef.current && isReady.current) {
        playerRef.current.playVideo();
      }
    },
    seek: (seconds: number) => {
      if (playerRef.current && isReady.current) {
        playerRef.current.seekTo(seconds, true);
      }
    },
    setVolume: (volume: number) => {
      if (playerRef.current && isReady.current) {
        playerRef.current.setVolume(volume * 100);
      }
    },
    setPlaybackRate: (rate: number) => {
      if (playerRef.current && isReady.current && playerRef.current.setPlaybackRate) {
        playerRef.current.setPlaybackRate(rate);
      }
    }
  }));

  return (
    <div className="hidden" aria-hidden="true">
      <div ref={containerRef}></div>
    </div>
  );
});

YouTubeAudioEngine.displayName = 'YouTubeAudioEngine';

export default YouTubeAudioEngine;

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}
