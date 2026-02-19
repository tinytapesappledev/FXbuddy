import { create } from 'zustand';

export interface ClipInfo {
  name: string;
  duration: number;
  inPoint: number;
  outPoint: number;
  startTime: number;
  endTime: number;
  playheadTime?: number;
  mediaPath: string;
  app: 'PPRO' | 'AEFT' | 'BROWSER';
  trackIndex?: number;
  clipIndex?: number;
  layerIndex?: number;
}

interface AdobeState {
  // State
  isInsideAdobe: boolean;
  selectedClip: ClipInfo | null;
  clipError: string | null;
  isExporting: boolean;
  isImporting: boolean;

  // Actions
  setIsInsideAdobe: (value: boolean) => void;
  setSelectedClip: (clip: ClipInfo | null) => void;
  setClipError: (error: string | null) => void;
  setExporting: (value: boolean) => void;
  setImporting: (value: boolean) => void;
  clearClip: () => void;
}

export const useAdobeStore = create<AdobeState>((set) => ({
  // Initial state
  isInsideAdobe: false,
  selectedClip: null,
  clipError: null,
  isExporting: false,
  isImporting: false,

  // Actions
  setIsInsideAdobe: (value) => set({ isInsideAdobe: value }),
  setSelectedClip: (clip) => set({ selectedClip: clip, clipError: null }),
  setClipError: (error) => set({ clipError: error, selectedClip: null }),
  setExporting: (value) => set({ isExporting: value }),
  setImporting: (value) => set({ isImporting: value }),
  clearClip: () => set({ selectedClip: null, clipError: null }),
}));
