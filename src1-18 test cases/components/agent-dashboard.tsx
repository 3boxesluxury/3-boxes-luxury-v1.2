'use client'

import React from 'react'
import { useStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Headphones, FileText, ArrowLeft, Shield, Loader2, CheckCircle2, Clock, AlertCircle,
  TrendingUp, Users, BarChart3, Zap, Award, Activity,
} from 'lucide-react'

/* ─── style constants ─── */
const cardCls = 'border-amber-900/30 bg-stone-900/80'
const btnPrimary = 'bg-amber-600 text-stone-950 hover:bg-amber-500'
const btnOutline = 'border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400'

const authH = (t: string | null) => t ? { Authorization: `Bearer ${t}` } : {}

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    open: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    'in-progress': 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    resolved: 'bg-green-600/20 text-green-400 border-green-600/30',
    closed: 'bg-stone-600/20 text-stone-400 border-stone-600/30',
    pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  }
  return m[s] || 'bg-stone-600/20 text-stone-400 border-stone-600/30'
}

const priorityColor = (p: string) => {
  const m: Record<string, string> = {
    high: 'bg-red-600/20 text-red-400 border-red-600/30',
    medium: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    low: 'bg-green-600/20 text-green-400 border-green-600/30',
  }
  return m[p] || 'bg-stone-600/20 text-stone-400 border-stone-600/30'
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

/* ─── Shared documents type (from admin AgentDocShare) ─── */
interface SharedDoc {
  id: string
  docId: string
  docTitle: string
  sharedBy: string
  createdAt: string
}

/* ─── Ticket type ─── */
interface Ticket {
  id: string
  subject: string
  status: string
  priority: string
  customer: string
  createdAt: string
}

/* ─── Main Component ─── */
export function AgentDashboard() {
  const { authUser, authToken, setView, clearAuth, setAuthView } = useStore()

  // 401 auto-logout
  React.useEffect(() => {
    const handler = () => { clearAuth(); setAuthView('login') }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [clearAuth, setAuthView])

  if (!authUser || authUser.role !== 'agent') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className={`${cardCls} w-full max-w-md`}>
          <CardContent className="p-8 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="mb-2 text-xl font-bold text-amber-100">Access Denied</h2>
            <p className="mb-4 text-sm text-amber-200/60">You do not have agent privileges to view this page.</p>
            <Button className={btnPrimary} onClick={() => setView('home')}>Back to Store</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-6 space-y-6">
      {/* Header - Purple themed */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-700/30 to-purple-600/20 border border-purple-600/20 shrink-0">
            <Headphones className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-purple-100">Agent Dashboard</h1>
            <p className="text-xs text-purple-300/50">Welcome, {authUser.name}</p>
          </div>
          <Badge className="ml-2 bg-purple-600/20 text-purple-400 border-purple-600/30">Agent</Badge>
        </div>
        <Button variant="outline" className={btnOutline} onClick={() => setView('home')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Store
        </Button>
      </div>

      {/* Support Queue + Performance Score Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Support Queue Counter */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-purple-700/30 bg-gradient-to-br from-purple-950/60 to-stone-900/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20 animate-pulse">
                  <Zap className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-purple-300/60">Support Queue</p>
                  <p className="text-2xl font-bold text-purple-200">5</p>
                </div>
                <Badge className="ml-auto bg-yellow-600/20 text-yellow-400 border-yellow-600/30 text-xs">3 Urgent</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Performance Score */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-purple-700/30 bg-gradient-to-br from-purple-950/60 to-stone-900/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center">
                  <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(147,51,234,0.2)" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#a855f7" strokeWidth="3" strokeDasharray="85, 100" strokeLinecap="round" />
                  </svg>
                  <span className="absolute text-xs font-bold text-purple-300">85</span>
                </div>
                <div>
                  <p className="text-xs text-purple-300/60">Performance Score</p>
                  <p className="text-sm font-semibold text-purple-200">Excellent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Avg Response Time */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-purple-700/30 bg-gradient-to-br from-purple-950/60 to-stone-900/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
                  <Activity className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-purple-300/60">Avg. Response</p>
                  <p className="text-2xl font-bold text-purple-200">2.4h</p>
                </div>
                <TrendingUp className="ml-auto h-4 w-4 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Stats */}
      <AgentQuickStats token={authToken} agentId={authUser.id} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Assigned Support Tickets */}
        <AssignedTickets token={authToken} agentId={authUser.id} />

        {/* Shared Documents from Admin */}
        <SharedDocuments token={authToken} agentId={authUser.id} />
      </div>
    </motion.div>
  )
}

/* ─── Quick Stats ─── */
function AgentQuickStats({ token, agentId }: { token: string | null; agentId: string }) {
  const { data: ordersData } = useQuery({
    queryKey: ['agent-orders-stats'],
    queryFn: async () => {
      const res = await fetch('/api/orders?email=all', { headers: authH(token) })
      if (!res.ok) return { orders: [] }
      return res.json()
    },
  })

  const orders = ordersData?.orders || []
  const totalOrders = orders.length
  const resolvedOrders = orders.filter((o: any) => o.status === 'delivered').length

  const stats = [
    { title: 'Tickets Assigned', value: '8', icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-600/10' },
    { title: 'Resolved', value: String(resolvedOrders || 5), icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-600/10' },
    { title: 'In Progress', value: '3', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-600/10' },
    { title: 'Avg. Resolution', value: '2.4h', icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-600/10' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div key={s.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <Card className={cardCls}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.bg}`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-amber-200/50">{s.title}</p>
                  <p className="text-lg font-bold text-amber-100">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

/* ─── Assigned Tickets ─── */
function AssignedTickets({ token, agentId }: { token: string | null; agentId: string }) {
  // Placeholder tickets since there's no dedicated endpoint
  const { data, isLoading } = useQuery({
    queryKey: ['agent-tickets', agentId],
    queryFn: async () => {
      // No dedicated tickets endpoint, return placeholder data
      return { tickets: [] as Ticket[] }
    },
  })

  const tickets = data?.tickets || []

  // Sample tickets for display when API returns empty
  const sampleTickets: Ticket[] = tickets.length > 0 ? tickets : [
    { id: 't1', subject: 'Order not received', status: 'open', priority: 'high', customer: 'John D.', createdAt: new Date().toISOString() },
    { id: 't2', subject: 'Product damaged on arrival', status: 'in-progress', priority: 'high', customer: 'Sarah M.', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 't3', subject: 'Return request for shoes', status: 'resolved', priority: 'medium', customer: 'Alex K.', createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 't4', subject: 'Billing inquiry', status: 'open', priority: 'low', customer: 'Priya R.', createdAt: new Date(Date.now() - 259200000).toISOString() },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-sm font-semibold text-amber-100">Assigned Support Tickets</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-900/20 hover:bg-transparent">
                    <TableHead className="text-amber-200/50">Subject</TableHead>
                    <TableHead className="text-amber-200/50">Customer</TableHead>
                    <TableHead className="text-amber-200/50">Priority</TableHead>
                    <TableHead className="text-amber-200/50">Status</TableHead>
                    <TableHead className="text-amber-200/50">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleTickets.map((t) => (
                    <TableRow key={t.id} className="border-amber-900/10 hover:bg-amber-900/5">
                      <TableCell className="text-sm text-amber-100">{t.subject}</TableCell>
                      <TableCell className="text-sm text-amber-200/60">{t.customer}</TableCell>
                      <TableCell>
                        <Badge className={priorityColor(t.priority)}>{t.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor(t.status)}>{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-amber-200/60">{fmtDate(t.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Shared Documents from Admin (AgentDocShare) ─── */
function SharedDocuments({ token, agentId }: { token: string | null; agentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['agent-shared-docs', agentId],
    queryFn: async () => {
      // No dedicated shared docs endpoint for agents yet
      return { docs: [] as SharedDoc[] }
    },
  })

  const docs = data?.docs || []

  // Sample shared docs for display
  const sampleDocs: SharedDoc[] = docs.length > 0 ? docs : [
    { id: 'd1', docId: 'DOC-001', docTitle: 'Return Policy Guidelines', sharedBy: 'admin', createdAt: new Date().toISOString() },
    { id: 'd2', docId: 'DOC-002', docTitle: 'Shipping Procedures Manual', sharedBy: 'admin', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'd3', docId: 'DOC-003', docTitle: 'Customer Escalation Matrix', sharedBy: 'admin', createdAt: new Date(Date.now() - 172800000).toISOString() },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-sm font-semibold text-amber-100">Shared Documents</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {sampleDocs.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600/10">
                    <FileText className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-amber-100">{d.docTitle}</p>
                    <p className="text-xs text-amber-200/50">Shared by {d.sharedBy} · {fmtDate(d.createdAt)}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-amber-200/40 hover:text-amber-400">
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
