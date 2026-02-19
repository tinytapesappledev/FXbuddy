import React from 'react';
import { X, AlertTriangle, ShoppingCart, Zap } from 'lucide-react';
import { CreditIcon } from './CreditIcon';

interface InsufficientCreditsModalProps {
  creditsNeeded: number;
  creditsAvailable: number;
  onBuyCredits: () => void;
  onUpgrade: () => void;
  onClose: () => void;
}

export const InsufficientCreditsModal: React.FC<InsufficientCreditsModalProps> = ({
  creditsNeeded,
  creditsAvailable,
  onBuyCredits,
  onUpgrade,
  onClose,
}) => {
  const shortfall = creditsNeeded - creditsAvailable;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative bg-base rounded-neu shadow-neu-flat p-5 mx-4 max-w-sm w-full z-10">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full text-neu-text-light hover:text-neu-text hover:bg-glass-2 transition-all"
        >
          <X size={14} />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} className="text-amber-500" />
          <h3 className="font-syne font-bold text-base text-neu-text">Not enough credits</h3>
        </div>

        <p className="text-xs text-neu-text-light mb-4">
          This generation costs{' '}
          <span className="font-semibold text-neu-text inline-flex items-center gap-0.5">{creditsNeeded} <CreditIcon size={9} /></span>.
          You need{' '}
          <span className="font-semibold text-neu-text inline-flex items-center gap-0.5">{shortfall} <CreditIcon size={9} /></span>{' '}
          more to continue.
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => { onBuyCredits(); onClose(); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-base text-neu-accent font-semibold text-xs shadow-neu-button hover:shadow-neu-button-active transition-all active:scale-[0.98]"
          >
            <ShoppingCart size={13} />
            Buy Credits
          </button>
          <button
            onClick={() => { onUpgrade(); onClose(); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-neu-accent text-base font-semibold text-xs shadow-glow hover:brightness-110 transition-all active:scale-[0.98]"
          >
            <Zap size={13} />
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
};
