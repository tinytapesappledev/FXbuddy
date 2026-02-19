import { create } from 'zustand';
import {
  getCreditBalance,
  getCreditUsage,
  getCreditActivity,
  setAutoBuy as setAutoBuyApi,
  createCheckoutSession,
  createPortalSession,
  CreditBalance,
  UsageStats,
  CreditTransaction,
} from '../services/api';

function openUrl(url: string) {
  try {
    const cepNode = (window as any).cep_node;
    if (cepNode?.require) {
      const { exec } = cepNode.require('child_process');
      const cmd = process.platform === 'win32' ? `start "${url}"` : `open "${url}"`;
      exec(cmd);
      return;
    }
  } catch {}
  window.open(url, '_blank');
}

interface CreditState {
  balance: CreditBalance | null;
  usage: UsageStats | null;
  activity: CreditTransaction[];
  loading: boolean;
  error: string | null;

  fetchBalance: () => Promise<void>;
  fetchUsage: () => Promise<void>;
  fetchActivity: () => Promise<void>;
  fetchAll: () => Promise<void>;
  buyTopUp: (packSize: 'small' | 'medium' | 'large') => Promise<boolean>;
  switchPlan: (plan: 'starter' | 'pro' | 'studio' | 'enterprise') => Promise<boolean>;
  manageSubscription: () => Promise<void>;
  toggleAutoBuy: (enabled: boolean) => Promise<boolean>;
  deductLocally: (amount: number) => void;
}

export const useCreditStore = create<CreditState>((set, get) => ({
  balance: null,
  usage: null,
  activity: [],
  loading: false,
  error: null,

  fetchBalance: async () => {
    try {
      const balance = await getCreditBalance();
      set({ balance, error: null });
    } catch (err: any) {
      console.error('[CreditStore] Failed to fetch balance:', err);
    }
  },

  fetchUsage: async () => {
    try {
      const usage = await getCreditUsage();
      set({ usage });
    } catch (err: any) {
      console.error('[CreditStore] Failed to fetch usage:', err);
    }
  },

  fetchActivity: async () => {
    try {
      const activity = await getCreditActivity();
      set({ activity });
    } catch (err: any) {
      console.error('[CreditStore] Failed to fetch activity:', err);
    }
  },

  fetchAll: async () => {
    set({ loading: true });
    await Promise.all([
      get().fetchBalance(),
      get().fetchUsage(),
      get().fetchActivity(),
    ]);
    set({ loading: false });
  },

  buyTopUp: async (packSize) => {
    try {
      set({ loading: true });
      const url = await createCheckoutSession('topup', undefined, packSize);
      openUrl(url);
      set({ loading: false });
      return true;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      return false;
    }
  },

  switchPlan: async (plan) => {
    try {
      set({ loading: true });
      const url = await createCheckoutSession('subscription', plan);
      openUrl(url);
      set({ loading: false });
      return true;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      return false;
    }
  },

  manageSubscription: async () => {
    try {
      const url = await createPortalSession();
      openUrl(url);
    } catch (err: any) {
      console.error('[CreditStore] Failed to open portal:', err);
    }
  },

  toggleAutoBuy: async (enabled) => {
    try {
      set({ loading: true });
      const result = await setAutoBuyApi(enabled);
      if (result.success) {
        set({ balance: result.newBalance });
      }
      set({ loading: false });
      return result.success;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      return false;
    }
  },

  deductLocally: (amount) => {
    const { balance } = get();
    if (!balance) return;

    let remaining = amount;
    let newSub = balance.subscription;
    let newTopup = balance.topup;

    if (newSub >= remaining) {
      newSub -= remaining;
      remaining = 0;
    } else {
      remaining -= newSub;
      newSub = 0;
      newTopup -= remaining;
      remaining = 0;
    }

    set({
      balance: {
        ...balance,
        total: newSub + newTopup,
        subscription: newSub,
        topup: newTopup,
        totalUsedThisCycle: balance.totalUsedThisCycle + amount,
      },
    });
  },
}));
