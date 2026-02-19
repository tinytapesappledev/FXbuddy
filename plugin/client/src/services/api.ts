import axios, { AxiosError } from 'axios';

const API_BASE = (window as any).__FXBUDDY_API_BASE__ || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

// ─── Auth Token Management ───────────────────────────────────────────────────

let accessToken: string | null = localStorage.getItem('fxbuddy-access-token');
let refreshToken: string | null = localStorage.getItem('fxbuddy-refresh-token');
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

export function setAuthTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('fxbuddy-access-token', access);
  localStorage.setItem('fxbuddy-refresh-token', refresh);
}

export function clearAuthTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('fxbuddy-access-token');
  localStorage.removeItem('fxbuddy-refresh-token');
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function isAuthenticated(): boolean {
  return !!accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken });
        const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
        setAuthTokens(newAccess, newRefresh);

        refreshQueue.forEach((cb) => cb.resolve(newAccess));
        refreshQueue = [];

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshQueue.forEach((cb) => cb.reject(refreshError));
        refreshQueue = [];
        clearAuthTokens();
        window.dispatchEvent(new CustomEvent('fxbuddy-auth-expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Auth API ────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  plan: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/auth/register', { email, password });
  setAuthTokens(res.data.accessToken, res.data.refreshToken);
  localStorage.setItem('fxbuddy-user-email', res.data.user.email);
  return res.data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/auth/login', { email, password });
  setAuthTokens(res.data.accessToken, res.data.refreshToken);
  localStorage.setItem('fxbuddy-user-email', res.data.user.email);
  return res.data;
}

export function getUserEmail(): string | null {
  return localStorage.getItem('fxbuddy-user-email');
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/auth/logout', { refreshToken });
  } catch {}
  clearAuthTokens();
  localStorage.removeItem('fxbuddy-user-email');
}

export async function getMe(): Promise<AuthUser> {
  const res = await api.get<AuthUser>('/api/auth/me');
  return res.data;
}

// ─── Billing API ─────────────────────────────────────────────────────────────

export async function createCheckoutSession(type: 'subscription' | 'topup', plan?: string, packSize?: string): Promise<string> {
  const res = await api.post<{ url: string }>('/api/billing/create-checkout-session', { type, plan, packSize });
  return res.data.url;
}

export async function createPortalSession(): Promise<string> {
  const res = await api.post<{ url: string }>('/api/billing/create-portal-session');
  return res.data.url;
}

export interface UploadResponse {
  fileId: string;
  filename: string;
  path: string;
  size: number;
}

export interface GenerateResponse {
  jobId: string;
}

export interface StatusResponse {
  jobId: string;
  status: string;
  progress: number;
  resultUrl?: string;
  error?: string;
}

/**
 * Upload a video file to the backend.
 */
export async function uploadVideo(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('video', file);

  const response = await api.post<UploadResponse>('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (event.total && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });

  return response.data;
}

/**
 * Upload a video file from a local file path (for CEP/Node.js context).
 */
export async function uploadVideoFromPath(filePath: string): Promise<UploadResponse> {
  let fs: any = null;
  let nodePath: any = null;
  try {
    fs = (window as any).cep_node?.require('fs') || (window as any).require('fs');
    nodePath = (window as any).cep_node?.require('path') || (window as any).require('path');
  } catch (_) {
    // fall through
  }

  if (!fs) {
    throw new Error(
      'Cannot read local file: Node.js fs module not available. ' +
      'Are you running inside Adobe CEP with --enable-nodejs?'
    );
  }

  if (!fs.existsSync(filePath)) {
    throw new Error('Video file not found on disk: ' + filePath);
  }

  const stats = fs.statSync(filePath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
  console.log(`[API] Reading local file: ${filePath} (${sizeMB}MB)`);

  const ext = nodePath ? nodePath.extname(filePath).toLowerCase() : '.mp4';
  const mimeMap: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.webm': 'video/webm',
  };
  const mimeType = mimeMap[ext] || 'video/mp4';

  const buffer = fs.readFileSync(filePath);
  const blob = new Blob([buffer], { type: mimeType });
  const fileName = nodePath ? nodePath.basename(filePath) : (filePath.split('/').pop() || 'clip.mp4');
  const file = new File([blob], fileName, { type: mimeType });

  return uploadVideo(file);
}

/**
 * Start a VFX generation job.
 */
export async function startGeneration(
  fileId: string,
  prompt: string,
  duration?: number,
  inPoint?: number,
  outPoint?: number,
  provider?: string,
  model?: string,
): Promise<GenerateResponse> {
  const response = await api.post<GenerateResponse>('/api/generate', {
    fileId,
    prompt,
    duration,
    inPoint,
    outPoint,
    provider,
    model,
  });

  return response.data;
}

/**
 * Start an image-to-video preset generation job.
 */
export async function startPresetGeneration(
  fileId: string,
  presetId: string,
  inPoint?: number,
  outPoint?: number,
): Promise<GenerateResponse> {
  const response = await api.post<GenerateResponse>('/api/generate', {
    fileId,
    generationType: 'image-to-video',
    presetId,
    inPoint,
    outPoint,
  });

  return response.data;
}

/**
 * Check the status of a generation job (polling fallback).
 */
export async function getStatus(jobId: string): Promise<StatusResponse> {
  const response = await api.get<StatusResponse>(`/api/generate/status/${jobId}`);
  return response.data;
}

/**
 * Get the download URL for a completed generation.
 */
export function getDownloadUrl(jobId: string): string {
  return `${API_BASE}/api/generate/download/${jobId}`;
}

/**
 * Enhance a short prompt into a detailed, AI-friendly instruction.
 * Supports optional image-aware enhancement via vision analysis.
 */
export interface EnhancePromptOptions {
  mode?: 'vfx' | 'motion';
  mediaPath?: string;
  inPoint?: number;
  imageFileId?: string;
  cachedDescription?: string;
}

export interface EnhancePromptResult {
  enhanced: string;
  sceneDescription?: string;
}

export async function enhancePrompt(
  prompt: string,
  options?: EnhancePromptOptions,
): Promise<EnhancePromptResult> {
  const response = await api.post<EnhancePromptResult>('/api/enhance-prompt', {
    prompt,
    ...options,
  });
  return response.data;
}

/**
 * Check if the backend is reachable.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await api.get('/api/health', { timeout: 3000 });
    return response.data?.status === 'ok';
  } catch {
    return false;
  }
}

// ── Credit System API ──

export interface CreditBalance {
  total: number;
  subscription: number;
  topup: number;
  plan: string;
  autoBuyEnabled: boolean;
  billingCycleStart: string;
  billingCycleEnd: string;
  totalUsedThisCycle: number;
  planCreditsTotal: number;
}

export interface UsageRow {
  modelUsed: string;
  generationCount: number;
  creditsUsed: number;
}

export interface UsageStats {
  rows: UsageRow[];
  totalGenerations: number;
  totalCreditsUsed: number;
  avgCreditsPerGeneration: number;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: string;
  creditsAmount: number;
  creditSource: string;
  modelUsed?: string;
  modelId?: string;
  presetUsed?: string;
  generationId?: string;
  timestamp: string;
  balanceAfter: number;
}

export async function getCreditBalance(): Promise<CreditBalance> {
  const response = await api.get<CreditBalance>('/api/credits/balance');
  return response.data;
}

export async function getCreditUsage(): Promise<UsageStats> {
  const response = await api.get<UsageStats>('/api/credits/usage');
  return response.data;
}

export async function getCreditActivity(limit = 20, offset = 0): Promise<CreditTransaction[]> {
  const response = await api.get<CreditTransaction[]>('/api/credits/activity', { params: { limit, offset } });
  return response.data;
}

export async function purchaseTopUp(packSize: 'small' | 'medium' | 'large'): Promise<{ success: boolean; creditsAdded: number; newBalance: CreditBalance }> {
  const response = await api.post('/api/credits/topup', { packSize });
  return response.data;
}

export async function changePlan(plan: 'starter' | 'pro' | 'studio' | 'enterprise'): Promise<{ success: boolean; newPlan: string; newBalance: CreditBalance }> {
  const response = await api.post('/api/credits/change-plan', { plan });
  return response.data;
}

export async function setAutoBuy(enabled: boolean): Promise<{ success: boolean; autoBuyEnabled: boolean; newBalance: CreditBalance }> {
  const response = await api.post('/api/credits/auto-buy', { enabled });
  return response.data;
}

/**
 * Upload an image file for motion graphics (logos, etc.).
 * Returns the URL path that Remotion can use to fetch the image.
 */
export async function uploadImage(file: File): Promise<{ fileId: string; filename: string; url: string }> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await api.post<{ fileId: string; filename: string; url: string }>(
    '/api/upload/image',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );

  return response.data;
}

// ── Motion Graphics API ──

export interface MotionGenerateResponse {
  jobId: string;
  templateId: string;
  props: Record<string, unknown>;
  creditsCharged: number;
  balanceRemaining: number;
  autoBought?: boolean;
}

/**
 * Start a motion graphics render.
 * If only `prompt` is provided, the backend uses an LLM to select
 * the best template and fill in props automatically.
 * If `templateId` + `props` are provided, LLM is skipped.
 */
export async function startMotionGeneration(
  prompt: string,
  templateId?: string,
  props?: Record<string, unknown>,
  duration?: number,
): Promise<MotionGenerateResponse> {
  const response = await api.post<MotionGenerateResponse>(
    '/api/motion/generate',
    { prompt, templateId, props, duration },
  );
  return response.data;
}

/**
 * Check the status of a motion graphics render job (polling fallback).
 */
export async function getMotionStatus(jobId: string): Promise<StatusResponse> {
  const response = await api.get<StatusResponse>(
    `/api/motion/status/${jobId}`,
  );
  return response.data;
}

/**
 * Get the download URL for a completed motion graphics render.
 */
export function getMotionDownloadUrl(jobId: string): string {
  return `${API_BASE}/api/motion/download/${jobId}`;
}
