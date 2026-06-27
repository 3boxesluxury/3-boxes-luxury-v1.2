'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

let addToastExternal: ((type: ToastType, message: string) => void) | null = null

export function showToast(type: ToastType, message: string) {
  if (addToastExternal) {
    addToastExternal(type, message)
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2)}`
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  addToastExternal = addToast

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const iconMap = {
    success: CheckCircle,
    error: XCircle,
    info: AlertCircle,
  }

  const colorMap = {
    success: 'border-emerald-600/40 bg-emerald-950/90 text-emerald-200',
    error: 'border-red-600/40 bg-red-950/90 text-red-200',
    info: 'border-amber-600/40 bg-amber-950/90 text-amber-200',
  }

  const iconColorMap = {
    success: 'text-emerald-400',
    error: 'text-red-400',
    info: 'text-amber-400',
  }

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map(toast => {
          const Icon = iconMap[toast.type]
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              className={`flex items-center gap-3 rounded-lg border p-4 shadow-xl backdrop-blur-sm ${colorMap[toast.type]}`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${iconColorMap[toast.type]}`} />
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
              <button onClick={() => removeToast(toast.id)} className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
