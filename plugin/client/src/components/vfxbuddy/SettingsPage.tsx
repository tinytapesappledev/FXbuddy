import React, { useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Zap, Clock, TrendingUp, Star, Users, AlertCircle, LogOut, ExternalLink } from 'lucide-react';
import { useCreditStore } from '../../stores/useCreditStore';
import { logout } from '../../services/api';
import { CreditIcon } from './CreditIcon';

interface SettingsPageProps {
  onClose: () => void;
  userEmail?: string;
}

type PlanId = 'starter' | 'pro' | 'studio' | 'enterprise';

interface PlanDef {
  id: PlanId;
  label: string;
  price: number;
  credits: number;
  features: string[];
  recommended?: boolean;
  scarcity?: string;
}

const PLANS: PlanDef[] = [
  {
    id: 'starter',
    label: 'Starter',
    price: 59,
    credits: 250,
    features: [],
  },
  {
    id: 'pro',
    label: 'Pro',
    price: 99,
    credits: 750,
    recommended: true,
    features: [
      'Music Video Prompt Bible (100+ tested prompts)',
      'AI Compositing Masterclass (video course)',
      'Exclusive FXbuddy Pro Discord community',
    ],
  },
  {
    id: 'studio',
    label: 'Studio',
    price: 249,
    credits: 2000,
    scarcity: 'Only 10 new members/month — 4 spots left',
    features: [
      'Music Video Prompt Bible (100+ tested prompts)',
      'AI Compositing Masterclass (video course)',
      'Exclusive FXbuddy Pro Discord community',
      '1-on-1 Workflow Setup with Jakob',
      'The Inner Circle — private groupchat with top industry editors',
    ],
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: 999,
    credits: 8000,
    scarcity: 'Only 10 new members/month — 4 spots left',
    features: [
      'Music Video Prompt Bible (100+ tested prompts)',
      'AI Compositing Masterclass (video course)',
      'Exclusive FXbuddy Pro Discord community',
      '1-on-1 Workflow Setup with Jakob',
      'The Inner Circle — private groupchat with top industry editors',
    ],
  },
];

const TOPUP_PACKS = [
  { id: 'small' as const, credits: 50, price: 12 },
  { id: 'medium' as const, credits: 150, price: 30 },
  { id: 'large' as const, credits: 300, price: 50 },
];

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return days === 1 ? 'Yesterday' : `${days} days ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function txLabel(tx: { type: string; modelUsed?: string; presetUsed?: string }): string {
  if (tx.type === 'subscription_refresh') return 'Monthly credit refresh';
  if (tx.type === 'topup_purchase') return 'Extra credits purchased';
  if (tx.type === 'auto_buy') return 'Auto-buy credits';
  if (tx.type === 'refund') return 'Failed gen — refunded';
  const preset = tx.presetUsed ? ` (${tx.presetUsed})` : '';
  return `Generation${preset}`;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onClose, userEmail }) => {
  const { balance, usage, activity, loading, fetchAll, buyTopUp, switchPlan, manageSubscription, toggleAutoBuy } = useCreditStore();

  useEffect(() => {
    fetchAll();
  }, []);

  const currentPlan = balance?.plan || 'free';
  const currentPlanDef = PLANS.find(p => p.id === currentPlan);

  const subUsed = balance ? balance.planCreditsTotal - balance.subscription : 0;
  const subProgress = balance && balance.planCreditsTotal > 0
    ? (subUsed / balance.planCreditsTotal) * 100
    : 0;

  return (
    <div className="h-full bg-base text-neu-text font-sans flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-glass-2 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-neu-text-light hover:text-neu-text transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <h2 className="font-syne font-bold text-sm">Credits & Plan</h2>
        <div className="w-12" />
      </div>

      {/* User Info */}
      {(userEmail || currentPlan !== 'free') && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-glass-1">
          <div className="flex flex-col">
            {userEmail && <span className="text-[11px] text-neu-text truncate max-w-[180px]">{userEmail}</span>}
            <span className="text-[10px] text-neu-text-light capitalize">{currentPlan} plan</span>
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">

        {/* Section 1: Credit Balance */}
        <div className="bg-base rounded-neu shadow-neu-flat p-5">
          <div className="text-center mb-4">
            <div className="font-sans font-black text-[42px] leading-none text-neu-accent tracking-tight">
              {balance?.total ?? '—'}
            </div>
            <div className="text-xs text-neu-text-light mt-1">credits remaining</div>
          </div>

          <div className="flex gap-2 mb-4">
            <div className="flex-1 bg-base rounded-glass-sm shadow-neu-pressed px-3 py-2.5 text-center">
              <div className="text-sm font-bold text-neu-text tabular-nums">{balance?.subscription ?? 0}</div>
              <div className="text-[10px] text-neu-text-light">Plan</div>
              <div className="text-[9px] text-neu-text-light/60 mt-0.5">
                resets {balance ? formatDate(balance.billingCycleEnd) : '—'}
              </div>
            </div>
            <div className="flex-1 bg-base rounded-glass-sm shadow-neu-pressed px-3 py-2.5 text-center">
              <div className="text-sm font-bold text-neu-text tabular-nums">{balance?.topup ?? 0}</div>
              <div className="text-[10px] text-neu-text-light">Extra</div>
              <div className="text-[9px] text-neu-text-light/60 mt-0.5">never expire</div>
            </div>
          </div>

          {balance && balance.planCreditsTotal > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-[10px] text-neu-text-light mb-1">
                <span>Monthly usage</span>
                <span className="tabular-nums">{subUsed} / {balance.planCreditsTotal}</span>
              </div>
              <div className="w-full h-2 bg-base rounded-full shadow-neu-pressed overflow-hidden">
                <div
                  className="h-full rounded-full bg-neu-accent transition-all duration-500"
                  style={{ width: `${Math.min(100, subProgress)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                const section = document.getElementById('topup-packs');
                section?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-base text-neu-text font-semibold text-xs shadow-neu-button hover:shadow-neu-button-active transition-all active:scale-[0.98]"
            >
              <ShoppingCart size={13} />
              Buy Credits
            </button>
            <button
              onClick={() => {
                const section = document.getElementById('plan-billing');
                section?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-neu-accent text-base font-semibold text-xs shadow-glow hover:brightness-110 transition-all active:scale-[0.98]"
            >
              <Zap size={13} />
              {currentPlanDef ? 'Change Plan' : 'Get a Plan'}
            </button>
          </div>
        </div>

        {/* Section 2: Usage This Month */}
        <div className="bg-base rounded-neu shadow-neu-flat p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-neu-text-light" />
            <h3 className="font-syne font-semibold text-xs uppercase tracking-wider text-neu-text-light">
              Usage This Month
            </h3>
          </div>

          {usage && usage.totalGenerations > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between bg-base rounded-glass-sm shadow-neu-pressed px-3 py-2.5">
                <span className="text-xs font-medium text-neu-text">Credits Used</span>
                <span className="text-sm font-bold tabular-nums text-neu-text">{usage.totalCreditsUsed}</span>
              </div>
              <div className="flex items-center justify-between bg-base rounded-glass-sm shadow-neu-pressed px-3 py-2.5">
                <span className="text-xs font-medium text-neu-text">Generations</span>
                <span className="text-sm font-bold tabular-nums text-neu-text">{usage.totalGenerations}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-neu-text-light">
              No generations this cycle yet
            </div>
          )}
        </div>

        {/* Section 3: Recent Activity */}
        <div className="bg-base rounded-neu shadow-neu-flat p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-neu-text-light" />
            <h3 className="font-syne font-semibold text-xs uppercase tracking-wider text-neu-text-light">
              Recent Activity
            </h3>
          </div>

          {activity.length > 0 ? (
            <div className="space-y-1">
              {activity.slice(0, 20).map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-1.5 px-1 border-b border-glass-1 last:border-b-0">
                  <div className="flex flex-col">
                    <span className="text-xs text-neu-text">{txLabel(tx)}</span>
                    <span className="text-[9px] text-neu-text-light">{relativeTime(tx.timestamp)}</span>
                  </div>
                  <span className={`text-xs font-bold tabular-nums flex items-center gap-0.5 ${
                    tx.creditsAmount > 0 ? 'text-emerald-500' : 'text-neu-text'
                  }`}>
                    {tx.creditsAmount > 0 ? '+' : ''}{tx.creditsAmount} <CreditIcon size={9} className="opacity-60" />
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-neu-text-light">
              No activity yet
            </div>
          )}
        </div>

        {/* Section 4: Plans */}
        <div id="plan-billing" className="bg-base rounded-neu shadow-neu-flat p-4">
          <h3 className="font-syne font-semibold text-xs uppercase tracking-wider text-neu-text-light mb-3">
            Plans
          </h3>

          <div className="space-y-3">
            {PLANS.map(plan => {
              const isCurrent = currentPlan === plan.id;
              const isUpgrade = !isCurrent && PLANS.findIndex(p => p.id === plan.id) > PLANS.findIndex(p => p.id === currentPlan);

              return (
                <div
                  key={plan.id}
                  className={`bg-base rounded-glass-sm p-4 transition-all ${
                    isCurrent ? 'shadow-neu-pressed ring-1 ring-neu-accent/20' : 'shadow-neu-button'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-syne font-bold text-sm text-neu-text uppercase">{plan.label}</span>
                      {plan.recommended && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-neu-accent/10 text-neu-accent text-[9px] font-semibold">
                          <Star size={8} /> Recommended
                        </span>
                      )}
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-semibold">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-syne font-bold text-sm text-neu-text">${plan.price}</div>
                      <div className="text-[9px] text-neu-text-light">/month</div>
                    </div>
                  </div>

                  <div className="text-xs text-neu-text font-medium mb-2">
                    {plan.credits.toLocaleString()} credits/month
                  </div>

                  {plan.features.length > 0 && (
                    <ul className="space-y-1 mb-3">
                      {plan.features.map((f, i) => (
                        <li key={i} className="text-[10px] text-neu-text-light flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-neu-accent/40 mt-1 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  {plan.scarcity && (
                    <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-glass-sm bg-red-50">
                      <AlertCircle size={10} className="text-red-500 flex-shrink-0" />
                      <span className="text-[10px] text-red-600 font-medium">{plan.scarcity}</span>
                    </div>
                  )}

                  {!isCurrent && (
                    <button
                      onClick={() => switchPlan(plan.id)}
                      disabled={loading}
                      className={`w-full py-2 rounded-full font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50 ${
                        isUpgrade
                          ? 'bg-neu-accent text-base shadow-glow hover:brightness-110'
                          : 'bg-base text-neu-text shadow-neu-button hover:shadow-neu-button-active'
                      }`}
                    >
                      {isUpgrade ? `Upgrade to ${plan.label}` : `Switch to ${plan.label}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 5: Extra Credits */}
        <div id="topup-packs" className="bg-base rounded-neu shadow-neu-flat p-4">
          <h3 className="font-syne font-semibold text-xs uppercase tracking-wider text-neu-text-light mb-3">
            Extra Credits
          </h3>

          {/* Auto-buy toggle */}
          <div className="flex items-center justify-between bg-base rounded-glass-sm shadow-neu-pressed px-3 py-3 mb-4">
            <div className="flex-1 mr-3">
              <div className="text-xs font-medium text-neu-text">Auto-buy</div>
              <div className="text-[10px] text-neu-text-light">Automatically buy extra credits when you run out</div>
            </div>
            <button
              onClick={() => toggleAutoBuy(!balance?.autoBuyEnabled)}
              disabled={loading}
              className={`relative w-10 h-5.5 rounded-full transition-all duration-200 flex-shrink-0 ${
                balance?.autoBuyEnabled
                  ? 'bg-neu-accent'
                  : 'bg-glass-3'
              }`}
              style={{ minWidth: 40, height: 22 }}
            >
              <span
                className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                  balance?.autoBuyEnabled ? 'left-[20px]' : 'left-0.5'
                }`}
                style={{ width: 18, height: 18 }}
              />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            {TOPUP_PACKS.map(pack => (
              <div key={pack.id} className="bg-base rounded-glass-sm shadow-neu-button p-3 text-center flex flex-col items-center gap-1.5">
                <div className="font-syne font-bold text-sm text-neu-text tabular-nums">{pack.credits}</div>
                <div className="text-[10px] text-neu-text-light">credits</div>
                <div className="text-xs font-semibold text-neu-text">${pack.price}</div>
                <button
                  onClick={() => buyTopUp(pack.id)}
                  disabled={loading}
                  className="w-full py-1.5 rounded-full bg-base text-neu-accent font-semibold text-[10px] shadow-neu-button hover:shadow-neu-button-active transition-all active:scale-[0.98] disabled:opacity-50 mt-1"
                >
                  Buy
                </button>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-neu-text-light text-center">
            Extra credits never expire
          </p>
        </div>

        {/* Manage Subscription */}
        {currentPlan !== 'free' && (
          <button
            onClick={() => manageSubscription()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-base text-neu-text text-xs font-semibold shadow-neu-button hover:shadow-neu-button-active transition-all active:scale-[0.98]"
          >
            <ExternalLink size={13} />
            Manage Subscription
          </button>
        )}

        {/* Log Out */}
        <button
          onClick={async () => {
            await logout();
            window.dispatchEvent(new CustomEvent('fxbuddy-auth-expired'));
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-base text-neu-text-light text-xs font-medium shadow-neu-button hover:shadow-neu-button-active hover:text-status-error transition-all active:scale-[0.98]"
        >
          <LogOut size={13} />
          Log Out
        </button>

        <div className="h-4" />
      </div>
    </div>
  );
};
