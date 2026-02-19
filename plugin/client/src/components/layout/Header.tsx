import React from 'react';
import { Settings } from 'lucide-react';

interface HeaderProps {
  creditsRemaining: number;
  creditsTotal: number;
  onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  creditsRemaining,
  creditsTotal,
  onSettingsClick,
}) => {
  const creditPercent = creditsTotal > 0 ? (creditsRemaining / creditsTotal) * 100 : 0;
  const dotColor = creditPercent > 30
    ? 'bg-status-success'
    : creditPercent > 10
      ? 'bg-status-warning'
      : 'bg-status-error';

  return (
    <header className="flex items-center justify-between h-11 px-3 bg-glass-2 backdrop-blur-glass-lg border-b border-border-glass flex-shrink-0">
      {/* Logo */}
      <h1 className="text-[15px] font-semibold tracking-wide gradient-text select-none">
        InstantFX
      </h1>

      <div className="flex items-center gap-2">
        {/* Credit Pill */}
        <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-pill bg-glass-1 border border-border-glass">
          <span className="text-caption font-semibold text-text-accent">
            {creditsRemaining}
          </span>
          <span className="text-[10px] text-text-tertiary">/</span>
          <span className="text-[10px] text-text-tertiary">
            {creditsTotal}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ml-0.5`} />
        </div>

        {/* Settings Icon */}
        <button
          onClick={onSettingsClick}
          className="flex items-center justify-center w-8 h-8 rounded-glass-sm text-text-secondary hover:text-text-primary hover:bg-glass-1 transition-all duration-200 cursor-pointer"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
