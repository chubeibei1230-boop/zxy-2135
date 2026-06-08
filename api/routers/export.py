from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from api.services import export_service

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("")
async def export_csv(
    application_type_id: str = None,
    status: str = None,
    start_date: str = None,
    end_date: str = None,
    is_urgent: str = None,
):
    urgent_filter = None
    if is_urgent is not None:
        urgent_filter = is_urgent == "1" or is_urgent.lower() == "true"
    csv_content = await export_service.export_csv(
        application_type_id=application_type_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
        is_urgent=urgent_filter,
    )
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=applications.csv"},
    )
