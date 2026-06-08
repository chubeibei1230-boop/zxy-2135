import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X } from 'lucide-react'
import { getApplication, approveApplication, rejectApplication } from '@/api'
import { useAuthStore } from '@/store'
import DynamicForm from '@/components/DynamicForm'
import StatusBadge from '@/components/StatusBadge'
import type { Application } from '@/types'

export default function ApprovalDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const user = useAuthStore((s) => s.user)

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

  async function handleApprove() {
    if (!user || !app) return
    if (!confirm('确定通过此申请？')) return
    setSubmitting(true)
    try {
      await approveApplication(app.id, user.id)
      loadApp()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !app || !rejectReason.trim()) return
    setSubmitting(true)
    try {
      await rejectApplication(app.id, user.id, rejectReason.trim())
      setShowReject(false)
      setRejectReason('')
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
        <button onClick={() => navigate('/supervisor/applications')} className="p-1 rounded hover:bg-gray-100" style={{ color: 'var(--color-primary)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>审批详情</h2>
        <StatusBadge status={app.status} />
      </div>

      <div className="border rounded-lg p-4 mb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex gap-6 text-sm text-gray-500 mb-4">
          <span>申请类型: <strong className="text-gray-700">{app.application_type_name}</strong></span>
          <span>申请人: <strong className="text-gray-700">{app.applicant_name}</strong></span>
          <span>提交时间: {new Date(app.created_at).toLocaleString('zh-CN')}</span>
        </div>

        <DynamicForm fields={app.field_snapshot} values={app.field_values} onChange={() => {}} readOnly />
      </div>

      {app.supplement_notes.length > 0 && (
        <div className="border rounded-lg p-4 mb-4" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>补充说明</h3>
          <div className="space-y-2">
            {app.supplement_notes.map((note) => (
              <div key={note.id} className="p-2 rounded bg-gray-50 text-sm">
                <p className="text-gray-700">{note.content}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(note.created_at).toLocaleString('zh-CN')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {app.status === 'pending' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={submitting}
              className="flex items-center gap-1 px-5 py-2 rounded text-sm font-semibold text-white disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700"
            >
              <Check size={16} /> 通过
            </button>
            <button
              onClick={() => setShowReject(true)}
              className="flex items-center gap-1 px-5 py-2 rounded text-sm font-semibold text-white bg-red-500 hover:bg-red-600"
            >
              <X size={16} /> 驳回
            </button>
          </div>

          {showReject && (
            <form onSubmit={handleReject} className="p-4 border-2 rounded-lg space-y-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-primary)' }}>驳回原因</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-y"
                  style={{ borderColor: 'var(--color-border)' }}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={submitting || !rejectReason.trim()} className="px-4 py-1.5 rounded text-sm font-semibold text-white bg-red-500 disabled:opacity-50">
                  确认驳回
                </button>
                <button type="button" onClick={() => { setShowReject(false); setRejectReason('') }} className="px-4 py-1.5 rounded text-sm border" style={{ borderColor: 'var(--color-border)' }}>
                  取消
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
