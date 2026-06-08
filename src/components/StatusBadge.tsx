import type { ApplicationStatus } from '@/types'

const statusMap: Record<ApplicationStatus, { label: string; className: string }> = {
  pending: { label: '待审批', className: 'bg-amber-100 text-amber-800' },
  approved: { label: '已通过', className: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: '已驳回', className: 'bg-red-100 text-red-800' },
  resubmitted: { label: '已重提', className: 'bg-blue-100 text-blue-800' },
}

interface Props {
  status: ApplicationStatus
}

export default function StatusBadge({ status }: Props) {
  const cfg = statusMap[status] || statusMap.pending
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
