import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { GlassCard } from '../shared/GlassCard';
import { GlassToggle } from '../shared/GlassToggle';
import { GlassPill } from '../shared/GlassPill';
import { AccentButton } from '../shared/AccentButton';
import { ProgressBar } from '../shared/ProgressBar';

interface SettingsDrawerProps {
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ onClose }) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 w-full z-50 animate-slide-in-right">
        <div className="h-full flex flex-col bg-glass-2 backdrop-blur-glass-lg border-l border-border-glass-hover"
          style={{ background: 'linear-gradient(165deg, rgba(8,8,12,0.97) 0%, rgba(15,15,26,0.97) 50%, rgba(10,10,20,0.97) 100%)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between h-11 px-3 border-b border-border-glass flex-shrink-0">
            <h2 className="text-subhead font-semibold text-text-primary">Settings</h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-glass-1 border border-border-glass text-text-secondary hover:text-text-primary hover:bg-glass-2 transition-all duration-200 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 no-scrollbar">
            {/* Account Section */}
            <GlassCard elevated>
              <h3 className="text-caption font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                Account
              </h3>
              <div className="flex items-center justify-between mb-1">
                <span className="text-body text-text-primary">jakob@tinytapes.com</span>
              </div>
              <GlassPill variant="accent" size="xs">Pro Plan</GlassPill>
            </GlassCard>

            {/* Subscription Section */}
            <GlassCard elevated>
              <h3 className="text-caption font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                Subscription
              </h3>
              <div className="flex items-center justify-between mb-1">
                <span className="text-caption text-text-secondary">Credits Used</span>
                <span className="text-caption text-text-primary font-medium">358 / 500</span>
              </div>
              <ProgressBar progress={71.6} showGlow={false} className="mb-3" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-caption text-text-secondary">Renews</span>
                <span className="text-caption text-text-primary">Mar 14, 2026</span>
              </div>
              <AccentButton fullWidth>
                <span className="flex items-center gap-1.5">
                  Upgrade Plan
                  <ExternalLink size={12} />
                </span>
              </AccentButton>
            </GlassCard>

            {/* Preferences Section */}
            <GlassCard elevated>
              <h3 className="text-caption font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                Preferences
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-body text-text-primary">Auto-enhance prompts</span>
                  <GlassToggle checked={true} onChange={() => {}} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body text-text-primary">Sound on completion</span>
                  <GlassToggle checked={false} onChange={() => {}} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body text-text-primary">Default model</span>
                  <GlassPill size="xs">Gen-4 Turbo</GlassPill>
                </div>
              </div>
            </GlassCard>

            {/* About Section */}
            <GlassCard elevated>
              <h3 className="text-caption font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                About
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-text-secondary">Version</span>
                  <span className="text-caption text-text-tertiary">1.0.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-caption text-text-secondary">Support</span>
                  <span className="text-caption text-text-accent">help@instantfx.com</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </>
  );
};
