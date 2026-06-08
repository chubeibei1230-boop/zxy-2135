from fastapi import APIRouter, HTTPException
from api.models import ApplicationTypeCreate, ApplicationTypeUpdate, ApplicationTypeResponse, FieldsUpdateRequest
from api.services import application_type_service

router = APIRouter(prefix="/api/application-types", tags=["application-types"])


@router.get("", response_model=list)
async def list_application_types():
    return await application_type_service.get_all_types()


@router.post("", status_code=201)
async def create_application_type(body: ApplicationTypeCreate):
    type_id = await application_type_service.create_type(body.name, body.description)
    return {"id": type_id}


@router.put("/{type_id}")
async def update_application_type(type_id: str, body: ApplicationTypeUpdate):
    await application_type_service.update_type(type_id, body.name, body.description)
    return {"ok": True}


@router.delete("/{type_id}")
async def delete_application_type(type_id: str):
    await application_type_service.delete_type(type_id)
    return {"ok": True}


@router.get("/{type_id}/fields")
async def get_fields(type_id: str):
    fields = await application_type_service.get_fields(type_id)
    if fields is None:
        raise HTTPException(status_code=404, detail="申请类型不存在")
    return fields


@router.post("/{type_id}/fields")
async def update_fields(type_id: str, body: FieldsUpdateRequest):
    new_version = await application_type_service.update_fields(type_id, body.fields)
    if new_version is None:
        raise HTTPException(status_code=404, detail="申请类型不存在")
    return {"version": new_version}
