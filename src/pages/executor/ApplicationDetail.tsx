import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { getApplication, supplementApplication, resubmitApplication } from '@/api'
import DynamicForm from '@/components/DynamicForm'
import StatusBadge from '@/components/StatusBadge'
import type { Application } from '@/types'

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [noteContent, setNoteContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadApp()
  }, [id])

  async function loadApp() {
    try {
      const data = await getApplication(id!)
      setApp(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function handleSupplement(e: React.FormEvent) {
    e.preventDefault()
    if (!noteContent.trim()) return
    setSubmitting(true)
    try {
      await supplementApplication(id!, noteContent.trim())
      setNoteContent('')
      loadApp()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResubmit() {
    if (!confirm('确定重新提交此申请？')) return
    setSubmitting(true)
    try {
      await resubmitApplication(id!)
      loadApp()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">加载中...</div>
  if (!app) return <div className="text-center py-12 text-gray-500">申请不存在</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/executor/applications')} className="p-1 rounded hover:bg-gray-100" style={{ color: 'var(--color-primary)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>申请详情</h2>
        <StatusBadge status={app.status} />
      </div>

      <div className="border rounded-lg p-4 mb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex gap-6 text-sm text-gray-500 mb-4">
          <span>申请类型: <strong className="text-gray-700">{app.application_type_name}</strong></span>
          <span>申请人: <strong className="text-gray-700">{app.applicant_name}</strong></span>
          <span>提交时间: {new Date(app.created_at).toLocaleString('zh-CN')}</span>
        </div>

        {app.reject_reason && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">驳回原因</p>
              <p>{app.reject_reason}</p>
            </div>
          </div>
        )}

        <DynamicForm fields={app.field_snapshot} values={app.field_values} onChange={() => {}} readOnly />
      </div>

      <div className="border rounded-lg p-4 mb-4" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>补充说明</h3>
        {app.supplement_notes.length > 0 ? (
          <div className="space-y-2 mb-3">
            {app.supplement_notes.map((note) => (
              <div key={note.id} className="p-2 rounded bg-gray-50 text-sm">
                <p className="text-gray-700">{note.content}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(note.created_at).toLocaleString('zh-CN')}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-3">暂无补充说明</p>
        )}

        <form onSubmit={handleSupplement} className="flex gap-2">
          <input
            type="text"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="添加补充说明..."
            className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            style={{ borderColor: 'var(--color-border)' }}
          />
          <button type="submit" disabled={submitting || !noteContent.trim()} className="px-4 py-2 rounded text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--color-accent)' }}>
            添加
          </button>
        </form>
      </div>

      {app.status === 'rejected' && (
        <button
          onClick={handleResubmit}
          disabled={submitting}
          className="px-6 py-2 rounded text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          重新提交
        </button>
      )}
    </div>
  )
}
