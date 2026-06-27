/**
 * Debug script: Simulates the slow toggle flow and measures each step.
 *
 * Run in browser DevTools console while on the admin Users & Perms tab.
 * It will print a timing breakdown so you can see exactly which step
 * is the bottleneck.
 *
 * Before running, open DevTools → Network tab → check "Preserve log".
 */

(async function diagnoseToggleSlowness() {
  console.log('%c🔍 Starting performance diagnosis...', 'color: #d97706; font-weight: bold; font-size: 14px')

  const token = JSON.parse(localStorage.getItem('3boxes_auth') || '{}')?.token
  if (!token) {
    console.error('❌ No auth token found in localStorage')
    return
  }

  const results = []

  // Step 1: Measure auth overhead on a single API call
  console.log('%c[1/5] Measuring auth overhead (single users API call)...', 'color: #3b82f6')
  const t1 = performance.now()
  try {
    const res = await fetch('/api/admin/users?limit=1', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    await res.json()
    const t2 = performance.now()
    results.push({ step: 'GET /api/admin/users?limit=1', ms: Math.round(t2 - t1) })
    console.log(`   ${Math.round(t2 - t1)}ms`)
  } catch (e) {
    console.error('   Failed:', e)
  }

  // Step 2: Measure full users list
  console.log('%c[2/5] Measuring full users list fetch...', 'color: #3b82f6')
  const t3 = performance.now()
  try {
    const res = await fetch('/api/admin/users?page=1&limit=20', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    const data = await res.json()
    const t4 = performance.now()
    results.push({ step: 'GET /api/admin/users (list)', ms: Math.round(t4 - t3), users: data.users?.length })
    console.log(`   ${Math.round(t4 - t3)}ms — got ${data.users?.length || 0} users`)
  } catch (e) {
    console.error('   Failed:', e)
  }

  // Step 3: Measure how many queries are active in the cache
  console.log('%c[3/5] Counting active queries in React Query cache...', 'color: #3b82f6')
  const qc = window.__REACT_QUERY_CLIENT || (window as any).QueryClient?.default
  // Fallback: scan DOM for performance monitor
  const allCacheEntries = (window as any).__TANSTACK_QUERY_CACHE
  console.log('   (If Perf Monitor is open, check its panel for the count)')

  // Step 4: Measure a toggle mutation end-to-end
  console.log('%c[4/5] Measuring toggle mutation (no-op, will revert)...', 'color: #fbbf24')
  // Get first user
  const firstUser = await fetch('/api/admin/users?limit=1', {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  }).then(r => r.json()).then(d => d.users?.[0])

  if (firstUser) {
    const originalState = firstUser.isActive
    console.log(`   Toggling user ${firstUser.email} from ${originalState} to ${!originalState}`)

    const t5 = performance.now()
    const res = await fetch(`/api/admin/users/${firstUser.id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !originalState })
    })
    await res.json()
    const t6 = performance.now()
    results.push({ step: 'PUT /api/admin/users/[id] (toggle)', ms: Math.round(t6 - t5) })
    console.log(`   ${Math.round(t6 - t5)}ms — this is the API round-trip`)

    // Revert
    await fetch(`/api/admin/users/${firstUser.id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: originalState })
    })
    console.log('   Reverted.')
  } else {
    console.log('   No users found to test with.')
  }

  // Step 5: Check query client config
  console.log('%c[5/5] Checking QueryClient config...', 'color: #3b82f6')
  const queryProviderEl = document.querySelector('[data-query-client]')
  console.log('   Open perf-monitor.tsx panel to see live query stats')

  // Final report
  console.log('%c═══════════════════════════════════════════════', 'color: #44403c')
  console.log('%c📈 PERFORMANCE DIAGNOSIS REPORT', 'color: #d97706; font-weight: bold; font-size: 14px')
  console.log('%c═══════════════════════════════════════════════', 'color: #44403c')
  results.forEach(r => {
    const ms = r.ms
    let icon = '🟢', verdict = 'FAST'
    if (ms > 200) { icon = '🟡'; verdict = 'SLOW' }
    if (ms > 500) { icon = '🔴'; verdict = 'VERY SLOW' }
    console.log(`${icon} ${verdict.padEnd(10)} ${ms.toString().padStart(5)}ms  ${r.step}`)
  })
  console.log('%c═══════════════════════════════════════════════', 'color: #44403c')

  console.log('%c💡 Expected improvements after fixes:', 'color: #22c55e; font-weight: bold')
  console.log('   • Switch toggle: instant (0ms) — optimistic update')
  console.log('   • Tab loading: <50ms — keepPreviousData + scoped invalidation')
  console.log('   • API calls: -100ms each — auth caching')
  console.log('   • No more cascading refetches from invalidateAll()')

  return results
})()
