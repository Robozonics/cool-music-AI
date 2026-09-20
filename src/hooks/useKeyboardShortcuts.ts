import { useEffect } from 'react';
import { usePlayerStore, nativeAudio } from '../store/usePlayerStore';

export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const store = usePlayerStore.getState();

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          store.togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          store.nextTrack();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          store.prevTrack();
          break;
        case 'KeyM':
          e.preventDefault();
          // We need to implement mute toggling. The nativeAudio is accessible via usePlayerStore.getState().nativeAudio
          if (nativeAudio) {
            nativeAudio.muted = !nativeAudio.muted;
          }
          break;
        case 'KeyF':
          e.preventDefault();
          store.toggleVideoMode();
          break;
        case 'KeyL':
          e.preventDefault();
          store.setLyricsOpen(!store.isLyricsOpen);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
