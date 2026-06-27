'use client'

/**
 * Performance Monitor — drop this component into your admin dashboard
 * to see exactly which queries are slow and which mutations cause
 * cascading refetches.
 *
 * Usage:
 *   import { PerfMonitor } from '@/debug/perf-monitor'
 *   // Add it temporarily inside AdminDashboard():
 *   // <PerfMonitor />
 *
 * It renders a floating panel (bottom-right) showing:
 *   - Every active query with its fetch time
 *   - Every mutation with its result
 *   - Total refetches triggered by invalidateQueries
 *   - Warning when invalidateQueries() is called with no args (the bug!)
 */

import React, { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface QueryStat {
  key: string
  status: string
  fetchTime?: number
  isFetching: boolean
  dataUpdatedAt: number
  observers: number
}

interface MutationStat {
  id: string
  key: string
  status: string
  submittedAt: number
  duration?: number
}

interface InvalidationLog {
  id: string
  timestamp: number
  queryKey: string
  cascadeCount: number
  isGlobal: boolean
}

export function PerfMonitor() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(true)
  const [queries, setQueries] = useState<QueryStat[]>([])
  const [mutations, setMutations] = useState<MutationStat[]>([])
  const [invalidations, setInvalidations] = useState<InvalidationLog[]>([])
  const [totalRefetches, setTotalRefetches] = useState(0)

  useEffect(() => {
    // Patch the query cache to track invalidations
    const originalInvalidate = qc.invalidateQueries.bind(qc)
    const originalRefetch = qc.refetchQueries.bind(qc)

    // @ts-ignore - patch invalidateQueries to log calls
    qc.invalidateQueries = function (...args: any[]) {
      const queryKey = args[0]?.queryKey
        ? JSON.stringify(args[0].queryKey)
        : args[0]
          ? JSON.stringify(args[0])
          : '⚠️ ALL QUERIES (global nuke!)'

      const isGlobal = !args[0] || (typeof args[0] === 'object' && Object.keys(args[0]).length === 0)

      // Count how many queries will be refetched
      const allQueries = qc.getQueryCache().getAll()
      const matchingQueries = isGlobal
        ? allQueries
        : allQueries.filter(q => JSON.stringify(q.queryKey).startsWith(queryKey.slice(0, 20)))

      setInvalidations(prev => [
        {
          id: Math.random().toString(36).slice(2),
          timestamp: Date.now(),
          queryKey,
          cascadeCount: matchingQueries.length,
          isGlobal,
        },
        ...prev.slice(0, 19),
      ])

      if (isGlobal) {
        setTotalRefetches(n => n + matchingQueries.length)
        console.warn(
          `%c🚨 PERF BUG: invalidateQueries() called with no args — invalidating ${matchingQueries.length} queries!`,
          'background: red; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold'
        )
      }

      return originalInvalidate(...args)
    }

    // Poll query cache every 500ms
    const interval = setInterval(() => {
      const cache = qc.getQueryCache()
      const all = cache.getAll()
      const qStats: QueryStat[] = all.map(q => {
        const observers = q.observers?.length || 0
        const startedAt = (q as any).state?.dataUpdatedAt || 0
        return {
          key: JSON.stringify(q.queryKey).slice(0, 60),
          status: q.state.status,
          fetchTime: q.state.fetchStatus === 'fetching' ? Date.now() - (q as any).state?.fetchMeta?.fetchOptions?.signal?._startTime || startedAt : undefined,
          isFetching: q.state.fetchStatus === 'fetching',
          dataUpdatedAt: q.state.dataUpdatedAt,
          observers,
        }
      }).filter(q => q.observers > 0 || q.isFetching)

            setQueries(qStats.sort((a, b) => Number(b.isFetching) - Number(a.isFetching)))

      // Track mutations
      const muts = qc.getMutationCache().getAll()
      const mutStats: MutationStat[] = muts.slice(-10).reverse().map(m => ({
        id: m.mutationId,
        key: JSON.stringify(m.options?.mutationKey || m.state.variables).slice(0, 60),
        status: m.state.status,
        submittedAt: m.state.submittedAt,
        duration: m.state.status === 'success' || m.state.status === 'error'
          ? (m.state.submittedAt ? Date.now() - m.state.submittedAt : undefined)
          : undefined,
      }))
      setMutations(mutStats)
    }, 500)

    return () => {
      clearInterval(interval)
      // @ts-ignore
      qc.invalidateQueries = originalInvalidate
    }
  }, [qc])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
          padding: '8px 14px', background: '#d97706', color: '#fff',
          border: 'none', borderRadius: 6, cursor: 'pointer',
          fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        📊 Perf Monitor
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
        width: 460, maxHeight: '70vh', overflow: 'auto',
        background: '#1c1917', color: '#fef3c7',
        border: '1px solid #44403c', borderRadius: 8,
        fontFamily: 'monospace', fontSize: 11,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #44403c', background: '#292524' }}>
        <strong>📊 Perf Monitor</strong>
        <button onClick={() => setOpen(false)} style={{ background: 'transparent', color: '#fef3c7', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>

      <div style={{ padding: '8px 12px', borderBottom: '1px solid #44403c', background: '#0c0a09' }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: '#a8a29e' }}>Active queries: </span>
          <strong style={{ color: queries.filter(q => q.isFetching).length > 0 ? '#fbbf24' : '#22c55e' }}>
            {queries.filter(q => q.isFetching).length} fetching / {queries.length} total
          </strong>
        </div>
        <div>
          <span style={{ color: '#a8a29e' }}>Total refetches from invalidations: </span>
          <strong style={{ color: totalRefetches > 5 ? '#ef4444' : '#22c55e' }}>{totalRefetches}</strong>
        </div>
      </div>

      <div style={{ padding: '8px 12px', borderBottom: '1px solid #44403c' }}>
        <div style={{ color: '#a8a29e', marginBottom: 4, fontWeight: 'bold' }}>ACTIVE QUERIES</div>
        {queries.length === 0 && <div style={{ color: '#57534e' }}>No active queries</div>}
        {queries.map((q, i) => (
          <div key={i} style={{ padding: '2px 0', color: q.isFetching ? '#fbbf24' : q.status === 'error' ? '#ef4444' : '#86efac' }}>
            {q.isFetching ? '⟳' : q.status === 'error' ? '✗' : '✓'} {q.key}
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 12px', borderBottom: '1px solid #44403c' }}>
        <div style={{ color: '#a8a29e', marginBottom: 4, fontWeight: 'bold' }}>RECENT INVALIDATIONS</div>
        {invalidations.length === 0 && <div style={{ color: '#57534e' }}>None yet</div>}
        {invalidations.map(inv => (
          <div key={inv.id} style={{ padding: '3px 0', color: inv.isGlobal ? '#ef4444' : '#86efac' }}>
            {inv.isGlobal ? '🚨' : '↻'} {new Date(inv.timestamp).toLocaleTimeString()} — {inv.queryKey} ({inv.cascadeCount} queries)
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 12px' }}>
        <div style={{ color: '#a8a29e', marginBottom: 4, fontWeight: 'bold' }}>RECENT MUTATIONS</div>
        {mutations.length === 0 && <div style={{ color: '#57534e' }}>None yet</div>}
        {mutations.map(m => (
          <div key={m.id} style={{ padding: '2px 0', color: m.status === 'success' ? '#86efac' : m.status === 'error' ? '#ef4444' : '#fbbf24' }}>
            {m.status === 'success' ? '✓' : m.status === 'error' ? '✗' : '⟳'} {m.key}
            {m.duration && <span style={{ color: '#a8a29e' }}> ({m.duration}ms)</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
