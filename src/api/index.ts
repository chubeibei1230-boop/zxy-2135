import type { Role, ApplicationType, FieldType, Application } from '@/types'

function getToken(): string {
  const raw = localStorage.getItem('user')
  if (!raw) return ''
  try {
    return JSON.parse(raw).token || ''
  } catch {
    return ''
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`/api${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.detail || err.message || `请求失败: ${res.status}`)
  }
  return res.json()
}

export async function authLogin(role: Role, employee_id: string) {
  return request<{ token: string; role: string; name: string; id: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ role, employee_id }),
  })
}

export async function getApplicationTypes() {
  return request<ApplicationType[]>('/application-types')
}

export async function createApplicationType(data: { name: string; description: string }) {
  return request<{ id: string }>('/application-types', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateApplicationType(id: string, data: { name: string; description: string }) {
  return request<{ ok: boolean }>(`/application-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteApplicationType(id: string) {
  return request<{ ok: boolean }>(`/application-types/${id}`, { method: 'DELETE' })
}

export async function getFields(applicationTypeId: string): Promise<FieldType[]> {
  return request<FieldType[]>(`/application-types/${applicationTypeId}/fields`)
}

export async function updateFields(applicationTypeId: string, fields: any[]) {
  return request<{ version: number }>(`/application-types/${applicationTypeId}/fields`, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  })
}

export async function createApplication(applicationTypeId: string, applicantId: string, fieldValues: Record<string, any>) {
  return request<{ id: string }>('/applications', {
    method: 'POST',
    body: JSON.stringify({ application_type_id: applicationTypeId, applicant_id: applicantId, field_values: fieldValues }),
  })
}

export async function getApplications(filters?: Record<string, string>) {
  const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
  return request<Application[]>(`/applications${qs}`)
}

export async function getApplication(id: string) {
  return request<Application>(`/applications/${id}`)
}

export async function supplementApplication(id: string, content: string, operatorId: string = '') {
  return request<{ id: string }>(`/applications/${id}/supplement`, {
    method: 'PUT',
    body: JSON.stringify({ content, operator_id: operatorId }),
  })
}

export async function resubmitApplication(id: string, applicantId: string = '') {
  return request<{ ok: boolean }>(`/applications/${id}/resubmit`, {
    method: 'PUT',
    body: JSON.stringify({ applicant_id: applicantId }),
  })
}

export async function withdrawApplication(id: string, applicantId: string, reason: string = '') {
  return request<{ ok: boolean }>(`/applications/${id}/withdraw`, {
    method: 'PUT',
    body: JSON.stringify({ applicant_id: applicantId, reason }),
  })
}

export async function getApprovals(filters?: Record<string, string>) {
  const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
  return request<Application[]>(`/approvals${qs}`)
}

export async function approveApplication(id: string, supervisorId: string) {
  return request<{ ok: boolean }>(`/approvals/${id}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ supervisor_id: supervisorId }),
  })
}

export async function rejectApplication(id: string, supervisorId: string, reason: string) {
  return request<{ ok: boolean }>(`/approvals/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ supervisor_id: supervisorId, reason }),
  })
}

export async function exportApplications(filters?: Record<string, string>) {
  const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
  const res = await fetch(`/api/export${qs}`)
  if (!res.ok) throw new Error('导出失败')
  return res.blob()
}
