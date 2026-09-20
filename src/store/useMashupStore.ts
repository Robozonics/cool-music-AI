import { create } from 'zustand';
import type { Track } from '../types/music';

export type MashupStep = 'select_count' | 'search_tracks' | 'ready';
export type MashupStatus = 'idle' | 'extracting' | 'syncing' | 'mastering' | 'complete' | 'error';

interface MashupState {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  step: MashupStep;
  targetCount: number | null;
  setStep: (step: MashupStep) => void;
  setTargetCount: (count: number | null) => void;
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
  
  step: 'select_count',
  targetCount: null,
  setStep: (step) => set({ step }),
  setTargetCount: (count) => set({ targetCount: count, step: count ? 'search_tracks' : 'select_count', selectedTracks: [] }),
  
  selectedTracks: [],
  anchorTrackId: null,
  status: 'idle',
  progress: 0,
  
  setStatus: (status, progress = 0) => set({ status, progress }),
  
  addTrack: (track) => {
    const { selectedTracks, targetCount, step } = get();
    
    // Auto open and switch to search if not in flow
    if (!get().isOpen) set({ isOpen: true });
    if (step === 'select_count' && !targetCount) {
       // Default to 2 if they randomly add a track from somewhere
       set({ targetCount: 2, step: 'search_tracks' });
    }
    
    const maxCount = get().targetCount || 7;
    
    if (selectedTracks.length >= maxCount) {
      alert(`Maximum ${maxCount} tracks allowed for this mashup.`);
      return;
    }
    if (selectedTracks.find(t => t.id === track.id)) {
      alert('Track is already in the Mashup Studio.');
      return;
    }
    
    const newTracks = [...selectedTracks, track];
    const newAnchorId = get().anchorTrackId || track.id;
    
    set({ selectedTracks: newTracks, anchorTrackId: newAnchorId });
    
    if (newTracks.length === maxCount) {
       set({ step: 'ready' });
    }
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
  
  clearQueue: () => set({ 
    selectedTracks: [], 
    anchorTrackId: null, 
    status: 'idle', 
    progress: 0,
    step: 'select_count',
    targetCount: null
  }),
}));
