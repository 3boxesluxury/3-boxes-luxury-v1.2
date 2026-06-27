'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  BUG-TRACK UTILITY — for diagnosing "Explore Products" / "Try it on any
 *  product" buttons not scrolling to #products ("All Products" section).
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  USAGE:
 *    import { trackBug } from '@/lib/bug-track';
 *    trackBug('CLICK: Explore Products button pressed');
 *    trackBug('STATE: #products element found', { top: el.getBoundingClientRect().top });
 *
 *  The logs are pushed onto window.__bugTrackLogs and ALSO printed to console
 *  with the prefix `[BUG-TRACK]`. A small floating overlay component
 *  (DebugScrollTracker) subscribes to `bugtrack:update` events and shows
 *  the latest entries on screen so the user can see what happens when
 *  they click the buttons.
 *
 *  To DISABLE bug tracking globally, flip ENABLED to false.
 */

export const BUG_TRACK_ENABLED = false;

export interface BugTrackEntry {
  ts: number;          // epoch ms
  seq: number;         // monotonically increasing counter
  tag: string;         // short label e.g. "CLICK", "STATE", "SCROLL", "PAGE"
  message: string;     // human-readable description
  data?: any;          // optional structured payload
}

declare global {
  interface Window {
    __bugTrackLogs?: BugTrackEntry[];
    __bugTrackSeq?: number;
  }
}

function ensureStore() {
  if (typeof window === 'undefined') return null;
  if (!window.__bugTrackLogs) window.__bugTrackLogs = [];
  if (typeof window.__bugTrackSeq !== 'number') window.__bugTrackSeq = 0;
  return window;
}

export function trackBug(tag: string, message: string, data?: any) {
  if (!BUG_TRACK_ENABLED) return;

  // Always log to console (so devtools retains it even if overlay is gone)
  const ts = new Date();
  const stamp =
    ts.getHours().toString().padStart(2, '0') + ':' +
    ts.getMinutes().toString().padStart(2, '0') + ':' +
    ts.getSeconds().toString().padStart(2, '0') + '.' +
    ts.getMilliseconds().toString().padStart(3, '0');

  // eslint-disable-next-line no-console
  console.log(`%c[BUG-TRACK ${stamp}] ${tag}: ${message}`,
    'color:#f59e0b;font-weight:bold;',
    data !== undefined ? data : '');

  const w = ensureStore();
  if (!w) return;

  w.__bugTrackSeq = (w.__bugTrackSeq ?? 0) + 1;
  const entry: BugTrackEntry = {
    ts: Date.now(),
    seq: w.__bugTrackSeq,
    tag,
    message,
    data,
  };
  w.__bugTrackLogs.push(entry);
  // Cap at 500 entries so memory doesn't grow unbounded
  if (w.__bugTrackLogs.length > 500) {
    w.__bugTrackLogs = w.__bugTrackLogs.slice(-500);
  }

  // Notify any subscribers (DebugScrollTracker overlay)
  try {
    window.dispatchEvent(new CustomEvent('bugtrack:update', { detail: entry }));
  } catch {
    /* ignore — SSR or non-DOM env */
  }
}

export function getBugTrackLogs(): BugTrackEntry[] {
  if (typeof window === 'undefined') return [];
  return window.__bugTrackLogs ?? [];
}

export function clearBugTrackLogs() {
  if (typeof window === 'undefined') return;
  window.__bugTrackLogs = [];
  window.__bugTrackSeq = 0;
  window.dispatchEvent(new CustomEvent('bugtrack:update', { detail: null }));
}

/**
 * Convenience: snapshot diagnostic info about the current DOM state related
 * to the "All Products" scroll target.
 */
export function snapshotProductsState(): any {
  if (typeof document === 'undefined') return { error: 'no document' };
  const productsEl = document.getElementById('products');
  const headerEl = document.querySelector('header') as HTMLElement | null;
  const productGridSectionEl = document.getElementById('product-grid-section');

  return {
    hasProductsEl: !!productsEl,
    productsElRect: productsEl ? productsEl.getBoundingClientRect().toJSON() : null,
    productsElOffsetTop: productsEl ? productsEl.offsetTop : null,
    hasProductGridSectionEl: !!productGridSectionEl,
    hasHeader: !!headerEl,
    headerRect: headerEl ? headerEl.getBoundingClientRect().toJSON() : null,
    currentScrollY: window.scrollY,
    innerHeight: window.innerHeight,
    docHeight: document.documentElement.scrollHeight,
    location: {
      hash: window.location.hash,
      pathname: window.location.pathname,
      search: window.location.search,
    },
  };
}
