import { create } from 'zustand';
import type { Track } from '../types/music';

export type MashupStatus = 'idle' | 'extracting' | 'syncing' | 'mastering' | 'complete' | 'error';

interface MashupState {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedTracks: Track[];
  anchorTrackId: string | null;
  status: MashupStatus;
  progress: number;
  setStatus: (status: MashupStatus, progress?: number) => void;
  addTrack: (track: Track) => void;
  removeTrack: (trackId: string) => void;
  setAnchorTrack: (trackId: string) => void;
  reorderTracks: (startIndex: number, endIndex: number) => void;
  clearQueue: () => void;
}

export const useMashupStore = create<MashupState>((set, get) => ({
  isOpen: false,
  setIsOpen: (open) => set({ isOpen: open }),
  
  selectedTracks: [],
  anchorTrackId: null,
  status: 'idle',
  progress: 0,
  
  setStatus: (status, progress = 0) => set({ status, progress }),
  
  addTrack: (track) => {
    const { selectedTracks } = get();
    if (selectedTracks.length >= 7) {
      alert('Maximum 7 tracks allowed in Mashup Studio.');
      return;
    }
    if (selectedTracks.find(t => t.id === track.id)) {
      alert('Track is already in the Mashup Studio.');
      return;
    }
    
    const newTracks = [...selectedTracks, track];
    // Set first track as anchor by default
    const newAnchorId = get().anchorTrackId || track.id;
    
    set({ selectedTracks: newTracks, anchorTrackId: newAnchorId });
    // Auto-open panel when adding a track
    set({ isOpen: true });
  },
  
  removeTrack: (trackId) => {
    const { selectedTracks, anchorTrackId } = get();
    const newTracks = selectedTracks.filter(t => t.id !== trackId);
    
    let newAnchorId = anchorTrackId;
    // If we removed the anchor, pick the first available track
    if (anchorTrackId === trackId) {
      newAnchorId = newTracks.length > 0 ? newTracks[0].id : null;
    }
    
    set({ selectedTracks: newTracks, anchorTrackId: newAnchorId });
  },
  
  setAnchorTrack: (trackId) => set({ anchorTrackId: trackId }),
  
  reorderTracks: (startIndex, endIndex) => {
    const { selectedTracks } = get();
    const result = Array.from(selectedTracks);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    set({ selectedTracks: result });
  },
  
  clearQueue: () => set({ selectedTracks: [], anchorTrackId: null, status: 'idle', progress: 0 }),
}));
