from fastapi import APIRouter, HTTPException
from api.models import ApproveRequest, RejectRequest
from api.services import approval_service

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


@router.get("")
async def list_approvals(status: str = None, is_urgent: str = None):
    urgent_filter = None
    if is_urgent is not None:
        urgent_filter = is_urgent == "1" or is_urgent.lower() == "true"
    return await approval_service.get_approvals(status=status, is_urgent=urgent_filter)


@router.put("/{app_id}/approve")
async def approve_application(app_id: str, body: ApproveRequest):
    result = await approval_service.approve_application(app_id, body.supervisor_id)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="申请不存在")
    if result == "withdrawn":
        raise HTTPException(status_code=400, detail="该申请已被撤回，无法审批")
    if result == "not_approvable":
        raise HTTPException(status_code=400, detail="该申请当前状态无法审批")
    return {"ok": True}


@router.put("/{app_id}/reject")
async def reject_application(app_id: str, body: RejectRequest):
    result = await approval_service.reject_application(app_id, body.supervisor_id, body.reason)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="申请不存在")
    if result == "withdrawn":
        raise HTTPException(status_code=400, detail="该申请已被撤回，无法驳回")
    if result == "not_rejectable":
        raise HTTPException(status_code=400, detail="该申请当前状态无法驳回")
    return {"ok": True}
