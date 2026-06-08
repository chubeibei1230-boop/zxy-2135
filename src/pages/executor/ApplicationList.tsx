import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApplications } from '@/api'
import { useAuthStore } from '@/store'
import StatusBadge from '@/components/StatusBadge'
import type { Application, ApplicationStatus } from '@/types'

const tabs: { label: string; value: string }[] = [
  { label: '全部', value: '' },
  { label: '待审批', value: 'pending,resubmitted' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '已重提', value: 'resubmitted' },
  { label: '已撤回', value: 'withdrawn' },
]

const actionLabelMap: Record<string, string> = {
  submit: '提交',
  approve: '审批通过',
  reject: '驳回',
  supplement: '补充说明',
  resubmit: '重新提交',
  withdraw: '撤回',
}

export default function ApplicationList() {
  const [applications, setApplications] = useState<Application[]>([])
  const [activeTab, setActiveTab] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    loadApplications()
  }, [activeTab])

  async function loadApplications() {
    setLoading(true)
    try {
      const filters: Record<string, string> = {}
      if (user) filters.applicant_id = user.id
      if (activeTab) filters.status = activeTab
      const data = await getApplications(filters)
      setApplications(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>我的申请</h2>
        <button
          onClick={() => navigate('/executor/apply')}
          className="px-4 py-2 rounded text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          新建申请
        </button>
      </div>

      <div className="flex gap-1 mb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-8 text-gray-500 text-sm">加载中...</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2" style={{ borderColor: 'var(--color-primary)' }}>
              <th className="text-left py-2 font-semibold" style={{ color: 'var(--color-primary)' }}>申请类型</th>
              <th className="text-center py-2 font-semibold" style={{ color: 'var(--color-primary)' }}>状态</th>
              <th className="text-left py-2 font-semibold" style={{ color: 'var(--color-primary)' }}>最近操作</th>
              <th className="text-left py-2 font-semibold" style={{ color: 'var(--color-primary)' }}>提交时间</th>
              <th className="text-right py-2 font-semibold" style={{ color: 'var(--color-primary)' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id} className="border-b hover:bg-gray-50" style={{ borderColor: 'var(--color-border)' }}>
                <td className="py-2.5">{app.application_type_name}</td>
                <td className="py-2.5 text-center"><StatusBadge status={app.status} /></td>
                <td className="py-2.5 text-gray-500 text-xs">
                  {app.latest_action ? (
                    <span>{actionLabelMap[app.latest_action.action] || app.latest_action.action} · {app.latest_action.operator_name}</span>
                  ) : '-'}
                </td>
                <td className="py-2.5 text-gray-500">{new Date(app.created_at).toLocaleString('zh-CN')}</td>
                <td className="py-2.5 text-right">
                  <button onClick={() => navigate(`/executor/applications/${app.id}`)} className="text-xs px-3 py-1 rounded border hover:bg-gray-50" style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}>
                    查看
                  </button>
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">暂无申请记录</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
