'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { showToast } from '@/hooks/use-toast-notification';

// ============================================================
// OAuth Callback Handler Component
// ============================================================
// Handles OAuth callback redirects from Google and Facebook.
// Catches the token/user params from the URL that the
// callback routes set after successful auth,
// stores them in the app's auth system, and cleans the URL.
//
// USAGE:
//   import { OAuthCallbackHandler } from '@/components/oauth-callback-handler';
//   // Add inside your app component:
//   <OAuthCallbackHandler />
// ============================================================

interface OAuthCallbackHandlerProps {
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

export function OAuthCallbackHandler({
  onAuthSuccess,
  onAuthError,
}: OAuthCallbackHandlerProps = {}) {
  const setAuth = useStore((s) => s.setAuth);
  const setView = useStore((s) => s.setView);

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
      const returnTo = params.get('returnTo');

      // Handle successful Google/Facebook login
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

        // Also save social connection info for the Social Style Integration page
        // This ensures the "Connected" badge shows up after OAuth redirect
        if (authProvider === 'google' || authProvider === 'facebook') {
          try {
            const socialKey = '3boxes-social-connections';
            const existing = localStorage.getItem(socialKey);
            const existingConns: any[] = existing ? JSON.parse(existing) : [];
            // Remove old entry for same network if exists
            const filtered = existingConns.filter((c: any) => c.network !== authProvider);
            filtered.push({
              network: authProvider,
              connected: true,
              profile: {
                name: userName || 'User',
                email: userEmail || '',
              },
            });
            localStorage.setItem(socialKey, JSON.stringify(filtered));
          } catch (socialErr) {
            console.log('[OAuth Callback] Failed to save social connection:', socialErr);
          }
        }

        // Use the app's Zustand store
        try {
          setAuth(
            {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            },
            token
          );
        } catch (storeErr) {
          console.log('[OAuth Callback] Zustand store update failed, using localStorage only');
        }

        // Call custom success handler
        if (onAuthSuccess) {
          onAuthSuccess(user);
        }

        const providerLabel = authProvider === 'google' ? 'Google' : authProvider === 'facebook' ? 'Facebook' : authProvider;
        console.log(`[OAuth Callback] ${isNewUser === 'true' ? 'New user created' : 'User logged in'} via ${providerLabel}: ${user.name}`);

        // Show welcome toast
        showToast(
          'success',
          isNewUser === 'true'
            ? `Welcome to 3 Boxes Luxury, ${user.name}!`
            : `Welcome back, ${user.name}!`
        );

        // Navigate back to the page that initiated the OAuth flow
        if (returnTo) {
          try {
            setView(returnTo as any);
            console.log('[OAuth Callback] Navigating back to:', returnTo);
          } catch (navErr) {
            console.log('[OAuth Callback] Failed to navigate to:', returnTo, navErr);
          }
        }

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
        cleanUrl.searchParams.delete('state');
        cleanUrl.searchParams.delete('code');
        cleanUrl.searchParams.delete('scope');
        cleanUrl.searchParams.delete('authuser');
        cleanUrl.searchParams.delete('prompt');
        cleanUrl.searchParams.delete('returnTo');
        window.history.replaceState({}, '', cleanUrl.toString());
      } else if (authError) {
        // Handle auth errors
        const reasonParam = params.get('reason');
        const messages: Record<string, string> = {
          denied: 'Login was cancelled.',
          error: reasonParam ? `Login failed: ${reasonParam}` : 'Login failed. Please try again.',
          deactivated: 'Your account has been deactivated.',
          pending: 'Your account is pending admin approval.',
          rejected: 'Your account has been rejected.',
        };
        const errorMsg = messages[authError] || 'Authentication failed.';

        if (onAuthError) {
          onAuthError(authError, reasonParam || undefined);
        }

        console.warn('[OAuth Callback]', errorMsg);
        showToast('error', errorMsg);

        // Clean up URL
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('auth');
        cleanUrl.searchParams.delete('reason');
        cleanUrl.searchParams.delete('msg');
        cleanUrl.searchParams.delete('state');
        cleanUrl.searchParams.delete('code');
        cleanUrl.searchParams.delete('scope');
        cleanUrl.searchParams.delete('authuser');
        cleanUrl.searchParams.delete('prompt');
        window.history.replaceState({}, '', cleanUrl.toString());
      }
    } catch (err) {
      console.error('[OAuth Callback] Error:', err);
    }
  }, [onAuthSuccess, onAuthError, setAuth, setView]);

  // This component doesn't render anything
  return null;
}
