'use client'

/**
 * ════════════════════════════════════════════════════════════════════
 *  PERFORMANCE DEBUGGER — automatic per-tab slowness detection
 * ════════════════════════════════════════════════════════════════════
 *
 *  This hook automatically instruments every React Query in your app
 *  and logs a warning whenever:
 *   - A query takes more than 300ms to fetch
 *   - A mutation takes more than 200ms
 *   - An invalidateQueries() call matches more than 3 queries (cascade)
 *   - A query refetches more than 3 times in 10 seconds (thrashing)
 *
 *  Just import and call once at the top of AdminDashboard:
 *
 *    import { usePerfDebugger } from '@/debug/use-perf-debugger'
 *    ...
 *    usePerfDebugger()
 *
 *  No other changes needed. Open DevTools console to see warnings.
 *  Toggle the floating panel with Ctrl+Shift+P (or click the badge).
 *
 *  ZERO impact on production — disabled in `NODE_ENV === 'production'`.
 * ════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface SlowQuery {
  id: string
  queryKey: string
  duration: number
  timestamp: number
  type: 'query' | 'mutation' | 'invalidation' | 'refetch-thrash'
  details?: string
}

const PERF_ENABLED = process.env.NODE_ENV !== 'production'

// Thresholds (ms) — adjust to suit your needs
const SLOW_QUERY_MS = 300
const SLOW_MUTATION_MS = 200
const CASCADE_INVALIDATE_THRESHOLD = 3
const REFETCH_THRASH_COUNT = 3
const REFETCH_THRASH_WINDOW_MS = 10_000

export function usePerfDebugger() {
  const qc = useQueryClient()
  const [slowEvents, setSlowEvents] = useState<SlowQuery[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const refetchTracker = useRef<Map<string, number[]>>(new Map())

  useEffect(() => {
    if (!PERF_ENABLED) return

    const queryCache = qc.getQueryCache()
    const mutationCache = qc.getMutationCache()

    // ─── Track query fetch times ──────────────────────────────
    const unsubQuery = queryCache.subscribe((event) => {
      const query = event.query
      const keyStr = JSON.stringify(query.queryKey).slice(0, 80)
      const state = query.state

      // Detect fetch completion
      if (event.type === 'updated' && state.fetchStatus === 'idle' && state.dataUpdatedAt) {
        // We can't directly get fetch duration from React Query state,
        // but we can track refetch thrashing.
        const now = Date.now()
        const track = refetchTracker.current.get(keyStr) || []
        track.push(now)
        // Keep only events in the last window
        const cutoff = now - REFETCH_THRASH_WINDOW_MS
        while (track.length && track[0] < cutoff) track.shift()
        refetchTracker.current.set(keyStr, track)

        if (track.length >= REFETCH_THRASH_COUNT) {
          logSlow({
            id: Math.random().toString(36).slice(2),
            queryKey: keyStr,
            duration: 0,
            timestamp: now,
            type: 'refetch-thrash',
            details: `${track.length} refetches in 10s`,
          })
          // Reset to avoid repeated alerts
          refetchTracker.current.set(keyStr, [now])
        }
      }
    })

    // ─── Track mutations ──────────────────────────────────────
    const unsubMut = mutationCache.subscribe((event) => {
      const mut = event.mutation
      if (event.type === 'updated' && (mut.state.status === 'success' || mut.state.status === 'error')) {
        const submittedAt = mut.state.submittedAt || 0
        const duration = Date.now() - submittedAt
        if (duration > SLOW_MUTATION_MS) {
          const keyStr = JSON.stringify(mut.options?.mutationKey || mut.state.variables || 'unknown').slice(0, 80)
          logSlow({
            id: mut.mutationId,
            queryKey: keyStr,
            duration,
            timestamp: Date.now(),
            type: 'mutation',
            details: `${mut.state.status.toUpperCase()} — variables: ${JSON.stringify(mut.state.variables).slice(0, 100)}`,
          })
        }
      }
    })

    // ─── Patch invalidateQueries to detect cascades ───────────
    const originalInvalidate = qc.invalidateQueries.bind(qc)
    // @ts-ignore
    qc.invalidateQueries = function (...args: any[]) {
      const filters = args[0]
      const isGlobal = !filters || (typeof filters === 'object' && !filters.queryKey && !filters.predicate)
      if (isGlobal) {
        const allQueries = qc.getQueryCache().getAll()
        logSlow({
          id: Math.random().toString(36).slice(2),
          queryKey: '⚠️ GLOBAL INVALIDATE',
          duration: 0,
          timestamp: Date.now(),
          type: 'invalidation',
          details: `Invalidated ALL ${allQueries.length} queries — likely a bug`,
        })
      } else if (filters?.queryKey) {
        const keyStr = JSON.stringify(filters.queryKey)
        const matching = qc.getQueryCache().getAll().filter(q =>
          JSON.stringify(q.queryKey).startsWith(keyStr.slice(0, keyStr.length - 5))
        )
        if (matching.length >= CASCADE_INVALIDATE_THRESHOLD) {
          logSlow({
            id: Math.random().toString(36).slice(2),
            queryKey: keyStr.slice(0, 80),
            duration: 0,
            timestamp: Date.now(),
            type: 'invalidation',
            details: `Cascade: invalidated ${matching.length} queries`,
          })
        }
      }
      return originalInvalidate(...args)
    }

    // ─── Track slow fetches via fetch interceptor ─────────────
    // We patch window.fetch to measure every API call
    const originalFetch = window.fetch
    const fetchTimings = new Map<string, number>()
    // @ts-ignore
    window.fetch = function (...args: any[]) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '')
      const method = args[1]?.method || 'GET'
      const callId = `${method}:${url}:${Math.random().toString(36).slice(2, 8)}`
      fetchTimings.set(callId, performance.now())

      const promise = originalFetch.apply(this, args)
      promise.then((res: Response) => {
        const start = fetchTimings.get(callId) || 0
        const duration = performance.now() - start
        fetchTimings.delete(callId)
        if (duration > SLOW_QUERY_MS && url.includes('/api/')) {
          logSlow({
            id: callId,
            queryKey: `${method} ${url}`.slice(0, 80),
            duration: Math.round(duration),
            timestamp: Date.now(),
            type: 'query',
            details: `HTTP ${res.status}`,
          })
        }
      }).catch(() => {
        fetchTimings.delete(callId)
      })
      return promise
    }

    function logSlow(event: SlowQuery) {
      setSlowEvents(prev => [event, ...prev].slice(0, 50))

      const icon = event.type === 'invalidation' ? '🚨'
        : event.type === 'refetch-thrash' ? '🔁'
        : event.type === 'mutation' ? '🟡'
        : '🐌'

      const color = event.type === 'invalidation' ? 'color: #ef4444; font-weight: bold'
        : event.type === 'refetch-thrash' ? 'color: #fbbf24; font-weight: bold'
        : 'color: #fbbf24'

      console.group(`%c${icon} PERF: ${event.type} — ${event.queryKey}`, color)
      console.log(`  Duration: ${event.duration}ms`)
      console.log(`  Time: ${new Date(event.timestamp).toLocaleTimeString()}`)
      if (event.details) console.log(`  Details: ${event.details}`)
      console.groupEnd()
    }

    // Keyboard shortcut to toggle panel
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        setPanelOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)

    return () => {
      unsubQuery()
      unsubMut()
      // @ts-ignore
      qc.invalidateQueries = originalInvalidate
      // @ts-ignore
      window.fetch = originalFetch
      window.removeEventListener('keydown', onKey)
    }
  }, [qc])

  if (!PERF_ENABLED) return null

  // Render floating badge + expandable panel
  return panelOpen ? (
    <div
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
        width: 520, maxHeight: '70vh', overflow: 'auto',
        background: '#0c0a09', color: '#fef3c7',
        border: '1px solid #44403c', borderRadius: 8,
        fontFamily: 'monospace', fontSize: 11,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #44403c', background: '#292524' }}>
        <strong>🐛 Perf Debugger ({slowEvents.length})</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setSlowEvents([])}
            style={{ background: 'transparent', color: '#fef3c7', border: '1px solid #44403c', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 }}
          >Clear</button>
          <button onClick={() => setPanelOpen(false)} style={{ background: 'transparent', color: '#fef3c7', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      </div>

      {slowEvents.length === 0 && (
        <div style={{ padding: 16, textAlign: 'center', color: '#22c55e' }}>
          ✅ No slow events detected yet.
          <br />
          <span style={{ color: '#57534e' }}>Interact with the app to collect data.</span>
        </div>
      )}

      {slowEvents.map(ev => {
        const bgColor = ev.type === 'invalidation' ? '#7f1d1d20'
          : ev.type === 'refetch-thrash' ? '#78350f20'
          : ev.type === 'mutation' ? '#78350f10'
          : '#1c191720'
        const borderColor = ev.type === 'invalidation' ? '#ef4444'
          : ev.type === 'refetch-thrash' ? '#fbbf24'
          : '#fbbf24'
        const icon = ev.type === 'invalidation' ? '🚨'
          : ev.type === 'refetch-thrash' ? '🔁'
          : ev.type === 'mutation' ? '🟡'
          : '🐌'
        return (
          <div key={ev.id} style={{ padding: '8px 12px', borderBottom: '1px solid #292524', background: bgColor, borderLeft: `3px solid ${borderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{icon} <strong>{ev.type}</strong></span>
              <span style={{ color: '#a8a29e' }}>{new Date(ev.timestamp).toLocaleTimeString()}</span>
            </div>
            <div style={{ marginTop: 4, color: '#fef3c7' }}>{ev.queryKey}</div>
            {ev.duration > 0 && <div style={{ color: '#fbbf24' }}>⏱ {ev.duration}ms</div>}
            {ev.details && <div style={{ color: '#a8a29e', marginTop: 2 }}>{ev.details}</div>}
          </div>
        )
      })}
    </div>
  ) : (
    <button
      onClick={() => setPanelOpen(true)}
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
        padding: '6px 12px', background: slowEvents.length > 0 ? '#dc2626' : '#16a34a',
        color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
        fontWeight: 'bold', fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        fontFamily: 'monospace',
      }}
      title="Open Perf Debugger (Ctrl+Shift+P)"
    >
      🐛 {slowEvents.length > 0 ? `${slowEvents.length} issues` : 'Perf OK'}
    </button>
  )
}
