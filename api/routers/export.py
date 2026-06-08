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
):
    csv_content = await export_service.export_csv(
        application_type_id=application_type_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
    )
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=applications.csv"},
    )
