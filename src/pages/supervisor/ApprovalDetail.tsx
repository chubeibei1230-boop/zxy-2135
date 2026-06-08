import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, Ban, Clock, Zap } from 'lucide-react'
import { getApplication, approveApplication, rejectApplication } from '@/api'
import { useAuthStore } from '@/store'
import DynamicForm from '@/components/DynamicForm'
import StatusBadge from '@/components/StatusBadge'
import { useToast, ToastContainer } from '@/components/Toast'
import type { Application, ProcessLog } from '@/types'

const actionLabelMap: Record<string, string> = {
  submit: '提交申请',
  approve: '审批通过',
  reject: '驳回',
  supplement: '补充说明',
  resubmit: '重新提交',
  withdraw: '撤回申请',
}

const actionColorMap: Record<string, string> = {
  submit: 'bg-blue-500',
  approve: 'bg-emerald-500',
  reject: 'bg-red-500',
  supplement: 'bg-amber-500',
  resubmit: 'bg-indigo-500',
  withdraw: 'bg-gray-500',
}

function ProcessTimeline({ logs }: { logs: ProcessLog[] }) {
  if (logs.length === 0) return null
  return (
    <div className="border rounded-lg p-4 mb-4" style={{ borderColor: 'var(--color-border)' }}>
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5" style={{ color: 'var(--color-primary)' }}>
        <Clock size={16} /> 流转记录
      </h3>
      <div className="relative pl-6">
        {logs.map((log, idx) => (
          <div key={log.id} className={`relative pb-4 ${idx < logs.length - 1 ? 'border-l-2 ml-[-1px]' : ''}`} style={{ borderColor: idx < logs.length - 1 ? 'var(--color-border)' : 'transparent' }}>
            <div className={`absolute left-[-7px] top-1 w-3 h-3 rounded-full ${actionColorMap[log.action] || 'bg-gray-400'}`} />
            <div className="ml-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-800">{actionLabelMap[log.action] || log.action}</span>
                <span className="text-gray-400 text-xs">{log.operator_name}</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{new Date(log.created_at).toLocaleString('zh-CN')}</div>
              {log.remark && (
                <div className="mt-1 text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">{log.remark}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ApprovalDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const user = useAuthStore((s) => s.user)
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    loadApp()
  }, [id])

  async function loadApp() {
    try {
      const data = await getApplication(id!)
      setApp(data)
    } catch {
      showToast('加载审批详情失败')
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
      showToast('审批通过', 'success')
      loadApp()
    } catch (err: any) {
      showToast(err.message || '审批操作失败')
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
      showToast('已驳回申请', 'success')
      loadApp()
    } catch (err: any) {
      showToast(err.message || '驳回操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">加载中...</div>
  if (!app) return <div className="text-center py-12 text-gray-500">申请不存在</div>

  const isWithdrawable = app.status === 'withdrawn'
  const isPending = app.status === 'pending' || app.status === 'resubmitted'
  const canApprove = isPending

  return (
    <div>
      <ToastContainer toasts={toasts} dismissToast={dismissToast} />

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/supervisor/applications')} className="p-1 rounded hover:bg-gray-100" style={{ color: 'var(--color-primary)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>审批详情</h2>
        <StatusBadge status={app.status} />
        {app.urgent && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            <Zap size={12} /> 加急
          </span>
        )}
      </div>

      {app.urgent && (
        <div className="mb-4 p-3 rounded-lg border-2 flex items-start gap-2 bg-red-50 border-red-300">
          <Zap size={16} className="shrink-0 mt-0.5 text-red-600" />
          <div className="text-sm">
            <span className="font-semibold text-red-800">加急申请</span>
            {app.urgent_reason && (
              <p className="text-red-700 mt-1">加急原因：{app.urgent_reason}</p>
            )}
          </div>
        </div>
      )}

      {app.latest_action && (
        <div className="mb-4 p-3 rounded-lg border-2 flex items-start gap-2" style={{ borderColor: 'var(--color-accent)', backgroundColor: '#fffbeb' }}>
          <Clock size={16} className="shrink-0 mt-0.5 text-amber-600" />
          <div className="text-sm">
            <span className="font-semibold text-amber-800">最新处理: </span>
            <span className="text-amber-700">{actionLabelMap[app.latest_action.action] || app.latest_action.action}</span>
            {app.latest_action.operator_name && <span className="text-amber-600"> · {app.latest_action.operator_name}</span>}
            {app.latest_action.remark && <span className="text-amber-700"> — {app.latest_action.remark}</span>}
            <span className="text-amber-500 text-xs ml-2">{new Date(app.latest_action.created_at).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      )}

      {isWithdrawable && (
        <div className="mb-4 p-4 rounded-lg bg-gray-100 border-2 border-gray-400 flex items-start gap-3">
          <Ban size={20} className="shrink-0 mt-0.5 text-gray-600" />
          <div>
            <p className="font-semibold text-gray-800 text-sm">此申请已被执行人撤回</p>
            <p className="text-gray-500 text-xs mt-1">该申请已不再进入当前审批流程，无法进行审批或驳回操作</p>
          </div>
        </div>
      )}

      <div className="border rounded-lg p-4 mb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex gap-6 text-sm text-gray-500 mb-4">
          <span>申请类型: <strong className="text-gray-700">{app.application_type_name}</strong></span>
          <span>申请人: <strong className="text-gray-700">{app.applicant_name}</strong></span>
          <span>提交时间: {new Date(app.created_at).toLocaleString('zh-CN')}</span>
        </div>

        {app.reject_reason && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <X size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">驳回原因</p>
              <p>{app.reject_reason}</p>
            </div>
          </div>
        )}

        <DynamicForm fields={app.field_snapshot} values={app.field_values} onChange={() => {}} readOnly />
      </div>

      {app.process_logs && app.process_logs.length > 0 && (
        <ProcessTimeline logs={app.process_logs} />
      )}

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

      {canApprove && (
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
