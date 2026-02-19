import { io, Socket } from 'socket.io-client';
import { useGenerationStore, GenerationStatus } from '../stores/useGenerationStore';

const SOCKET_URL = (window as any).__FXBUDDY_API_BASE__ || 'http://localhost:4000';

/** Strip internal provider names from error messages shown to users. */
function sanitizeError(raw: string): string {
  const lower = raw.toLowerCase();

  if (lower.includes('content moderation') || lower.includes('moderation')) {
    return "Your prompt couldn't be processed — try rephrasing with VFX-friendly language.";
  }
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return 'Generation took too long — please try again.';
  }
  if (lower.includes('cancelled') || lower.includes('canceled')) {
    return 'Generation was cancelled.';
  }
  if (lower.includes('no clip selected') || lower.includes('no active sequence')) {
    return 'Select a clip on the timeline first, then hit Generate.';
  }
  if (lower.includes('evalscript error') || lower.includes('host script not loaded')) {
    return 'Lost connection to the host app. Try closing and reopening the FXbuddy panel, then try again.';
  }
  if (lower.includes('no composition') || lower.includes('select a composition')) {
    return 'Open a composition first, then select a layer and hit Generate.';
  }
  if (lower.includes('no layer selected')) {
    return 'Select a layer in the timeline first, then hit Generate.';
  }
  if (lower.includes('asset duration') || lower.includes('too_small') || (lower.includes('duration') && lower.includes('at least'))) {
    return 'Clip is too short — select a clip that is at least 1 second long and try again.';
  }
  if (lower.includes('upload') && lower.includes('failed')) {
    return 'Upload failed — check your connection and try again.';
  }
  if (lower.includes('file too large')) {
    return 'Clip is too large. Try a shorter selection.';
  }
  if (lower.includes('unprocessable')) {
    return 'The AI model rejected the request — try a different model or rephrase your prompt.';
  }

  let clean = raw
    .replace(/Runway generation failed:\s*/gi, '')
    .replace(/Generation failed:\s*/gi, '')
    .replace(/Runway\s*/gi, '');
  clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  return clean || 'Something went wrong — please try again.';
}

let socket: Socket | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize the Socket.io connection to the backend.
 * Listens for generation progress and completion events.
 * Uses unlimited reconnection so it never gives up if the backend restarts.
 */
export function initSocket(): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to backend');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  // Listen for generation progress updates
  socket.on('generation:progress', (data: {
    jobId: string;
    status: string;
    progress: number;
    resultUrl?: string;
    error?: string;
  }) => {
    const store = useGenerationStore.getState();

    // Only update if this is for our current job
    if (store.jobId === data.jobId) {
      store.updateProgress(data.status as GenerationStatus, data.progress);
    }
  });

  // Listen for generation completion
  socket.on('generation:completed', (data: {
    jobId: string;
    resultUrl: string;
  }) => {
    const store = useGenerationStore.getState();
    if (store.jobId === data.jobId) {
      store.setCompleted(data.resultUrl);
    }
  });

  // Listen for generation failure
  socket.on('generation:failed', (data: {
    jobId: string;
    error: string;
  }) => {
    const store = useGenerationStore.getState();
    if (store.jobId === data.jobId) {
      store.setFailed(sanitizeError(data.error));
    }
  });

  return socket;
}

/**
 * Poll the REST status endpoint as a fallback when Socket.io is disconnected.
 * Starts automatically when a job is active and the socket isn't connected,
 * and stops when the job completes/fails or the socket reconnects.
 */
export function startPollingFallback(): void {
  stopPollingFallback();

  pollTimer = setInterval(async () => {
    const store = useGenerationStore.getState();

    if (!store.jobId) { stopPollingFallback(); return; }
    if (store.status === 'completed' || store.status === 'failed' || store.status === 'idle') {
      stopPollingFallback();
      return;
    }
    if (socket?.connected) { stopPollingFallback(); return; }

    try {
      const { getStatus, getMotionStatus } = await import('./api');
      let data;
      try {
        data = await getStatus(store.jobId);
      } catch {
        // Job not found in VFX queue — try motion queue
        data = await getMotionStatus(store.jobId);
      }

      if (data.status === 'completed' && data.resultUrl) {
        store.setCompleted(data.resultUrl);
        stopPollingFallback();
      } else if (data.status === 'failed') {
        store.setFailed(sanitizeError(data.error || 'Generation failed'));
        stopPollingFallback();
      } else {
        store.updateProgress(data.status as GenerationStatus, data.progress ?? store.progress);
      }
    } catch {
      // Backend unreachable — keep polling
    }
  }, 3000);
}

export function stopPollingFallback(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/**
 * Disconnect the Socket.io connection.
 */
export function disconnectSocket(): void {
  stopPollingFallback();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current socket instance.
 */
export function getSocket(): Socket | null {
  return socket;
}
