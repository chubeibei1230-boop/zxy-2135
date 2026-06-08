import { useState, useCallback } from 'react'

interface Toast {
  id: number
  message: string
  type: 'error' | 'success'
}

let _counter = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    const id = ++_counter
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, showToast, dismissToast }
}

export function ToastContainer({ toasts, dismissToast }: { toasts: Toast[]; dismissToast: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2" style={{ maxWidth: 400 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer transition-all ${
            t.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
          onClick={() => dismissToast(t.id)}
        >
          <span className="text-base">{t.type === 'error' ? '✕' : '✓'}</span>
          <span className="flex-1">{t.message}</span>
          <span className="text-xs opacity-70">点击关闭</span>
        </div>
      ))}
    </div>
  )
}
