import React, { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { GlassInput } from '../shared/GlassInput';
import { AccentButton } from '../shared/AccentButton';

interface LoginScreenProps {
  onLogin: () => void;
  onSwitchToSignup: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="relative flex items-center justify-center h-full w-full overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-48 h-48 rounded-full opacity-30 animate-orb-float-1"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)',
            top: '10%',
            left: '10%',
          }}
        />
        <div
          className="absolute w-64 h-64 rounded-full opacity-20 animate-orb-float-2"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)',
            top: '50%',
            right: '5%',
          }}
        />
        <div
          className="absolute w-40 h-40 rounded-full opacity-25 animate-orb-float-3"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
            bottom: '15%',
            left: '30%',
          }}
        />
      </div>

      {/* Login Card */}
      <GlassCard elevated className="w-full max-w-[300px] mx-4 z-10" padding="lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-heading font-semibold gradient-text mb-1">
            InstantFX
          </h1>
          <p className="text-caption text-text-tertiary">
            AI-Powered VFX for Adobe
          </p>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <GlassInput
            value={email}
            onChange={setEmail}
            placeholder="Email address"
            type="email"
          />
          <GlassInput
            value={password}
            onChange={setPassword}
            placeholder="Password"
            type="password"
          />

          <AccentButton onClick={onLogin} fullWidth>
            Sign In
          </AccentButton>
        </div>

        {/* Switch to signup */}
        <div className="mt-4 text-center">
          <button
            onClick={onSwitchToSignup}
            className="text-caption text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            Don't have an account?{' '}
            <span className="text-text-accent">Create one</span>
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
