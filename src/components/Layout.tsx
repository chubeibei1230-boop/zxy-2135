import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore, getRoleLabel } from '@/store'

export default function Layout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg-primary)' }}>
      <header
        className="w-full border-b-2 flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-accent)' }}
      >
        <h1 className="text-lg font-bold tracking-wide text-white">企业服务申请管理平台</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-200">
            {user.name} · {getRoleLabel(user.role)}
          </span>
          <button
            onClick={() => {
              logout()
              window.location.href = '/login'
            }}
            className="text-xs px-3 py-1 rounded border border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-white transition-colors"
          >
            退出登录
          </button>
        </div>
      </header>
      <main className="flex-1 w-full max-w-[960px] mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="w-full text-center py-3 text-xs text-gray-400 border-t" style={{ borderColor: 'var(--color-border)' }}>
        企业服务申请管理平台 © 2026
      </footer>
    </div>
  )
}
