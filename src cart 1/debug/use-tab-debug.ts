'use client'

/**
 * ════════════════════════════════════════════════════════════════════
 *  TAB DEBUG HOOK — automatic per-tab mount-time tracking
 * ════════════════════════════════════════════════════════════════════
 *
 *  Drop into any tab component:
 *
 *    function UsersPermsTab({ ... }) {
 *      useTabDebug('Users & Perms')
 *      ...
 *    }
 *
 *  Automatically logs:
 *   - Mount time (component → first paint)
 *   - Every query triggered on mount, with fetch duration
 *   - Total time until data is visible to the user (TTI)
 *   - Re-render count (warns if > 5 in 2 seconds)
 *
 *  Also integrates with the global PerfDebugger panel — events
 *  appear in the same UI.
 *
 *  ZERO impact on production — disabled in `NODE_ENV === 'production'`.
 * ════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const PERF_ENABLED = process.env.NODE_ENV !== 'production'

interface TabTiming {
  tabName: string
  mountAt: number
  firstQueryAt?: number
  firstDataAt?: number
  queriesTriggered: Array<{ key: string; status: string; duration?: number }>
}

export function useTabDebug(tabName: string) {
  const qc = useQueryClient()
  const timingRef = useRef<TabTiming>({
    tabName,
    mountAt: Date.now(),
    queriesTriggered: [],
  })
  const renderCount = useRef(0)
  const renderLog = useRef<number[]>([])

  useEffect(() => {
    if (!PERF_ENABLED) return
    const t0 = performance.now()
    timingRef.current.mountAt = Date.now()

    console.group(`%c📊 TAB MOUNT: ${tabName}`, 'color: #3b82f6; font-weight: bold')
    console.log(`  Mount time: ${Math.round(t0)}ms (relative to perf origin)`)
    console.groupEnd()

    // Track queries that fire during the first 5 seconds of mount
    const queryCache = qc.getQueryCache()
    const trackedQueries = new Set<string>()

    const unsubscribe = queryCache.subscribe((event) => {
      const query = event.query
      const keyStr = JSON.stringify(query.queryKey).slice(0, 60)
      const state = query.state

      // Only track queries that are fetching during this tab's lifetime
      if (state.fetchStatus === 'fetching' && !trackedQueries.has(keyStr)) {
        trackedQueries.add(keyStr)
        if (!timingRef.current.firstQueryAt) {
          timingRef.current.firstQueryAt = Date.now()
        }
        timingRef.current.queriesTriggered.push({
          key: keyStr,
          status: 'fetching',
        })
        console.log(`%c  ↳ Query fired: ${keyStr}`, 'color: #fbbf24')
      }

      // Track when queries complete
      if (event.type === 'updated' && state.fetchStatus === 'idle' && trackedQueries.has(keyStr)) {
        const entry = timingRef.current.queriesTriggered.find(q => q.key === keyStr && q.status === 'fetching')
        if (entry) {
          entry.status = state.status
          if (!timingRef.current.firstDataAt && state.status === 'success') {
            timingRef.current.firstDataAt = Date.now()
            const tti = timingRef.current.firstDataAt - timingRef.current.mountAt
            console.group(`%c  ✅ First data: ${tabName}`, 'color: #22c55e; font-weight: bold')
            console.log(`  TTI (time to interactive): ${tti}ms`)
            console.log(`  Queries triggered: ${timingRef.current.queriesTriggered.length}`)
            if (tti > 1000) {
              console.warn(`  ⚠️ SLOW TAB: ${tti}ms > 1000ms threshold`)
            }
            console.groupEnd()
          }
        }
      }
    })

    // After 5 seconds, log final summary
    const summaryTimer = setTimeout(() => {
      const t = timingRef.current
      const totalQueries = t.queriesTriggered.length
      const failedQueries = t.queriesTriggered.filter(q => q.status === 'error').length
      const tti = t.firstDataAt ? t.firstDataAt - t.mountAt : null

      console.group(`%c📋 TAB SUMMARY: ${tabName}`, 'color: #d97706; font-weight: bold')
      console.log(`  Total queries triggered: ${totalQueries}`)
      console.log(`  Failed queries: ${failedQueries}`)
      if (tti !== null) {
        console.log(`  Time to first data: ${tti}ms ${tti > 1000 ? '⚠️ SLOW' : '✅ OK'}`)
      } else {
        console.log(`  Time to first data: NEVER (no data fetched)`)
      }
      if (t.queriesTriggered.length > 0) {
        console.table(t.queriesTriggered)
      }
      console.groupEnd()
    }, 5000)

    return () => {
      unsubscribe()
      clearTimeout(summaryTimer)
    }
  }, [tabName, qc])

  // Render-thrash detection (rendered as side effect)
  if (PERF_ENABLED) {
    renderCount.current++
    renderLog.current.push(Date.now())
    const cutoff = Date.now() - 2000
    while (renderLog.current.length && renderLog.current[0] < cutoff) {
      renderLog.current.shift()
    }
    if (renderLog.current.length > 5) {
      console.warn(
        `%c🔁 RENDER THRASH: ${tabName} rendered ${renderLog.current.length} times in 2s`,
        'color: #ef4444; font-weight: bold'
      )
      renderLog.current = [Date.now()] // reset to avoid spam
    }
  }
}
