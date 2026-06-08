from fastapi import APIRouter, HTTPException
from api.models import ApproveRequest, RejectRequest
from api.services import approval_service

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


@router.get("")
async def list_approvals(status: str = None):
    return await approval_service.get_approvals(status=status)


@router.put("/{app_id}/approve")
async def approve_application(app_id: str, body: ApproveRequest):
    result = await approval_service.approve_application(app_id, body.supervisor_id)
    if result is None:
        raise HTTPException(status_code=404, detail="申请不存在")
    return {"ok": True}


@router.put("/{app_id}/reject")
async def reject_application(app_id: str, body: RejectRequest):
    result = await approval_service.reject_application(app_id, body.supervisor_id, body.reason)
    if result is None:
        raise HTTPException(status_code=404, detail="申请不存在")
    return {"ok": True}
