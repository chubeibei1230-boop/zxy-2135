import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit, Trash2, X, Check } from 'lucide-react'
import { getApplicationTypes, getFields, updateFields } from '@/api'
import type { ApplicationType, FieldType, FieldTypeType } from '@/types'

const typeLabels: Record<FieldTypeType, string> = {
  text: '文本', number: '数字', date: '日期', select: '单选', multiselect: '多选', textarea: '长文本',
}

export default function FieldConfig() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [appType, setAppType] = useState<ApplicationType | null>(null)
  const [fields, setFields] = useState<FieldType[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editField, setEditField] = useState<FieldType | null>(null)
  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] = useState<FieldTypeType>('text')
  const [fieldRequired, setFieldRequired] = useState(false)
  const [fieldOptions, setFieldOptions] = useState('')
  const [fieldSort, setFieldSort] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    try {
      const [types, config] = await Promise.all([
        getApplicationTypes(),
        getFields(id!),
      ])
      setAppType(types.find((t) => t.id === id) || null)
      setFields(config || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditField(null)
    setFieldName('')
    setFieldType('text')
    setFieldRequired(false)
    setFieldOptions('')
    setFieldSort(fields.length)
    setShowModal(true)
  }

  function openEdit(f: FieldType) {
    setEditField(f)
    setFieldName(f.name)
    setFieldType(f.type)
    setFieldRequired(f.required)
    setFieldOptions((f.options || []).join('\n'))
    setFieldSort(f.sort_order)
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      let updated: FieldType[]
      const newField: FieldType = {
        id: editField?.id || `f_${Date.now()}`,
        name: fieldName,
        type: fieldType,
        required: fieldRequired,
        options: ['select', 'multiselect'].includes(fieldType) ? fieldOptions.split('\n').filter(Boolean) : undefined,
        sort_order: fieldSort,
      }
      if (editField) {
        updated = fields.map((f) => (f.id === editField.id ? newField : f))
      } else {
        updated = [...fields, newField]
      }
      await updateFields(id!, updated)
      setFields(updated)
      setShowModal(false)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(fieldId: string) {
    if (!confirm('确定删除此字段？')) return
    const updated = fields.filter((f) => f.id !== fieldId)
    try {
      await updateFields(id!, updated)
      setFields(updated)
    } catch {
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">加载中...</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/types')} className="p-1 rounded hover:bg-gray-100" style={{ color: 'var(--color-primary)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
          {appType?.name || '申请类型'} - 字段配置
        </h2>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={openCreate} className="flex items-center gap-1 px-4 py-2 rounded text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
          <Plus size={16} /> 添加字段
        </button>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2" style={{ borderColor: 'var(--color-primary)' }}>
            <th className="text-left py-2 font-semibold" style={{ color: 'var(--color-primary)' }}>字段名</th>
            <th className="text-left py-2 font-semibold" style={{ color: 'var(--color-primary)' }}>类型</th>
            <th className="text-center py-2 font-semibold" style={{ color: 'var(--color-primary)' }}>必填</th>
            <th className="text-center py-2 font-semibold" style={{ color: 'var(--color-primary)' }}>排序</th>
            <th className="text-right py-2 font-semibold" style={{ color: 'var(--color-primary)' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {[...fields].sort((a, b) => a.sort_order - b.sort_order).map((f) => (
            <tr key={f.id} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
              <td className="py-2.5">{f.name}</td>
              <td className="py-2.5">
                <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                  {typeLabels[f.type]}
                </span>
              </td>
              <td className="py-2.5 text-center">{f.required ? <Check size={16} className="inline text-emerald-600" /> : <X size={16} className="inline text-gray-300" />}</td>
              <td className="py-2.5 text-center text-gray-500">{f.sort_order}</td>
              <td className="py-2.5 text-right">
                <button onClick={() => openEdit(f)} className="p-1 rounded hover:bg-gray-100 text-amber-600"><Edit size={14} /></button>
                <button onClick={() => handleDelete(f.id)} className="p-1 rounded hover:bg-gray-100 text-red-500 ml-1"><Trash2 size={14} /></button>
              </td>
            </tr>
          ))}
          {fields.length === 0 && (
            <tr><td colSpan={5} className="text-center py-8 text-gray-400">暂无字段</td></tr>
          )}
        </tbody>
      </table>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold" style={{ color: 'var(--color-primary)' }}>{editField ? '编辑字段' : '添加字段'}</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-primary)' }}>字段名</label>
                <input type="text" value={fieldName} onChange={(e) => setFieldName(e.target.value)} className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" style={{ borderColor: 'var(--color-border)' }} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-primary)' }}>类型</label>
                <select value={fieldType} onChange={(e) => setFieldType(e.target.value as FieldTypeType)} className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" style={{ borderColor: 'var(--color-border)' }}>
                  {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="required" checked={fieldRequired} onChange={(e) => setFieldRequired(e.target.checked)} className="accent-amber-600" />
                <label htmlFor="required" className="text-sm">必填</label>
              </div>
              {['select', 'multiselect'].includes(fieldType) && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-primary)' }}>选项（每行一个）</label>
                  <textarea value={fieldOptions} onChange={(e) => setFieldOptions(e.target.value)} rows={4} className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y" style={{ borderColor: 'var(--color-border)' }} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-primary)' }}>排序</label>
                <input type="number" value={fieldSort} onChange={(e) => setFieldSort(Number(e.target.value))} className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" style={{ borderColor: 'var(--color-border)' }} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="px-4 py-1.5 rounded text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-accent)' }}>{saving ? '保存中...' : '保存'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-1.5 rounded text-sm border" style={{ borderColor: 'var(--color-border)' }}>取消</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
