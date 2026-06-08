import { create } from 'zustand'
import type { UserInfo, Role } from '@/types'

interface AuthState {
  user: UserInfo | null
  setUser: (user: UserInfo) => void
  logout: () => void
  isAdmin: () => boolean
  isExecutor: () => boolean
  isSupervisor: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try {
      const raw = localStorage.getItem('user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })(),
  setUser: (user: UserInfo) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },
  logout: () => {
    localStorage.removeItem('user')
    set({ user: null })
  },
  isAdmin: () => get().user?.role === 'admin',
  isExecutor: () => get().user?.role === 'executor',
  isSupervisor: () => get().user?.role === 'supervisor',
}))

export function getRoleLabel(role: Role): string {
  const map: Record<Role, string> = { admin: '管理员', executor: '执行人', supervisor: '监督人' }
  return map[role]
}
