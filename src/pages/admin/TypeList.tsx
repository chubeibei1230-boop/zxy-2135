import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { getApplicationTypes, createApplicationType, updateApplicationType, deleteApplicationType } from '@/api'
import { useAuthStore } from '@/store'
import type { ApplicationType } from '@/types'

export default function TypeList() {
  const [types, setTypes] = useState<ApplicationType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    loadTypes()
  }, [])

  async function loadTypes() {
    try {
      const data = await getApplicationTypes()
      setTypes(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditId(null)
    setFormName('')
    setFormDesc('')
    setShowForm(true)
  }

  function openEdit(t: ApplicationType) {
    setEditId(t.id)
    setFormName(t.name)
    setFormDesc(t.description)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editId) {
        await updateApplicationType(editId, { name: formName, description: formDesc })
      } else {
        await createApplicationType({ name: formName, description: formDesc })
      }
      setShowForm(false)
      loadTypes()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此申请类型？')) return
    try {
      await deleteApplicationType(id)
      loadTypes()
    } catch {
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">加载中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>申请类型管理</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1 px-4 py-2 rounded text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <Plus size={16} /> 新建申请类型
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border-2 rounded-lg space-y-3" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-primary)' }}>类型名称</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{ borderColor: 'var(--color-border)' }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-primary)' }}>描述</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="px-4 py-1.5 rounded text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
              {editId ? '更新' : '创建'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 rounded text-sm border" style={{ borderColor: 'var(--color-border)' }}>
              取消
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {types.map((t) => (
          <div key={t.id} className="border rounded-lg p-4 flex items-start justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>{t.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{t.description}</p>
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                <span>字段数: {t.field_count ?? '-'}</span>
                <span>版本: v{t.version}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <button
                onClick={() => navigate(`/admin/types/${t.id}/fields`)}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                title="字段配置"
              >
                <Edit size={16} />
              </button>
              <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-gray-100 text-amber-600" title="编辑">
                <Edit size={16} />
              </button>
              <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-gray-100 text-red-500" title="删除">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {types.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">暂无申请类型</p>}
      </div>
    </div>
  )
}
