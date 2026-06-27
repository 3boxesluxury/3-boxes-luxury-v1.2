'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  DebugScrollTracker — on-screen overlay that shows what happens when the
 *  user clicks "Explore Products" / "Try it on any product" / "Browse
 *  Products" buttons. Designed for the user to be able to diagnose the
 *  scroll bug WITHOUT opening browser devtools.
 *
 *  Renders a small floating panel in the top-right corner with:
 *   - Live log entries (timestamped, color-coded by tag)
 *   - Buttons: Clear / Test Scroll / Inspect DOM
 *   - Collapsible (click header to collapse)
 *
 *  Reads from window.__bugTrackLogs via the bug-track helper.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  trackBug,
  clearBugTrackLogs,
  getBugTrackLogs,
  snapshotProductsState,
  type BugTrackEntry,
} from '@/lib/bug-track';

const TAG_COLORS: Record<string, string> = {
  CLICK:    '#fbbf24',  // amber-400
  STATE:    '#60a5fa',  // blue-400
  SCROLL:   '#34d399',  // emerald-400
  PAGE:     '#a78bfa',  // violet-400
  ERROR:    '#f87171',  // red-400
  RENDER:   '#f472b6',  // pink-400
  DEFAULT:  '#e5e7eb',  // gray-200
};

function tagColor(tag: string): string {
  return TAG_COLORS[tag] ?? TAG_COLORS.DEFAULT;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return (
    d.getHours().toString().padStart(2, '0') + ':' +
    d.getMinutes().toString().padStart(2, '0') + ':' +
    d.getSeconds().toString().padStart(2, '0') + '.' +
    d.getMilliseconds().toString().padStart(3, '0')
  );
}

function summarizeData(data: any): string {
  if (data === undefined || data === null) return '';
  try {
    if (typeof data === 'string') return data;
    const s = JSON.stringify(data);
    if (s.length > 240) return s.slice(0, 240) + '…';
    return s;
  } catch {
    return String(data);
  }
}

export function DebugScrollTracker() {
  const [logs, setLogs] = useState<BugTrackEntry[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to bugtrack:update events
  useEffect(() => {
    trackBug('PAGE', 'DebugScrollTracker mounted');
    setLogs(getBugTrackLogs());

    const handler = () => {
      setLogs(getBugTrackLogs());
    };
    window.addEventListener('bugtrack:update', handler as EventListener);

    // Also poll once per second in case events are missed
    const poll = setInterval(() => {
      setLogs(getBugTrackLogs());
    }, 1000);

    return () => {
      window.removeEventListener('bugtrack:update', handler as EventListener);
      clearInterval(poll);
    };
  }, []);

  // Auto-scroll to bottom of log panel when new entries arrive
  useEffect(() => {
    if (logEndRef.current && !collapsed) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [logs, collapsed]);

  const handleClear = useCallback(() => {
    clearBugTrackLogs();
    setLogs([]);
    trackBug('PAGE', 'Logs cleared by user');
  }, []);

  const handleTestScroll = useCallback(() => {
    trackBug('CLICK', '[TEST] Simulating "scroll to #products"');
    const snap = snapshotProductsState();
    trackBug('STATE', 'DOM snapshot', snap);

    const el = document.getElementById('products');
    if (!el) {
      trackBug('ERROR', '#products element NOT FOUND in DOM');
      return;
    }

    // ✅ FIX: use scrollIntoView() (respects scroll-mt-36 on #products).
    // Old code used headerEl.getBoundingClientRect().bottom which returned
    // a HUGE NEGATIVE number when the user had scrolled past the header,
    // causing the scroll target to be near the user's current position.
    const beforeRect = el.getBoundingClientRect();
    trackBug('SCROLL', 'Calling el.scrollIntoView({ behavior: "smooth", block: "start" })', {
      elRectTopBefore: beforeRect.top,
      elOffsetTop: el.offsetTop,
      currentPageYOffset: window.pageYOffset,
    });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setTimeout(() => {
      const newRect = el.getBoundingClientRect();
      trackBug('SCROLL', `After 500ms — #products rect.top=${newRect.top}px scrollY=${window.scrollY}px`, {
        productsRectTop: newRect.top,
        actualScrollY: window.scrollY,
        expected: '#products should be ~120-160px from top of viewport (clears sticky header)',
      });
    }, 500);
  }, []);

  const handleInspect = useCallback(() => {
    const snap = snapshotProductsState();
    trackBug('STATE', 'Manual DOM inspection', snap);
  }, []);

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 99999,
          background: '#1c1917',
          color: '#fbbf24',
          border: '1px solid #92400e',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'monospace',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        🐛 Show Bug Tracker
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 99999,
        width: 420,
        maxWidth: 'calc(100vw - 24px)',
        background: 'rgba(12, 10, 9, 0.97)',
        color: '#fde68a',
        border: '1px solid #92400e',
        borderRadius: 8,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: collapsed ? 'none' : '1px solid #451a03',
          cursor: 'pointer',
          userSelect: 'none',
          background: 'rgba(245, 158, 11, 0.08)',
          borderRadius: collapsed ? 8 : '8px 8px 0 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#fbbf24', fontWeight: 700 }}>🐛 BUG TRACKER</span>
          <span style={{ color: '#a8a29e', fontSize: 10 }}>
            {logs.length} entries · {collapsed ? 'click to expand' : 'click to collapse'}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setHidden(true); }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#a8a29e',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 4px',
          }}
          aria-label="Hide"
        >
          ×
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Action bar */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: '6px 10px',
              borderBottom: '1px solid #451a03',
              background: 'rgba(0,0,0,0.3)',
            }}
          >
            <button onClick={handleTestScroll} style={btnStyle('#fbbf24', '#1c1917')}>
              ▶ Test Scroll
            </button>
            <button onClick={handleInspect} style={btnStyle('#60a5fa', '#1c1917')}>
              🔍 Inspect DOM
            </button>
            <button onClick={handleClear} style={btnStyle('#f87171', '#1c1917')}>
              ✕ Clear
            </button>
          </div>

          {/* Log list */}
          <div
            style={{
              maxHeight: 'min(400px, 60vh)',
              overflowY: 'auto',
              padding: '6px 10px',
            }}
          >
            {logs.length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center', color: '#78716c' }}>
                No logs yet. Click <b style={{ color: '#fbbf24' }}>"Explore Products"</b> or{' '}
                <b style={{ color: '#fbbf24' }}>"Browse Products"</b> to start tracking.
              </div>
            ) : (
              logs.map((entry) => (
                <div
                  key={entry.seq}
                  style={{
                    padding: '3px 0',
                    borderBottom: '1px dashed rgba(146, 64, 14, 0.25)',
                    lineHeight: 1.4,
                  }}
                >
                  <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                    <span style={{ color: '#78716c', fontSize: 10 }}>{fmtTime(entry.ts)}</span>
                    <span
                      style={{
                        color: tagColor(entry.tag),
                        fontWeight: 700,
                        fontSize: 10,
                        minWidth: 48,
                      }}
                    >
                      [{entry.tag}]
                    </span>
                    <span style={{ color: '#fde68a', flex: 1, wordBreak: 'break-word' }}>
                      {entry.message}
                    </span>
                  </div>
                  {entry.data !== undefined && (
                    <div
                      style={{
                        marginLeft: 60,
                        color: '#a8a29e',
                        fontSize: 10,
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {summarizeData(entry.data)}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>

          {/* Footer hint */}
          <div
            style={{
              padding: '5px 10px',
              borderTop: '1px solid #451a03',
              background: 'rgba(0,0,0,0.3)',
              color: '#78716c',
              fontSize: 9,
              borderRadius: '0 0 8px 8px',
            }}
          >
            💡 Also check browser console — all logs are printed with <code>[BUG-TRACK]</code> prefix.
          </div>
        </>
      )}
    </div>
  );
}

function btnStyle(color: string, bg: string): React.CSSProperties {
  return {
    background: bg,
    color,
    border: `1px solid ${color}`,
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'monospace',
  };
}
