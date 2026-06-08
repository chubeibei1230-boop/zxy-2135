import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { getApplicationTypes, exportApplications } from '@/api'
import type { ApplicationType, ApplicationStatus } from '@/types'

const statusOptions: { label: string; value: ApplicationStatus | '' }[] = [
  { label: '全部', value: '' },
  { label: '待审批', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '已重提', value: 'resubmitted' },
  { label: '已撤回', value: 'withdrawn' },
]

export default function Export() {
  const [types, setTypes] = useState<ApplicationType[]>([])
  const [selectedType, setSelectedType] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    getApplicationTypes().then(setTypes).catch(() => {})
  }, [])

  async function handleExport() {
    setExporting(true)
    try {
      const filters: Record<string, string> = {}
      if (selectedType) filters.application_type_id = selectedType
      if (selectedStatus) filters.status = selectedStatus
      if (dateFrom) filters.start_date = dateFrom
      if (dateTo) filters.end_date = dateTo
      const blob = await exportApplications(filters)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `applications_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--color-primary)' }}>导出数据</h2>

      <div className="border rounded-lg p-6 space-y-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-primary)' }}>申请类型</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <option value="">全部类型</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-primary)' }}>状态</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ApplicationStatus | '')}
            className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-primary)' }}>开始日期</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-primary)' }}>结束日期</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-6 py-2 rounded text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <Download size={16} /> {exporting ? '导出中...' : '导出 CSV'}
        </button>
      </div>
    </div>
  )
}
