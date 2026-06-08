export type Role = 'admin' | 'executor' | 'supervisor'
export type FieldTypeType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'textarea'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'resubmitted' | 'withdrawn'

export interface FieldType {
  id: string
  name: string
  type: FieldTypeType
  required: boolean
  options?: string[]
  sort_order: number
}

export interface ApplicationType {
  id: string
  name: string
  description: string
  version: number
  field_count?: number
  created_at: string
  updated_at: string
}

export interface FieldConfig {
  id: string
  application_type_id: string
  version: number
  fields: FieldType[]
  created_at: string
}

export interface ProcessLog {
  id: string
  application_id: string
  action: string
  operator_id: string
  operator_name: string
  remark: string
  created_at: string
}

export interface LatestAction {
  id: string
  application_id: string
  action: string
  operator_id: string
  operator_name: string
  remark: string
  created_at: string
}

export interface Application {
  id: string
  application_type_id: string
  application_type_name: string
  applicant_id: string
  applicant_name: string
  field_version: number
  field_snapshot: FieldType[]
  field_values: Record<string, any>
  status: ApplicationStatus
  supplement_notes: SupplementNote[]
  reject_reason?: string
  urgent: boolean
  urgent_reason: string
  created_at: string
  updated_at: string
  process_logs?: ProcessLog[]
  latest_action?: LatestAction
}

export interface SupplementNote {
  id: string
  application_id: string
  content: string
  created_at: string
}

export interface UserInfo {
  id: string
  token: string
  role: Role
  name: string
  employee_id: string
}
