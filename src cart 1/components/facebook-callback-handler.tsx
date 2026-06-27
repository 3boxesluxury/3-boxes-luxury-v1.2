'use client';

import { useEffect } from 'react';

// ============================================================
// Facebook Callback Handler Component
// ============================================================
// Add this component to your page.tsx or layout.tsx to handle
// Facebook OAuth callback redirects.
//
// It catches the token/user params from the URL that the
// Facebook callback route sets after successful auth,
// stores them in the app's auth system, and cleans the URL.
//
// USAGE:
//   import { FacebookCallbackHandler } from '@/components/facebook-callback-handler';
//   // Add inside your app component:
//   <FacebookCallbackHandler />
// ============================================================

interface FacebookCallbackHandlerProps {
  onAuthSuccess?: (user: {
    id?: string;
    name: string;
    email: string;
    role: string;
    token: string;
    authProvider: string;
    isNewUser?: boolean;
  }) => void;
  onAuthError?: (error: string, reason?: string) => void;
}

export function FacebookCallbackHandler({
  onAuthSuccess,
  onAuthError,
}: FacebookCallbackHandlerProps = {}) {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const userId = params.get('userId');
      const userName = params.get('userName');
      const userEmail = params.get('userEmail');
      const userRole = params.get('userRole');
      const authProvider = params.get('authProvider');
      const authError = params.get('auth');
      const isNewUser = params.get('isNewUser');
      const reason = params.get('reason');

      // Handle successful Facebook/GitHub/Google login
      if (token && authProvider) {
        const user = {
          id: userId || '',
          name: userName || 'User',
          email: userEmail || '',
          role: userRole || 'user',
          token,
          authProvider,
          isNewUser: isNewUser === 'true',
        };

        // Store token in localStorage for API calls
        localStorage.setItem('auth-token', token);
        localStorage.setItem('auth-provider', authProvider);

        if (userId) localStorage.setItem('user-id', userId);
        if (userName) localStorage.setItem('user-name', userName);
        if (userEmail) localStorage.setItem('user-email', userEmail);
        if (userRole) localStorage.setItem('user-role', userRole);

        // Try to use the app's Zustand store if available
        try {
          // Dynamic import to avoid hard dependency
          const storeModule = require('@/lib/store');
          if (storeModule.useStore) {
            const state = storeModule.useStore.getState();
            if (state.setAuth) {
              state.setAuth(
                {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                },
                token
              );
            }
          }
        } catch (storeErr) {
          // Store not available, localStorage is already set
          console.log('[FB Callback] Zustand store not available, using localStorage');
        }

        // Call custom success handler
        if (onAuthSuccess) {
          onAuthSuccess(user);
        }

        console.log(`[FB Callback] ${isNewUser === 'true' ? 'New user created' : 'User logged in'}: ${user.name}`);

        // Clean up URL - remove all auth params
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('token');
        cleanUrl.searchParams.delete('userId');
        cleanUrl.searchParams.delete('userName');
        cleanUrl.searchParams.delete('userEmail');
        cleanUrl.searchParams.delete('userRole');
        cleanUrl.searchParams.delete('authProvider');
        cleanUrl.searchParams.delete('isNewUser');
        cleanUrl.searchParams.delete('auth');
        cleanUrl.searchParams.delete('reason');
        cleanUrl.searchParams.delete('msg');
        window.history.replaceState({}, '', cleanUrl.toString());

        // Show a welcome toast if the function exists
        try {
          const toastModule = require('@/hooks/use-toast-notification');
          if (toastModule.showToast) {
            toastModule.showToast(
              'success',
              isNewUser === 'true'
                ? `Welcome to 3 Boxes Luxury, ${user.name}!`
                : `Welcome back, ${user.name}!`
            );
          }
        } catch {
          // Toast not available
        }
      } else if (authError) {
        // Handle auth errors
        const reason = params.get('reason');
        const messages: Record<string, string> = {
          denied: 'Facebook login was cancelled.',
          error: reason ? `Login failed: ${reason}` : 'Facebook login failed. Please try again.',
          deactivated: 'Your account has been deactivated.',
          pending: 'Your account is pending admin approval.',
          rejected: 'Your account has been rejected.',
        };
        const errorMsg = messages[authError] || 'Authentication failed.';

        if (onAuthError) {
          onAuthError(authError, reason || undefined);
        }

        console.warn('[FB Callback]', errorMsg);

        // Show error toast
        try {
          const toastModule = require('@/hooks/use-toast-notification');
          if (toastModule.showToast) {
            toastModule.showToast('error', errorMsg);
          }
        } catch {
          // Toast not available
        }

        // Clean up URL
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('auth');
        cleanUrl.searchParams.delete('reason');
        cleanUrl.searchParams.delete('msg');
        window.history.replaceState({}, '', cleanUrl.toString());
      }
    } catch (err) {
      console.error('[FB Callback] Error:', err);
    }
  }, [onAuthSuccess, onAuthError]);

  // This component doesn't render anything
  return null;
}
