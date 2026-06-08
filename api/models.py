from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class LoginRequest(BaseModel):
    role: str
    employee_id: str


class LoginResponse(BaseModel):
    token: str
    role: str
    name: str
    id: str


class FieldConfig(BaseModel):
    id: str
    name: str
    type: str
    required: bool
    sort_order: int
    options: Optional[List[str]] = None


class ApplicationTypeCreate(BaseModel):
    name: str
    description: str = ""


class ApplicationTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ApplicationTypeResponse(BaseModel):
    id: str
    name: str
    description: str
    version: int
    field_count: int
    created_at: str
    updated_at: str


class FieldsUpdateRequest(BaseModel):
    fields: List[Dict[str, Any]]


class ApplicationCreate(BaseModel):
    application_type_id: str
    applicant_id: str
    field_values: Dict[str, Any] = {}


class ApplicationResponse(BaseModel):
    id: str
    application_type_id: str
    application_type_name: str
    applicant_id: str
    applicant_name: str
    field_version: int
    field_values: Dict[str, Any]
    field_snapshot: List[Dict[str, Any]]
    status: str
    reject_reason: str
    created_at: str
    updated_at: str
    supplement_notes: Optional[List[Dict[str, Any]]] = None
    process_logs: Optional[List[Dict[str, Any]]] = None
    latest_action: Optional[Dict[str, Any]] = None


class ApplicationListItem(BaseModel):
    id: str
    application_type_id: str
    application_type_name: str
    applicant_id: str
    applicant_name: str
    field_version: int
    field_values: Dict[str, Any]
    field_snapshot: List[Dict[str, Any]]
    status: str
    reject_reason: str
    created_at: str
    updated_at: str
    latest_action: Optional[Dict[str, Any]] = None


class SupplementRequest(BaseModel):
    content: str
    operator_id: str = ""


class ApproveRequest(BaseModel):
    supervisor_id: str


class RejectRequest(BaseModel):
    supervisor_id: str
    reason: str


class ApprovalLogItem(BaseModel):
    id: str
    application_id: str
    supervisor_id: str
    supervisor_name: str
    action: str
    reason: str
    created_at: str


class WithdrawRequest(BaseModel):
    applicant_id: str
    reason: str = ""


class ApplicationLogItem(BaseModel):
    id: str
    application_id: str
    action: str
    operator_id: str
    operator_name: str
    remark: str
    created_at: str
