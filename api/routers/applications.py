from fastapi import APIRouter, HTTPException
from api.models import ApplicationCreate, SupplementRequest, WithdrawRequest, ResubmitRequest, RemindRequest
from api.services import application_service
from api.services import reminder_service

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.post("", status_code=201)
async def create_application(body: ApplicationCreate):
    app_id = await application_service.create_application(
        body.application_type_id, body.applicant_id, body.field_values,
        urgent=body.urgent, urgent_reason=body.urgent_reason
    )
    if app_id is None:
        raise HTTPException(status_code=400, detail="申请类型不存在")
    return {"id": app_id}


@router.get("")
async def list_applications(applicant_id: str = None, status: str = None, is_urgent: str = None):
    urgent_filter = None
    if is_urgent is not None:
        urgent_filter = is_urgent == "1" or is_urgent.lower() == "true"
    return await application_service.get_applications(applicant_id=applicant_id, status=status, is_urgent=urgent_filter)


@router.get("/{app_id}")
async def get_application(app_id: str):
    app = await application_service.get_application(app_id)
    if not app:
        raise HTTPException(status_code=404, detail="申请不存在")
    return app


@router.put("/{app_id}/supplement")
async def supplement_application(app_id: str, body: SupplementRequest):
    note_id = await application_service.add_supplement(app_id, body.content, body.operator_id)
    return {"id": note_id}


@router.put("/{app_id}/resubmit")
async def resubmit_application(app_id: str, body: ResubmitRequest = None):
    operator_id = ""
    urgent = None
    urgent_reason = None
    if body:
        operator_id = body.applicant_id or ""
        urgent = body.urgent
        urgent_reason = body.urgent_reason
    ok = await application_service.resubmit_application(app_id, operator_id, urgent=urgent, urgent_reason=urgent_reason)
    if not ok:
        raise HTTPException(status_code=400, detail="只能重新提交被驳回的申请")
    return {"ok": True}


@router.put("/{app_id}/withdraw")
async def withdraw_application(app_id: str, body: WithdrawRequest):
    result = await application_service.withdraw_application(app_id, body.applicant_id, body.reason)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="申请不存在")
    if result == "not_owner":
        raise HTTPException(status_code=403, detail="只能撤回自己的申请")
    if result == "not_withdrawable":
        raise HTTPException(status_code=400, detail="只能撤回待审批状态的申请")
    return {"ok": True}


@router.put("/{app_id}/remind")
async def remind_application(app_id: str, body: RemindRequest):
    result = await reminder_service.create_reminder(app_id, body.operator_id, reason=body.reason)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="申请不存在")
    if result == "not_remindable":
        raise HTTPException(status_code=400, detail="只能对待审批或已重新提交状态的申请发起催办")
    if isinstance(result, str) and result.startswith("cooldown:"):
        remaining = result.split(":")[1]
        raise HTTPException(status_code=429, detail=f"操作过于频繁，请等待{remaining}秒后再试")
    return {"id": result}
