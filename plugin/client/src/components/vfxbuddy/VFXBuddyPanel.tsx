import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mascot, MascotStatus } from './Mascot';
import { Wand2, RotateCcw, Settings, Upload, Film, AlertCircle, Loader2, X, Gamepad2, Sun, Moon } from 'lucide-react';
import { useGenerationStore } from '../../stores/useGenerationStore';
import { useAdobeStore } from '../../stores/useAdobeStore';
import { useCreditStore } from '../../stores/useCreditStore';
import { uploadVideo, uploadVideoFromPath, startGeneration, startPresetGeneration, getDownloadUrl, healthCheck, enhancePrompt, startMotionGeneration, getMotionDownloadUrl, uploadImage } from '../../services/api';
import { getSelectedClip, exportClipToTemp, importResult, importMotionResult, isInsideAdobe } from '../../services/adobe';
import { startPollingFallback } from '../../services/socket';
import { Type, Layers, Image, AlignLeft, ArrowRightLeft } from 'lucide-react';
import { VFXBuddyBlackjack } from '../vfxbuddy-blackjack/VFXBuddyBlackjack';
import { GameSelector } from '../games/GameSelector';
import { FlappyBird } from '../games/flappy-bird/FlappyBird';
import { MemoryMatch } from '../games/memory-match/MemoryMatch';
import { Wordle } from '../games/wordle/Wordle';
import { GameId } from '../games/types';
import { CreditBadge } from './CreditBadge';
import { SettingsPage } from './SettingsPage';
import { InsufficientCreditsModal } from './InsufficientCreditsModal';

// Effect presets with their prompt templates (used for video-to-video presets)
const EFFECT_PRESETS: Record<string, string> = {
  'Earth Zoom Out': 'Create a dramatic earth zoom out effect, starting from close up and pulling back to reveal the full scene from a satellite perspective',
  'Set on Fire': 'Add realistic fire and flames engulfing the scene with intense orange and red fire effects, embers, and heat distortion',
  'Flood Scene': 'Transform the scene into a flood scenario with rising water, waves, and dramatic water effects covering the ground',
  'Mixed Media (Comic)': 'Transform the video into a mixed media comic book style with halftone dots, bold outlines, and pop art colors',
  'Atomic Explosion': 'Add a dramatic nuclear explosion in the background with a mushroom cloud, shockwave, and intense light flash',
};

// Presets that use image-to-video (first frame → AI video) instead of video-to-video.
// Maps display name → backend presetId. Prompt is resolved server-side.
const IMAGE_TO_VIDEO_PRESETS: Record<string, string> = {
  'Earth Zoom Out': 'earth-zoomout',
};

// Fixed model — Runway Gen-4 Aleph
const MODEL = { provider: 'runway', model: 'gen4_aleph' } as const;

// Motion template presets — maps UI labels to Remotion template IDs
const MOTION_TEMPLATES = [
  { id: 'TitleSlam', label: 'Title Slam', icon: Type, prompt: 'Bold title animation' },
  { id: 'LowerThird', label: 'Lower Third', icon: Layers, prompt: 'Professional lower third name tag' },
  { id: 'LogoReveal', label: 'Logo Reveal', icon: Image, prompt: 'Logo reveal animation' },
  { id: 'KineticType', label: 'Kinetic Type', icon: AlignLeft, prompt: 'Kinetic typography animation' },
  { id: 'SimpleTransition', label: 'Transition', icon: ArrowRightLeft, prompt: 'Clean transition between scenes' },
] as const;

const MOTION_CREDIT_COST = 5;

/**
 * Clean up backend error messages into user-friendly text.
 */
function friendlyError(raw: string): string {
  const lower = raw.toLowerCase();

  if (lower.includes('content moderation') || lower.includes('moderation')) {
    return "Your prompt couldn't be processed — try rephrasing it with VFX-friendly language (e.g. \"add fire effects\" instead of \"set on fire\").";
  }
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return 'Generation took too long — please try again.';
  }
  if (lower.includes('cancelled') || lower.includes('canceled')) {
    return 'Generation was cancelled.';
  }
  if (lower.includes('insufficient_credits')) {
    return 'Not enough credits for this generation.';
  }
  if (lower.includes('no clip selected') || lower.includes('no active sequence')) {
    return 'Select a clip on the timeline first, then hit Generate.';
  }
  if (lower.includes('evalscript error') || lower.includes('host script not loaded')) {
    return 'Lost connection to After Effects. Try closing and reopening the FXbuddy panel, then try again.';
  }
  if (lower.includes('no composition') || lower.includes('select a composition')) {
    return 'Open a composition first, then select a layer and hit Generate.';
  }
  if (lower.includes('no layer selected')) {
    return 'Select a layer in the timeline first, then hit Generate.';
  }
  if (lower.includes('asset duration') || (lower.includes('duration') && lower.includes('at least'))) {
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

const GameProgressBar: React.FC = React.memo(() => {
  const status = useGenerationStore((s) => s.status);
  const progress = useGenerationStore((s) => s.progress);
  const error = useGenerationStore((s) => s.error);

  if (status === 'idle') return null;

  const active = status !== 'completed' && status !== 'failed';
  const pct = progress > 0 ? `${progress}%` : '0%';

  const label = (() => {
    switch (status) {
      case 'uploading': return 'Uploading...';
      case 'queued': return 'Queued...';
      case 'generating': return `Generating... ${progress}%`;
      case 'downloading': return 'Downloading...';
      case 'completed': return 'Complete!';
      case 'failed': return error || 'Failed';
      default: return '';
    }
  })();

  return (
    <div className="w-full px-4 py-2 bg-base">
      <div className="flex items-center gap-2 mb-1">
        {active && <div className="w-1.5 h-1.5 rounded-full bg-neu-accent animate-pulse" />}
        <span className="text-[10px] text-neu-text-light font-medium">{label}</span>
      </div>
      <div className="w-full h-1 bg-base rounded-full shadow-neu-pressed overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            status === 'failed' ? 'bg-status-error' :
            status === 'completed' ? 'bg-status-success' :
            'bg-neu-accent'
          }`}
          style={{ width: active || status === 'completed' || status === 'failed' ? pct : '0%' }}
        />
      </div>
    </div>
  );
});

export const VFXBuddyPanel: React.FC = () => {
  const [mascotStatus, setMascotStatus] = useState<MascotStatus>('idle');
  const [homeInputValue, setHomeInputValue] = useState('');
  const [motionInputValue, setMotionInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<'motion' | 'home' | 'effects'>('home');

  // Derived: read/write the prompt for whichever tab is active
  const inputValue = activeTab === 'motion' ? motionInputValue : homeInputValue;
  const setInputValue = activeTab === 'motion' ? setMotionInputValue : setHomeInputValue;
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<5 | 10>(5);
  const [motionDuration, setMotionDuration] = useState<2 | 3 | 5>(3);
  const [motionImageUrl, setMotionImageUrl] = useState<string | null>(null);
  const [motionImageName, setMotionImageName] = useState<string | null>(null);
  const [motionImageFileId, setMotionImageFileId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceStatus, setEnhanceStatus] = useState<string | null>(null);
  const [sceneDescriptionCache, setSceneDescriptionCache] = useState<{
    mediaPath: string;
    inPoint: number;
    description: string;
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showInsufficientCredits, setShowInsufficientCredits] = useState(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('fxbuddy-dark-mode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('fxbuddy-dark-mode', String(darkMode));
  }, [darkMode]);

  // Blackjack mini-game state
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [showGamePrompt, setShowGamePrompt] = useState(false);
  const [gameDismissed, setGameDismissed] = useState(() => {
    return localStorage.getItem('fxbuddy-game-dismissed') === 'true';
  });
  const [renderTimeRemaining, setRenderTimeRemaining] = useState<number | null>(null);
  const genStartTimeRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  // Zustand stores
  const generation = useGenerationStore();
  const adobe = useAdobeStore();
  const { balance, fetchBalance } = useCreditStore();

  // Fetch credit balance on mount and after generation completes
  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    if (generation.status === 'completed') {
      fetchBalance();
      setHomeInputValue('');
      setMotionInputValue('');
    }
    if (generation.status === 'failed') {
      fetchBalance();
    }
  }, [generation.status]);

  // Check backend health on mount
  useEffect(() => {
    healthCheck().then(setBackendOnline);
    const interval = setInterval(() => {
      healthCheck().then(setBackendOnline);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Start polling fallback whenever a generation job is active
  // (covers cases where Socket.io is disconnected or reconnecting)
  useEffect(() => {
    if (generation.jobId && generation.status !== 'idle' && generation.status !== 'completed' && generation.status !== 'failed') {
      startPollingFallback();
    }
  }, [generation.jobId, generation.status]);

  // Sync mascot status with generation status
  useEffect(() => {
    switch (generation.status) {
      case 'uploading':
      case 'queued':
        setMascotStatus('waiting');
        break;
      case 'generating':
        setMascotStatus('waiting');
        break;
      case 'downloading':
        setMascotStatus('waiting');
        break;
      case 'completed':
        setMascotStatus('success');
        setTimeout(() => setMascotStatus('idle'), 3000);
        break;
      case 'failed':
        setMascotStatus('error');
        setTimeout(() => setMascotStatus('idle'), 3000);
        break;
    }
  }, [generation.status]);

  // Flash mascot reaction when switching tabs, then return to idle
  useEffect(() => {
    if (generation.status !== 'idle') return;
    if (activeTab === 'effects' || activeTab === 'motion') {
      setMascotStatus('surprised');
      const timer = setTimeout(() => setMascotStatus('idle'), 1200);
      return () => clearTimeout(timer);
    } else {
      setMascotStatus('idle');
    }
  }, [activeTab, generation.status]);

  // Idle timer logic
  useEffect(() => {
    const resetIdleTimer = () => {
      if (mascotStatus === 'sleeping') {
        setMascotStatus('idle');
      }
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      if (mascotStatus === 'idle' || mascotStatus === 'sleeping') {
        idleTimeoutRef.current = setTimeout(() => {
          setMascotStatus('sleeping');
        }, 8000);
      }
    };

    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    resetIdleTimer();

    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
    };
  }, [mascotStatus]);

  // Show game prompt once on the very first generation (never again after dismissed)
  useEffect(() => {
    if (generation.status === 'queued' || generation.status === 'generating') {
      if (!genStartTimeRef.current) genStartTimeRef.current = Date.now();
      if (!gameDismissed && !activeGame && !showGamePrompt) {
        const t = setTimeout(() => setShowGamePrompt(true), 1500);
        return () => clearTimeout(t);
      }
    }
    if (generation.status === 'idle' || generation.status === 'failed') {
      setActiveGame(null);
      setShowGamePrompt(false);
      if (generation.status === 'idle') genStartTimeRef.current = null;
    }
  }, [generation.status]);

  // Render time estimate for blackjack status bar
  progressRef.current = generation.progress;
  useEffect(() => {
    if (activeGame !== 'blackjack') {
      setRenderTimeRemaining(null);
      return;
    }
    const interval = setInterval(() => {
      if (!genStartTimeRef.current || progressRef.current <= 2) {
        setRenderTimeRemaining(null);
        return;
      }
      const elapsed = (Date.now() - genStartTimeRef.current) / 1000;
      if (elapsed < 5) { setRenderTimeRemaining(null); return; }
      const rate = progressRef.current / elapsed;
      if (rate <= 0) { setRenderTimeRemaining(null); return; }
      setRenderTimeRemaining(Math.round(Math.max(0, (100 - progressRef.current) / rate)));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeGame]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (activeTab === 'motion') {
        handleMotionGenerate();
      } else {
        handleGenerate();
      }
    }
  };

  const handleEnhancePrompt = async () => {
    if (!inputValue.trim() || isEnhancing) return;

    setIsEnhancing(true);
    setMascotStatus('typing');

    try {
      if (activeTab === 'motion') {
        // ── Motion Mode ──
        setEnhanceStatus(motionImageFileId ? 'Analyzing image...' : 'Enhancing...');
        const result = await enhancePrompt(inputValue.trim(), {
          mode: 'motion',
          imageFileId: motionImageFileId ?? undefined,
        });
        setInputValue(result.enhanced);
      } else {
        // ── VFX Mode ──
        let mediaPath: string | undefined;
        let inPoint: number | undefined;

        if (isInsideAdobe()) {
          try {
            setEnhanceStatus('Getting clip info...');
            const clip = await getSelectedClip();
            mediaPath = clip.mediaPath;
            inPoint = clip.playheadTime ?? clip.inPoint;
          } catch (clipErr: any) {
            console.warn('[FXbuddy] Could not get clip for vision analysis:', clipErr.message);
          }
        }

        // Check frontend cache
        let cachedDescription: string | undefined;
        if (mediaPath && sceneDescriptionCache &&
            sceneDescriptionCache.mediaPath === mediaPath &&
            sceneDescriptionCache.inPoint === (inPoint ?? 0)) {
          cachedDescription = sceneDescriptionCache.description;
          setEnhanceStatus('Enhancing...');
        } else if (mediaPath) {
          setEnhanceStatus('Analyzing scene...');
        } else {
          setEnhanceStatus('Enhancing...');
        }

        const result = await enhancePrompt(inputValue.trim(), {
          mode: 'vfx',
          mediaPath,
          inPoint,
          cachedDescription,
        });
        setInputValue(result.enhanced);

        // Cache the scene description for future enhance calls on the same clip
        if (result.sceneDescription && mediaPath) {
          setSceneDescriptionCache({
            mediaPath,
            inPoint: inPoint ?? 0,
            description: result.sceneDescription,
          });
        }
      }

      setMascotStatus('success');
      setTimeout(() => setMascotStatus('idle'), 1500);
    } catch (err: any) {
      console.error('[FXbuddy] Enhance prompt error:', err);
      setMascotStatus('error');
      setTimeout(() => setMascotStatus('idle'), 2000);
    } finally {
      setIsEnhancing(false);
      setEnhanceStatus(null);
    }
  };

  const handleReset = () => {
    setInputValue('');
    generation.reset();
    setMascotStatus('idle');
    setMotionImageUrl(null);
    setMotionImageName(null);
    setMotionImageFileId(null);
    setSceneDescriptionCache(null);
  };

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const result = await uploadImage(file);
      const apiBase = (window as any).__FXBUDDY_API_BASE__ || 'http://localhost:4000';
      const fullUrl = `${apiBase}${result.url}`;
      setMotionImageUrl(fullUrl);
      setMotionImageName(file.name);
      setMotionImageFileId(result.fileId);
      console.log('[FXbuddy] Image uploaded:', fullUrl, 'fileId:', result.fileId);
    } catch (err: any) {
      console.error('[FXbuddy] Image upload failed:', err);
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }, []);

  const handleMascotClick = () => {
    if (generation.status !== 'idle') return;
    setMascotStatus('clicked');
    setTimeout(() => setMascotStatus('idle'), 800);
  };


  const handleGameExit = useCallback(() => {
    setActiveGame(null);
  }, []);

  const handleGamePromptAccept = useCallback(() => {
    setShowGamePrompt(false);
    setActiveGame('selector');
  }, []);

  const handleGamePromptDismiss = useCallback(() => {
    setShowGamePrompt(false);
    setGameDismissed(true);
    localStorage.setItem('fxbuddy-game-dismissed', 'true');
  }, []);

  const creditCost = selectedDuration === 10 ? 20 : 10;
  const canAfford = balance != null ? balance.total >= creditCost : true;

  /**
   * Full generation flow with credit checking.
   */
  const handleGenerate = useCallback(async () => {
    if (!inputValue.trim()) return;
    if (generation.status !== 'idle' && generation.status !== 'completed' && generation.status !== 'failed') return;

    // Check generations before proceeding
    if (balance && balance.total < creditCost) {
      setShowInsufficientCredits(true);
      return;
    }

    try {
      generation.reset();
      generation.setUploading();

      // Optimistically deduct in the UI
      useCreditStore.getState().deductLocally(creditCost);

      if (isInsideAdobe()) {
        const clip = await getSelectedClip();
        const exportPath = await exportClipToTemp(clip);

        const uploadResult = await uploadVideoFromPath(exportPath);
        const genResult = await startGeneration(
          uploadResult.fileId,
          inputValue.trim(),
          selectedDuration,
          clip.inPoint,
          clip.outPoint,
          MODEL.provider,
          MODEL.model,
        );
        generation.startGeneration(genResult.jobId);

        const unsubscribe = useGenerationStore.subscribe((state) => {
          if (state.status === 'completed' && state.resultUrl) {
            const downloadUrl = getDownloadUrl(genResult.jobId);
            importResult(downloadUrl, clip).catch(console.error);
            unsubscribe();
          }
        });
      } else {
        if (!fileInputRef.current?.files?.length) {
          fileInputRef.current?.click();
          generation.reset();
          fetchBalance();
          return;
        }

        const file = fileInputRef.current.files[0];
        const uploadResult = await uploadVideo(file, (pct) => {
          generation.updateProgress('uploading', pct);
        });

        const genResult = await startGeneration(
          uploadResult.fileId,
          inputValue.trim(),
          selectedDuration,
          undefined,
          undefined,
          MODEL.provider,
          MODEL.model,
        );
        generation.startGeneration(genResult.jobId);
      }
    } catch (err: any) {
      console.error('[FXbuddy] Generation error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Something went wrong';

      if (errorMsg === 'insufficient_credits') {
        setShowInsufficientCredits(true);
        generation.reset();
      } else {
        generation.setFailed(friendlyError(errorMsg));
      }
      // Re-sync balance from server on error
      fetchBalance();
    }
  }, [homeInputValue, generation, balance, fetchBalance, creditCost, selectedDuration]);

  /**
   * Handle file selection from the file picker (browser mode).
   */
  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !inputValue.trim()) return;

    if (balance && balance.total < creditCost) {
      setShowInsufficientCredits(true);
      return;
    }

    try {
      generation.setUploading();

      useCreditStore.getState().deductLocally(creditCost);

      const uploadResult = await uploadVideo(file, (pct) => {
        generation.updateProgress('uploading', pct);
      });

      const genResult = await startGeneration(
        uploadResult.fileId,
        inputValue.trim(),
        selectedDuration,
        undefined,
        undefined,
        MODEL.provider,
        MODEL.model,
      );
      generation.startGeneration(genResult.jobId);
    } catch (err: any) {
      console.error('[FXbuddy] Upload error:', err);
      generation.setFailed(friendlyError(err.message || 'Upload failed'));
      fetchBalance();
    }
  }, [homeInputValue, generation, balance, fetchBalance, creditCost, selectedDuration]);

  /**
   * Handle motion graphics generation (Remotion-based, no source clip needed).
   */
  const handleMotionGenerate = useCallback(async (templateId?: string) => {
    if (!inputValue.trim()) return;
    if (generation.status !== 'idle' && generation.status !== 'completed' && generation.status !== 'failed') return;

    if (balance && balance.total < MOTION_CREDIT_COST) {
      setShowInsufficientCredits(true);
      return;
    }

    try {
      generation.reset();
      generation.setUploading();

      useCreditStore.getState().deductLocally(MOTION_CREDIT_COST);

      // Pass uploaded image URL as logoUrl prop when available
      const motionProps = motionImageUrl ? { logoUrl: motionImageUrl } : undefined;

      const result = await startMotionGeneration(
        inputValue.trim(),
        templateId,
        motionProps,
        motionDuration,
      );
      generation.startGeneration(result.jobId);

      // Auto-import to timeline at playhead (no source clip needed)
      const unsubscribe = useGenerationStore.subscribe(async (state) => {
        if (state.status === 'completed' && state.resultUrl) {
          const downloadUrl = getMotionDownloadUrl(result.jobId);
          importMotionResult(downloadUrl).catch((err) => {
            console.error('[FXbuddy] Motion import error:', err);
          });
          unsubscribe();
        }
      });
    } catch (err: any) {
      console.error('[FXbuddy] Motion generation error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Something went wrong';

      if (errorMsg === 'insufficient_credits') {
        setShowInsufficientCredits(true);
        generation.reset();
      } else {
        generation.setFailed(friendlyError(errorMsg));
      }
      fetchBalance();
    }
  }, [motionInputValue, generation, balance, fetchBalance, motionDuration]);

  /**
   * Handle clicking an effect preset.
   */
  const handleEffectClick = useCallback(async (effectName: string) => {
    const presetId = IMAGE_TO_VIDEO_PRESETS[effectName];

    if (!presetId) {
      const prompt = EFFECT_PRESETS[effectName] || effectName;
      setInputValue(prompt);
      setActiveTab('home');
      return;
    }

    if (generation.status !== 'idle' && generation.status !== 'completed' && generation.status !== 'failed') return;

    if (balance && balance.total < creditCost) {
      setShowInsufficientCredits(true);
      return;
    }

    try {
      generation.reset();
      generation.setUploading();

      useCreditStore.getState().deductLocally(creditCost);

      if (isInsideAdobe()) {
        const clip = await getSelectedClip();
        const exportPath = await exportClipToTemp(clip);
        const uploadResult = await uploadVideoFromPath(exportPath);
        const genResult = await startPresetGeneration(
          uploadResult.fileId,
          presetId,
          clip.inPoint,
          clip.outPoint,
        );
        generation.startGeneration(genResult.jobId);

        const unsubscribe = useGenerationStore.subscribe((state) => {
          if (state.status === 'completed' && state.resultUrl) {
            const downloadUrl = getDownloadUrl(genResult.jobId);
            importResult(downloadUrl, clip).catch(console.error);
            unsubscribe();
          }
        });
      } else {
        if (!fileInputRef.current?.files?.length) {
          fileInputRef.current?.click();
          generation.reset();
          fetchBalance();
          return;
        }

        const file = fileInputRef.current.files[0];
        const uploadResult = await uploadVideo(file, (pct) => {
          generation.updateProgress('uploading', pct);
        });
        const genResult = await startPresetGeneration(
          uploadResult.fileId,
          presetId,
        );
        generation.startGeneration(genResult.jobId);
      }

      setActiveTab('home');
    } catch (err: any) {
      console.error('[FXbuddy] Preset generation error:', err);
      generation.setFailed(friendlyError(err.message || 'Something went wrong'));
      setActiveTab('home');
      fetchBalance();
    }
  }, [generation, balance, fetchBalance, creditCost]);

  const isProcessing = generation.status !== 'idle' && generation.status !== 'completed' && generation.status !== 'failed';
  const progressWidth = generation.progress > 0 ? `${generation.progress}%` : '0%';

  const getStatusText = (): string => {
    switch (generation.status) {
      case 'uploading': return 'Uploading...';
      case 'queued': return 'Queued...';
      case 'generating': return `Generating... ${generation.progress}%`;
      case 'downloading': return 'Downloading result...';
      case 'completed': return 'Complete!';
      case 'failed': return generation.error || 'Failed';
      default: return '';
    }
  };

  // Show Settings Page as full overlay
  if (showSettings) {
    return (
      <div className="h-full bg-base text-neu-text font-sans">
        <SettingsPage onClose={() => setShowSettings(false)} userEmail={(() => { try { return localStorage.getItem('fxbuddy-user-email') || undefined; } catch { return undefined; } })()} />
      </div>
    );
  }

  return (
    <div className="h-full bg-base text-neu-text font-sans flex flex-col transition-colors duration-300 overflow-y-auto">

      {/* Hidden file input for browser mode */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Hidden image input for Motion tab logo upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Insufficient Credits Modal */}
      {showInsufficientCredits && (
        <InsufficientCreditsModal
          creditsNeeded={creditCost}
          creditsAvailable={balance?.total ?? 0}
          onBuyCredits={() => setShowSettings(true)}
          onUpgrade={() => setShowSettings(true)}
          onClose={() => setShowInsufficientCredits(false)}
        />
      )}

      {/* Game Prompt Popup */}
      {showGamePrompt && !activeGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 animate-fade-in">
          <div className="relative bg-base rounded-2xl shadow-neu-button p-6 mx-6 max-w-[280px] w-full flex flex-col items-center gap-4">
            <button
              onClick={handleGamePromptDismiss}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-neu-text-light hover:text-neu-accent transition-colors"
            >
              <X size={14} />
            </button>
            <div className="w-10 h-10 rounded-full bg-base shadow-neu-button flex items-center justify-center">
              <Gamepad2 size={20} className="text-neu-accent" />
            </div>
            <p className="text-sm font-medium text-neu-text text-center font-syne">
              Play some games while you wait?
            </p>
            <button
              onClick={handleGamePromptAccept}
              className="w-full py-2.5 rounded-full bg-base text-sm font-semibold text-neu-text shadow-neu-button hover:shadow-neu-button-active active:scale-[0.98] transition-all font-syne"
            >
              Let's play!
            </button>
          </div>
        </div>
      )}

      {activeGame === 'blackjack' ? (
        <VFXBuddyBlackjack
          isVisible={true}
          renderTimeRemaining={renderTimeRemaining}
          generationComplete={generation.status === 'completed'}
          onExit={handleGameExit}
        />
      ) : activeGame === 'selector' ? (
        <GameSelector onSelectGame={setActiveGame} onExit={handleGameExit} />
      ) : activeGame === 'flappy' ? (
        <FlappyBird onExit={handleGameExit} />
      ) : activeGame === 'memory' ? (
        <MemoryMatch onExit={handleGameExit} />
      ) : activeGame === 'wordle' ? (
        <Wordle onExit={handleGameExit} />
      ) : (
      <main className="w-full bg-base p-8 flex flex-col gap-5">

        {/* Header with Credit Badge */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-neu-text-light/50 font-syne">FXbuddy</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveGame('selector')}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-base shadow-neu-button hover:shadow-neu-button-active active:scale-95 transition-all"
              title="Games"
            >
              <Gamepad2 size={13} className="text-neu-text" />
            </button>
            <button
              onClick={() => setDarkMode((d) => !d)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-base shadow-neu-button hover:shadow-neu-button-active active:scale-95 transition-all"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun size={13} className="text-neu-text" /> : <Moon size={13} className="text-neu-text" />}
            </button>
            <CreditBadge
              credits={balance?.total ?? null}
              onClick={() => setShowSettings(true)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setActiveTab('motion')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === 'motion' ? 'bg-base shadow-neu-pressed text-neu-accent' : 'text-neu-text-light hover:text-neu-text'}`}
          >
            Motion
          </button>
          <button
            onClick={() => setActiveTab('home')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === 'home' ? 'bg-base shadow-neu-pressed text-neu-accent' : 'text-neu-text-light hover:text-neu-text'}`}
          >
            Home
          </button>
          <button
            onClick={() => setActiveTab('effects')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === 'effects' ? 'bg-base shadow-neu-pressed text-neu-accent' : 'text-neu-text-light hover:text-neu-text'}`}
          >
            Effects
          </button>
        </div>


        {/* Mascot */}
        <div className="flex justify-center">
          <Mascot status={mascotStatus} className="w-28 h-16" onClick={handleMascotClick} />
        </div>

        {/* ─── HOME TAB ─── */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-neu-text font-syne">
                What do you want to create?
              </h2>
            </div>

            {/* Input Field Area */}
            <div className="relative">
              <textarea
                placeholder={isInsideAdobe()
                  ? 'Select a clip, then describe the VFX you want...'
                  : 'Describe the VFX you want (pick a video file when generating)...'}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (generation.status === 'idle') setMascotStatus('typing'); }}
                onBlur={() => { if (generation.status === 'idle') setMascotStatus('idle'); }}
                disabled={isProcessing}
                className="w-full h-28 bg-base text-neu-text rounded-glass-sm px-4 py-3 pr-12 shadow-neu-pressed focus:outline-none focus:ring-1 focus:ring-neu-accent/20 transition-all placeholder-neu-text-light resize-none text-sm disabled:opacity-50"
              />
              <button
                onClick={handleEnhancePrompt}
                disabled={isProcessing || isEnhancing || !inputValue.trim()}
                className="absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-base text-neu-text-light shadow-neu-button hover:shadow-neu-button-active hover:text-neu-accent active:scale-95 transition-all disabled:opacity-30"
                title="Enhance Prompt"
              >
                {isEnhancing ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
              </button>
            </div>

            {/* Enhance Status */}
            {isEnhancing && enhanceStatus && (
              <div className="text-center">
                <span className="text-[10px] text-neu-accent font-medium animate-pulse">{enhanceStatus}</span>
              </div>
            )}

            {/* Status Text */}
            {generation.status !== 'idle' && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  {generation.status === 'failed' && <AlertCircle size={14} className="text-red-400" />}
                  <span className={`text-xs font-medium ${generation.status === 'failed' ? 'text-red-400' : 'text-neu-accent'}`}>
                    {getStatusText()}
                  </span>
                </div>
              </div>
            )}

            {/* Duration Toggle */}
            <div className="flex items-center justify-center gap-1">
              <span className="text-[10px] text-neu-text-light mr-1.5">Duration</span>
              <div className="flex bg-base rounded-full shadow-neu-pressed p-0.5">
                <button
                  onClick={() => setSelectedDuration(5)}
                  disabled={isProcessing}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selectedDuration === 5
                      ? 'bg-base shadow-neu-button text-neu-accent'
                      : 'text-neu-text-light hover:text-neu-text'
                  }`}
                >
                  5s
                </button>
                <button
                  onClick={() => setSelectedDuration(10)}
                  disabled={isProcessing}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selectedDuration === 10
                      ? 'bg-base shadow-neu-button text-neu-accent'
                      : 'text-neu-text-light hover:text-neu-text'
                  }`}
                >
                  10s
                </button>
              </div>
              <span className="text-[10px] text-neu-text-light ml-1.5">{creditCost} credits</span>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handleReset}
                className="p-3 rounded-full bg-base text-neu-text-light shadow-neu-button hover:shadow-neu-button-active hover:text-neu-text transition-all active:scale-95"
                title="Reset"
              >
                <RotateCcw size={18} />
              </button>

              <button
                onClick={handleGenerate}
                disabled={!inputValue.trim() || isProcessing || backendOnline === false || !canAfford}
                className="flex-1 py-3 rounded-full bg-base text-neu-accent font-bold shadow-neu-button hover:shadow-neu-button-active active:scale-95 transition-all duration-200 uppercase tracking-wide text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-neu-accent/30 border-t-neu-accent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : !canAfford ? (
                  `Need ${creditCost - (balance?.total ?? 0)} more credits`
                ) : (
                  <>Generate<span className="text-neu-text-light font-normal text-[10px] ml-1">{creditCost} cr</span></>
                )}
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="p-3 rounded-full bg-base text-neu-text-light shadow-neu-button hover:shadow-neu-button-active hover:text-neu-text transition-all active:scale-95"
                title="Settings"
              >
                <Settings size={18} />
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="w-full h-1.5 bg-base rounded-full shadow-neu-pressed overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  generation.status === 'failed' ? 'bg-red-400' :
                  generation.status === 'completed' ? 'bg-status-success' :
                  isProcessing ? 'bg-neu-accent' :
                  ''
                }`}
                style={{ width: isProcessing || generation.status === 'completed' || generation.status === 'failed' ? progressWidth : '0%' }}
              />
            </div>
          </div>
        )}

        {/* ─── MOTION TAB ─── */}
        {activeTab === 'motion' && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <h2 className="text-lg font-semibold text-neu-text font-syne text-center">Create Motion Graphics</h2>

            {/* Motion Input Area */}
            <div className="relative">
              <textarea
                placeholder="Describe the motion graphic you want to create (e.g. &quot;bold red title that says FIRE&quot;)..."
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (generation.status === 'idle') setMascotStatus('typing'); }}
                onBlur={() => { if (generation.status === 'idle') setMascotStatus('idle'); }}
                disabled={isProcessing}
                className="w-full h-28 bg-base text-neu-text rounded-glass-sm px-4 py-3 pr-12 shadow-neu-pressed focus:outline-none focus:ring-1 focus:ring-neu-accent/20 transition-all placeholder-neu-text-light resize-none text-sm disabled:opacity-50"
              />

              {/* Action buttons */}
              <div className="absolute bottom-3 right-3 flex gap-1.5">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isProcessing || isUploadingImage}
                  className={`w-8 h-8 flex items-center justify-center rounded-full bg-base shadow-neu-button hover:shadow-neu-button-active active:scale-95 transition-all disabled:opacity-30 ${
                    motionImageUrl ? 'text-neu-accent ring-1 ring-neu-accent/30' : 'text-neu-text-light hover:text-neu-accent'
                  }`}
                  title={motionImageUrl ? `Image: ${motionImageName}` : 'Upload Image (logo, icon, etc.)'}
                >
                  {isUploadingImage ? <Loader2 size={15} className="animate-spin" /> : <Image size={15} />}
                </button>
                <button
                  onClick={handleEnhancePrompt}
                  disabled={isProcessing || isEnhancing || !inputValue.trim()}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-base text-neu-text-light shadow-neu-button hover:shadow-neu-button-active hover:text-neu-accent active:scale-95 transition-all disabled:opacity-30"
                  title="Enhance Prompt"
                >
                  {isEnhancing ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                </button>
              </div>
            </div>

            {/* Attached image indicator */}
            {motionImageUrl && (
              <div className="flex items-center gap-2 px-1">
                <div className="flex items-center gap-2 bg-base rounded-full shadow-neu-pressed px-3 py-1.5">
                  <Image size={12} className="text-neu-accent flex-shrink-0" />
                  <span className="text-[10px] text-neu-text truncate max-w-[140px]">{motionImageName}</span>
                  <button
                    onClick={() => { setMotionImageUrl(null); setMotionImageName(null); setMotionImageFileId(null); }}
                    className="text-neu-text-light hover:text-red-400 transition-colors flex-shrink-0"
                    title="Remove image"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Enhance Status */}
            {isEnhancing && enhanceStatus && (
              <div className="text-center">
                <span className="text-[10px] text-neu-accent font-medium animate-pulse">{enhanceStatus}</span>
              </div>
            )}

            {/* Status Text */}
            {generation.status !== 'idle' && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  {generation.status === 'failed' && <AlertCircle size={14} className="text-red-400" />}
                  <span className={`text-xs font-medium ${generation.status === 'failed' ? 'text-red-400' : 'text-neu-accent'}`}>
                    {getStatusText()}
                  </span>
                </div>
              </div>
            )}

            {/* Duration Toggle */}
            <div className="flex items-center justify-center gap-1">
              <span className="text-[10px] text-neu-text-light mr-1.5">Duration</span>
              <div className="flex bg-base rounded-full shadow-neu-pressed p-0.5">
                {([2, 3, 5] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setMotionDuration(d)}
                    disabled={isProcessing}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      motionDuration === d
                        ? 'bg-base shadow-neu-button text-neu-accent'
                        : 'text-neu-text-light hover:text-neu-text'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-neu-text-light ml-1.5">{MOTION_CREDIT_COST} credits</span>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handleReset}
                className="p-3 rounded-full bg-base text-neu-text-light shadow-neu-button hover:shadow-neu-button-active hover:text-neu-text transition-all active:scale-95"
                title="Reset"
              >
                <RotateCcw size={18} />
              </button>

              <button
                onClick={() => handleMotionGenerate()}
                disabled={!inputValue.trim() || isProcessing || backendOnline === false || (balance != null && balance.total < MOTION_CREDIT_COST)}
                className="flex-1 py-3 rounded-full bg-base text-neu-accent font-bold shadow-neu-button hover:shadow-neu-button-active active:scale-95 transition-all duration-200 uppercase tracking-wide text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-neu-accent/30 border-t-neu-accent rounded-full animate-spin" />
                    Rendering...
                  </>
                ) : (balance != null && balance.total < MOTION_CREDIT_COST) ? (
                  `Need ${MOTION_CREDIT_COST - (balance?.total ?? 0)} more credits`
                ) : (
                  <>Generate<span className="text-neu-text-light font-normal text-[10px] ml-1">{MOTION_CREDIT_COST} cr</span></>
                )}
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="p-3 rounded-full bg-base text-neu-text-light shadow-neu-button hover:shadow-neu-button-active hover:text-neu-text transition-all active:scale-95"
                title="Settings"
              >
                <Settings size={18} />
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="w-full h-1.5 bg-base rounded-full shadow-neu-pressed overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  generation.status === 'failed' ? 'bg-red-400' :
                  generation.status === 'completed' ? 'bg-status-success' :
                  isProcessing ? 'bg-neu-accent' :
                  ''
                }`}
                style={{ width: isProcessing || generation.status === 'completed' || generation.status === 'failed' ? progressWidth : '0%' }}
              />
            </div>

            {/* Template Quick-Select Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {MOTION_TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                      setInputValue(tmpl.prompt);
                    }}
                    disabled={isProcessing}
                    className="h-20 rounded-glass-sm bg-base shadow-neu-button hover:shadow-neu-button-active flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <div className="w-7 h-7 rounded-full bg-base shadow-neu-icon flex items-center justify-center">
                      <Icon size={14} className="text-neu-accent" />
                    </div>
                    <span className="text-[10px] font-medium text-neu-text text-center leading-tight">{tmpl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── EFFECTS TAB ─── */}
        {activeTab === 'effects' && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <h2 className="text-lg font-semibold text-neu-text font-syne text-center">Effects Gallery</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(EFFECT_PRESETS).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleEffectClick(preset)}
                  className="h-24 rounded-glass-sm bg-base shadow-neu-button hover:shadow-neu-button-active flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <div className="w-8 h-8 rounded-full bg-base shadow-neu-icon flex items-center justify-center">
                    <div className="w-3 h-3 bg-neu-accent rounded-full opacity-50"></div>
                  </div>
                  <span className="text-xs font-medium text-neu-text text-center px-2 leading-tight">{preset}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <footer className="w-full flex items-center gap-2 pt-2">
          <span className="text-[10px] text-neu-text-light/40">v1.0</span>
        </footer>
      </main>
      )}

      {/* Generation progress bar — visible inside games */}
      {activeGame && <GameProgressBar />}

    </div>
  );
};
