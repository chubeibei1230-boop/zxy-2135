from fastapi import APIRouter, HTTPException
from api.database import get_db
from api.models import LoginRequest, LoginResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    db = await get_db()
    cursor = await db.execute(
        "SELECT id, name, role FROM users WHERE employee_id = ? AND role = ?",
        (body.employee_id, body.role),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="用户名或角色不匹配")
    return LoginResponse(token=row["id"], role=row["role"], name=row["name"], id=row["id"])
