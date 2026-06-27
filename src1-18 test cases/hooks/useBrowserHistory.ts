'use client';

import { useEffect, useRef } from 'react';
import { useStore, type View } from '@/lib/store';

/**
 * VALID_VIEWS — list of all views that can be encoded in the URL via ?view=...
 * Used to validate URL params on popstate (Back/Forward button) so a malicious
 * or malformed URL can't set an arbitrary view string in the store.
 */
const VALID_VIEWS: View[] = [
  'home',
  'product',
  'cart',
  'checkout',
  'orders',
  'order-confirmation',
  'user-dashboard',
  'admin-dashboard',
  'agent-dashboard',
  'team-dashboard',
  'corporate-dashboard',
  'wiki',
  'downloads',
  'security-policy',
  'social-style',
  '3box-curate',
  'family-shopping',
  'wishlist',
];

/**
 * Build the URL string for a given view + optional product ID.
 * - Home view → "/" (clean URL, no query string)
 * - Product view → "/?view=product&id={productId}"
 * - Any other view → "/?view={view}"
 */
function buildUrlForView(view: View, productId: string | null | undefined): string {
  if (typeof window === 'undefined') return '/';
  const url = new URL(window.location.href);
  if (view === 'home') {
    url.search = '';
    url.hash = '';
  } else if (view === 'product' && productId) {
    url.search = `?view=product&id=${encodeURIComponent(productId)}`;
    url.hash = '';
  } else {
    url.search = `?view=${encodeURIComponent(view)}`;
    url.hash = '';
  }
  return url.toString();
}

/**
 * Parse the current browser URL and return the { view, productId } it represents.
 * - "/" (no query) → { view: 'home', productId: null }
 * - "/?view=product&id=123" → { view: 'product', productId: '123' }
 * - "/?view=cart" → { view: 'cart', productId: null }
 * - Invalid view → { view: 'home', productId: null }
 */
function parseViewFromUrl(): { view: View; productId: string | null } {
  if (typeof window === 'undefined') return { view: 'home', productId: null };
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view') as View | null;
  const idParam = params.get('id');

  if (!viewParam) return { view: 'home', productId: null };
  if (!VALID_VIEWS.includes(viewParam)) return { view: 'home', productId: null };

  if (viewParam === 'product') {
    return { view: 'product', productId: idParam || null };
  }
  return { view: viewParam, productId: null };
}

/**
 * useBrowserHistory — synchronizes the Zustand `view` state with the browser's
 * URL and history stack so that the browser's Back / Forward buttons work
 * naturally across in-app navigations.
 *
 * Behavior:
 * 1. **On view change** (e.g., user taps a product, opens cart): pushes a new
 *    entry to browser history with the appropriate URL (?view=...).
 *    Uses `history.replaceState` on the initial mount (so the initial URL
 *    becomes the canonical URL for that view) and `history.pushState` for
 *    subsequent navigations.
 *
 * 2. **On popstate** (user clicks Back / Forward): reads the new URL, parses
 *    the view + product ID, and updates the Zustand store WITHOUT pushing a
 *    new history entry (avoids infinite loop).
 *
 * 3. **On beforeunload** (user is about to leave the site — close tab,
 *    refresh, click external link, or Back-exits-site): shows the browser's
 *    native "Leave site?" confirmation dialog. This is the Q1=(c) requirement:
 *    "Show 'Leave site?' confirmation" when at Home and clicking Back would
 *    exit the site.
 *
 * Refresh persistence: because the URL always reflects the current view,
 * refreshing the page will land the user on the same view they were on
 * (e.g., refreshing /?view=product&id=123 reopens that product).
 */
export function useBrowserHistory() {
  const view = useStore((s) => s.view);
  const selectedProductId = useStore((s) => s.selectedProductId);
  const setView = useStore((s) => s.setView);
  const selectProduct = useStore((s) => s.selectProduct);

  // Refs to track whether the current view change was triggered by popstate
  // (so we don't pushState again and create an infinite loop) and whether
  // this is the initial mount (so we use replaceState instead of pushState
  // for the first sync).
  const isPopstateNav = useRef(false);
  const isInitialMount = useRef(true);

  // ─── Effect 1: Push view changes to browser history ────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // If this view change was triggered by the popstate handler below, skip
    // the pushState — the URL is already correct (the browser just changed it).
    if (isPopstateNav.current) {
      isPopstateNav.current = false;
      return;
    }

    const newUrl = buildUrlForView(view, selectedProductId);
    const stateObj = { view, selectedProductId };

    if (isInitialMount.current) {
      // On initial mount, replace the current history entry rather than
      // pushing a new one. This makes the initial URL the canonical URL
      // for the current view (e.g., if user landed on /?view=cart, the URL
      // stays as /?view=cart and Back won't unexpectedly exit to a
      // duplicate home entry).
      window.history.replaceState(stateObj, '', newUrl);
      isInitialMount.current = false;
    } else {
      window.history.pushState(stateObj, '', newUrl);
    }
  }, [view, selectedProductId]);

  // ─── Effect 2: Listen to popstate (Back / Forward buttons) ─────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const { view: viewFromUrl, productId } = parseViewFromUrl();

      // Set the flag so the pushState effect skips this change
      isPopstateNav.current = true;

      // Determine current store state to avoid redundant setView calls
      // (which would trigger unnecessary re-renders).
      const currentView = useStore.getState().view;
      const currentProductId = useStore.getState().selectedProductId;

      if (viewFromUrl === 'product' && productId) {
        if (currentView !== 'product' || currentProductId !== productId) {
          selectProduct(productId);
        }
      } else if (viewFromUrl !== currentView) {
        setView(viewFromUrl);
      }

      // If the URL matches current state, just reset the flag (no state change needed)
      if (viewFromUrl === currentView && (viewFromUrl !== 'product' || currentProductId === productId)) {
        isPopstateNav.current = false;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setView, selectProduct]);

  // ─── Effect 3: "Leave site?" confirmation (beforeunload) ───────────────────
  // This fires when the browser is about to unload the page:
  //   - User closes the tab
  //   - User refreshes the page
  //   - User clicks an external link (navigates to a different site)
  //   - User clicks Back at Home (which would exit the site)
  //
  // The browser shows its native "Leave site?" dialog (the exact wording
  // varies by browser — Chrome: "Leave site? Changes you made may not be
  // saved."). The user can choose "Leave" (proceed) or "Stay" (cancel).
  //
  // Note: modern browsers ignore custom messages — they show a generic
  // "Leave site?" prompt. This is the standard, well-supported pattern
  // used by Gmail, Google Docs, etc.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Both preventDefault() and returnValue are needed for cross-browser
      // compatibility (Firefox requires preventDefault, Chrome requires
      // returnValue to be set).
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
