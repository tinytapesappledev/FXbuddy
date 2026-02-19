import { create } from 'zustand';

export type GenerationStatus = 'idle' | 'uploading' | 'queued' | 'generating' | 'downloading' | 'completed' | 'failed';

interface GenerationState {
  // State
  jobId: string | null;
  status: GenerationStatus;
  progress: number;
  resultUrl: string | null;
  error: string | null;
  prompt: string;

  // Actions
  setPrompt: (prompt: string) => void;
  startGeneration: (jobId: string) => void;
  setUploading: () => void;
  updateProgress: (status: GenerationStatus, progress: number) => void;
  setCompleted: (resultUrl: string) => void;
  setFailed: (error: string) => void;
  reset: () => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  // Initial state
  jobId: null,
  status: 'idle',
  progress: 0,
  resultUrl: null,
  error: null,
  prompt: '',

  // Actions
  setPrompt: (prompt) => set({ prompt }),

  startGeneration: (jobId) =>
    set({
      jobId,
      status: 'queued',
      progress: 0,
      resultUrl: null,
      error: null,
    }),

  setUploading: () =>
    set({
      status: 'uploading',
      progress: 2,
    }),

  updateProgress: (status, progress) =>
    set({ status, progress }),

  setCompleted: (resultUrl) =>
    set({
      status: 'completed',
      progress: 100,
      resultUrl,
    }),

  setFailed: (error) =>
    set({
      status: 'failed',
      progress: 0,
      error,
    }),

  reset: () =>
    set({
      jobId: null,
      status: 'idle',
      progress: 0,
      resultUrl: null,
      error: null,
    }),
}));
