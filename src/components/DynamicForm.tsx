import { useRef, forwardRef, useImperativeHandle } from 'react'
import type { FieldType } from '@/types'

interface Props {
  fields: FieldType[]
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
  readOnly?: boolean
}

export interface DynamicFormHandle {
  validate: () => string[]
}

export default forwardRef<DynamicFormHandle, Props>(function DynamicForm({ fields, values, onChange, readOnly }, ref) {
  const firstInvalidRef = useRef<HTMLDivElement | null>(null)

  useImperativeHandle(ref, () => ({
    validate: () => {
      const errors: string[] = []
      const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order)
      for (const field of sorted) {
        if (!field.required) continue
        const val = values[field.id]
        const empty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)
        if (empty) {
          errors.push(field.name)
        }
      }
      return errors
    }
  }))
  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order)

  function handleChange(id: string, val: any) {
    onChange({ ...values, [id]: val })
  }

  function handleMultiChange(id: string, option: string, checked: boolean) {
    const current: string[] = values[id] || []
    const next = checked ? [...current, option] : current.filter((o) => o !== option)
    onChange({ ...values, [id]: next })
  }

  if (readOnly) {
    return (
      <div className="space-y-3">
        {sorted.map((field) => (
          <div key={field.id} className="flex border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
            <span className="w-36 shrink-0 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
              {field.name}
            </span>
            <span className="text-sm text-gray-700">
              {field.type === 'multiselect'
                ? (values[field.id] || []).join('、')
                : field.type === 'select'
                  ? values[field.id] || '-'
                  : values[field.id] ?? '-'}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sorted.map((field) => (
        <div key={field.id}>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-primary)' }}>
            {field.name}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>

          {field.type === 'text' && (
            <input
              type="text"
              value={values[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)' }}
            />
          )}

          {field.type === 'number' && (
            <input
              type="number"
              value={values[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)' }}
            />
          )}

          {field.type === 'date' && (
            <input
              type="date"
              value={values[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)' }}
            />
          )}

          {field.type === 'textarea' && (
            <textarea
              value={values[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 resize-y"
              style={{ borderColor: 'var(--color-border)' }}
            />
          )}

          {field.type === 'select' && (
            <div className="flex flex-wrap gap-3">
              {(field.options || []).map((opt) => (
                <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={field.id}
                    checked={values[field.id] === opt}
                    onChange={() => handleChange(field.id, opt)}
                    className="accent-amber-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}

          {field.type === 'multiselect' && (
            <div className="flex flex-wrap gap-3">
              {(field.options || []).map((opt) => (
                <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(values[field.id] || []).includes(opt)}
                    onChange={(e) => handleMultiChange(field.id, opt, e.target.checked)}
                    className="accent-amber-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
})
