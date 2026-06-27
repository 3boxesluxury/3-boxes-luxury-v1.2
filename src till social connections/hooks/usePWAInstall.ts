'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Global singleton to capture the beforeinstallprompt event BEFORE React mounts.
// This prevents the race condition where the event fires before the component
// registers its listener.
let _globalDeferredPrompt: BeforeInstallPromptEvent | null = null
let _globalCanInstall = false

if (typeof window !== 'undefined') {
  // Capture the event ASAP — even before React hydrates
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    _globalDeferredPrompt = e as BeforeInstallPromptEvent
    _globalCanInstall = true
    console.log('[PWA] beforeinstallprompt captured globally')
  })
}

/**
 * Hook to handle PWA install prompt on Android/Chrome.
 *
 * Captures the `beforeinstallprompt` event and provides a `promptInstall`
 * function that triggers the native install dialog.
 *
 * Uses a global singleton to capture the event before React mounts,
 * preventing the race condition where the event fires during page load
 * but before the component registers its listener.
 *
 * Returns:
 * - canInstall: Whether the app can be installed (PWA criteria met)
 * - promptInstall: Function to trigger the install dialog
 * - isInstalled: Whether the app is already installed
 */
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(_globalCanInstall);
  const [isInstalled, setIsInstalled] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(_globalDeferredPrompt);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Sync with global state in case it was captured before mount
    if (_globalDeferredPrompt && !deferredPromptRef.current) {
      deferredPromptRef.current = _globalDeferredPrompt;
      setCanInstall(true);
    }

    // Listen for the beforeinstallprompt event (may fire again on navigation)
    const handler = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      _globalDeferredPrompt = prompt
      deferredPromptRef.current = prompt;
      _globalCanInstall = true
      setCanInstall(true);
      console.log('[PWA] beforeinstallprompt captured in hook, canInstall=true');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    const installedHandler = () => {
      _globalCanInstall = false
      _globalDeferredPrompt = null
      setIsInstalled(true);
      setCanInstall(false);
      deferredPromptRef.current = null;
      console.log('[PWA] App installed successfully');
    };

    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const deferredPrompt = deferredPromptRef.current || _globalDeferredPrompt;
    if (!deferredPrompt) {
      console.log('[PWA] No deferred prompt available');
      return false;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      console.log(`[PWA] User response to install prompt: ${outcome}`);

      // Clear the deferred prompt — it can only be used once
      _globalDeferredPrompt = null;
      deferredPromptRef.current = null;
      _globalCanInstall = false;
      setCanInstall(false);

      return outcome === 'accepted';
    } catch (err) {
      console.error('[PWA] Error showing install prompt:', err);
      return false;
    }
  }, []);

  return { canInstall, promptInstall, isInstalled };
}
