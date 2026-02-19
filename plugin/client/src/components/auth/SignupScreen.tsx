import React, { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { GlassInput } from '../shared/GlassInput';
import { AccentButton } from '../shared/AccentButton';

interface SignupScreenProps {
  onSignup: () => void;
  onSwitchToLogin: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ onSignup, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <div className="relative flex items-center justify-center h-full w-full overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-48 h-48 rounded-full opacity-30 animate-orb-float-1"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)',
            top: '5%',
            right: '10%',
          }}
        />
        <div
          className="absolute w-56 h-56 rounded-full opacity-20 animate-orb-float-2"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)',
            bottom: '20%',
            left: '5%',
          }}
        />
        <div
          className="absolute w-36 h-36 rounded-full opacity-25 animate-orb-float-3"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
            top: '40%',
            left: '50%',
          }}
        />
      </div>

      {/* Signup Card */}
      <GlassCard elevated className="w-full max-w-[300px] mx-4 z-10" padding="lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-heading font-semibold gradient-text mb-1">
            InstantFX
          </h1>
          <p className="text-caption text-text-tertiary">
            Create your account
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
          <GlassInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm password"
            type="password"
          />

          <AccentButton onClick={onSignup} fullWidth>
            Create Account
          </AccentButton>
        </div>

        {/* Switch to login */}
        <div className="mt-4 text-center">
          <button
            onClick={onSwitchToLogin}
            className="text-caption text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            Already have an account?{' '}
            <span className="text-text-accent">Sign in</span>
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
