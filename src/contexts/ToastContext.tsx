'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import ToastComponent, { Toast, ToastType } from '@/components/ui/Toast'


/** Coerce any value into readable toast text so API/validation errors never render blank. */
function normalizeToastMessage(raw: unknown, fallback: string): string {
  if (raw == null || raw === '') return fallback
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw)
  if (raw instanceof Error) return raw.message || fallback
  if (Array.isArray(raw)) {
    const parts = raw.map((x) => normalizeToastMessage(x, '')).filter((s) => s.length > 0)
    return parts.length > 0 ? parts.join('; ') : fallback
  }
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    if (typeof o.message === 'string' && o.message) return o.message
    if (o.detail != null) {
      if (typeof o.detail === 'string' && o.detail) return o.detail
      const fromDetail = normalizeToastMessage(o.detail, '')
      if (fromDetail) return fromDetail
    }
    try {
      return JSON.stringify(o)
    } catch {
      return fallback
    }
  }
  return fallback
}

interface ToastContextType {
  showToast: (message: unknown, type?: ToastType, duration?: number) => void
  showError: (message: unknown, duration?: number) => void
  showSuccess: (message: unknown, duration?: number) => void
  showWarning: (message: unknown, duration?: number) => void
  showInfo: (message: unknown, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: unknown, type: ToastType = 'info', duration?: number) => {
      const resolved = normalizeToastMessage(message, 'Something went wrong')
      const id = Math.random().toString(36).substring(2, 9)
      const toast: Toast = {
        id,
        message: resolved,
        type,
        duration,
      }
      setToasts((prev) => [...prev, toast])
    },
    []
  )

  const showError = useCallback(
    (message: unknown, duration?: number) => {
      showToast(message, 'error', duration || 7000)
    },
    [showToast]
  )

  const showSuccess = useCallback(
    (message: unknown, duration?: number) => {
      showToast(message, 'success', duration)
    },
    [showToast]
  )

  const showWarning = useCallback(
    (message: unknown, duration?: number) => {
      showToast(message, 'warning', duration)
    },
    [showToast]
  )

  const showInfo = useCallback(
    (message: unknown, duration?: number) => {
      showToast(message, 'info', duration)
    },
    [showToast]
  )

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showError,
        showSuccess,
        showWarning,
        showInfo,
      }}
    >
      {children}
      <div className="fixed top-6 right-6 z-[2147483647] flex flex-col items-end pointer-events-none gap-3 w-full max-w-sm">
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className="w-full animate-in slide-in-from-right-full duration-300 pointer-events-auto"
          >
            <ToastComponent toast={toast} onClose={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
