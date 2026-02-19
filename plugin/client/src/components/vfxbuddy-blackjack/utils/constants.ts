export const INITIAL_CHIPS = 500;
export const MIN_BET = 25;
export const MAX_BET = 200;
export const CHIP_DENOMINATIONS = [25, 50, 100, 200] as const;
export const BLACKJACK_PAYOUT = 1.5;
export const DEBOUNCE_MS = 200;

export const COLORS = {
  bg: 'var(--bg-base)',
  bgLight: 'var(--bg-base)',
  bgCard: 'var(--bg-base)',
  primary: 'var(--accent-start)',
  primaryDim: 'var(--accent-surface)',
  primaryGlow: 'var(--accent-glow)',
  secondary: 'var(--text-secondary)',
  secondaryDim: 'var(--glass-2)',
  secondaryGlow: 'var(--accent-glow)',
  felt: 'var(--bg-base)',
  feltLight: 'var(--bg-base)',
  cardFace: 'var(--bg-base)',
  cardBorder: 'transparent',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textDim: 'var(--text-tertiary)',
  red: 'var(--status-error)',
  green: 'var(--status-success)',
};

export const MASCOT_QUIPS = {
  refill: "Don't worry, these aren't real. Here's a fresh stack.",
  generationReady: 'Your VFX is ready!',
} as const;
