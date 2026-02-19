import React, { useEffect, useState } from 'react';
import { VFXBuddyPanel } from './components/vfxbuddy/VFXBuddyPanel';
import { VFXBuddyBlackjack } from './components/vfxbuddy-blackjack/VFXBuddyBlackjack';
import { AuthScreen } from './components/vfxbuddy/AuthScreen';
import { initAdobe } from './services/adobe';
import { initSocket } from './services/socket';
import { isAuthenticated, getMe, AuthUser, clearAuthTokens } from './services/api';
import './styles/tailwind.css';
import './styles/globals.css';
import './styles/animations.css';

const isLocalDev = !((window as any).__FXBUDDY_API_BASE__) &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:');

const BlackjackPreview: React.FC = () => {
  return (
    <div className="h-full w-full bg-base flex items-center justify-center">
      <div style={{ width: 380, height: '100vh' }}>
        <VFXBuddyBlackjack
          isVisible={true}
          renderTimeRemaining={85}
          generationComplete={false}
          onExit={() => {}}
        />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const isPreview = typeof window !== 'undefined' && window.location.search.includes('blackjack');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (isPreview) { setAuthChecked(true); return; }
    initAdobe();
    initSocket();

    // In local dev mode, skip auth (backend uses default-user)
    if (isLocalDev) {
      setUser({ id: 'default-user', email: 'user@fxbuddy.app', plan: 'pro' });
      setAuthChecked(true);
      return;
    }

    // Check for existing auth token
    if (isAuthenticated()) {
      getMe()
        .then((u) => setUser(u))
        .catch(() => clearAuthTokens())
        .finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }

    // Listen for auth expiration (from axios interceptor)
    const handleExpired = () => { setUser(null); };
    window.addEventListener('fxbuddy-auth-expired', handleExpired);
    return () => window.removeEventListener('fxbuddy-auth-expired', handleExpired);
  }, [isPreview]);

  if (isPreview) return <BlackjackPreview />;

  if (!authChecked) {
    return (
      <div className="h-full w-full bg-base flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neu-accent/30 border-t-neu-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isLocalDev) {
    return <AuthScreen onAuth={(u) => setUser(u)} />;
  }

  return (
    <div className="h-full w-full bg-base">
      <VFXBuddyPanel />
    </div>
  );
};

export default App;
