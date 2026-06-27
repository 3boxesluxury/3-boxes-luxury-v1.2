/**
 * Auth-aware fetch wrapper with automatic 401 detection.
 * When any API call returns 401, the user is automatically logged out
 * and redirected to the login screen.
 */

import { useStore } from '@/lib/store'

/**
 * Custom hook that provides an auth-aware fetch function.
 * Automatically handles 401 responses by clearing auth state.
 */
export function useAuthFetch() {
  const clearAuth = useStore((s) => s.clearAuth)
  const setAuthView = useStore((s) => s.setAuthView)

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, options)

    if (response.status === 401) {
      // Session expired or invalid — auto logout
      clearAuth()
      setAuthView('login')
      throw new Error('Session expired. Please log in again.')
    }

    return response
  }

  return authFetch
}

/**
 * Non-hook version for use in React Query mutations or callbacks.
 * Checks for 401 and auto-logs out.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {},
  onUnauthorized?: () => void
): Promise<Response> {
  const response = await fetch(url, options)

  if (response.status === 401) {
    // Try to clear auth from store directly
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('3boxes_auth')
      } catch {
        // ignore
      }
      // Dispatch a custom event that the app can listen to
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    if (onUnauthorized) onUnauthorized()
    throw new Error('Session expired. Please log in again.')
  }

  return response
}
