import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, FileText, Eye } from 'lucide-react'
import { authLogin } from '@/api'
import { useAuthStore } from '@/store'
import type { Role } from '@/types'

const roles: { role: Role; label: string; icon: typeof Shield; color: string }[] = [
  { role: 'admin', label: '管理员', icon: Shield, color: 'border-amber-500 text-amber-600 hover:bg-amber-50' },
  { role: 'executor', label: '执行人', icon: FileText, color: 'border-emerald-500 text-emerald-600 hover:bg-emerald-50' },
  { role: 'supervisor', label: '监督人', icon: Eye, color: 'border-blue-500 text-blue-600 hover:bg-blue-50' },
]

const redirectMap: Record<Role, string> = {
  admin: '/admin/types',
  executor: '/executor/applications',
  supervisor: '/supervisor/applications',
}

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [employeeId, setEmployeeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRole || !employeeId.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await authLogin(selectedRole, employeeId.trim())
      setUser({
        id: res.id,
        token: res.token,
        role: res.role as Role,
        name: res.name,
        employee_id: employeeId.trim(),
      })
      navigate(redirectMap[selectedRole], { replace: true })
    } catch (err: any) {
      setError(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="w-full max-w-md">
        <h1
          className="text-2xl font-bold text-center mb-8 py-4 rounded"
          style={{ color: 'var(--color-primary)' }}
        >
          企业服务申请管理平台
        </h1>

        {!selectedRole ? (
          <div className="grid grid-cols-3 gap-4">
            {roles.map(({ role, label, icon: Icon, color }) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`flex flex-col items-center gap-3 py-8 border-2 rounded-lg transition-colors ${color}`}
              >
                <Icon size={36} />
                <span className="text-sm font-semibold">{label}</span>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="border-2 rounded-lg p-6 space-y-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                登录为：{roles.find((r) => r.role === selectedRole)?.label}
              </span>
              <button
                type="button"
                onClick={() => { setSelectedRole(null); setEmployeeId(''); setError('') }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                切换角色
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-primary)' }}>
                工号
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="请输入工号"
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                style={{ borderColor: 'var(--color-border)' }}
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading || !employeeId.trim()}
              className="w-full py-2 rounded text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
