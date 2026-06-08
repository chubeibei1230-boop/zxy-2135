import { useState, useEffect } from 'react'
import { getApplicationTypes, getFields, createApplication } from '@/api'
import { useAuthStore } from '@/store'
import DynamicForm from '@/components/DynamicForm'
import type { ApplicationType, FieldType } from '@/types'

export default function Apply() {
  const [types, setTypes] = useState<ApplicationType[]>([])
  const [selectedType, setSelectedType] = useState('')
  const [fields, setFields] = useState<FieldType[]>([])
  const [values, setValues] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    getApplicationTypes().then(setTypes).catch(() => {})
  }, [])

  async function handleTypeChange(typeId: string) {
    setSelectedType(typeId)
    setValues({})
    setSuccess(false)
    if (!typeId) { setFields([]); return }
    setLoading(true)
    try {
      const config = await getFields(typeId)
      setFields(config || [])
    } catch {
      setFields([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedType || !user) return
    setSubmitting(true)
    try {
      await createApplication(selectedType, user.id, values)
      setSuccess(true)
      setValues({})
      setSelectedType('')
      setFields([])
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--color-primary)' }}>提交申请</h2>

      {success && (
        <div className="mb-4 p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          申请提交成功！
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-primary)' }}>申请类型</label>
          <select
            value={selectedType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <option value="">请选择申请类型</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {loading && <p className="text-sm text-gray-500">加载字段...</p>}

        {fields.length > 0 && (
          <DynamicForm fields={fields} values={values} onChange={setValues} />
        )}

        {fields.length > 0 && (
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 rounded text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {submitting ? '提交中...' : '提交申请'}
          </button>
        )}
      </form>
    </div>
  )
}
