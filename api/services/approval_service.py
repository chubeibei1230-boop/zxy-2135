import json
from uuid import uuid4
from api.database import get_db


async def get_approvals(status=None):
    db = await get_db()
    query = """
        SELECT a.id, a.application_type_id, a.applicant_id, a.field_version,
               a.field_values_json, a.status, a.reject_reason, a.created_at, a.updated_at,
               at.name as application_type_name, u.name as applicant_name
        FROM applications a
        JOIN application_types at ON a.application_type_id = at.id
        JOIN users u ON a.applicant_id = u.id
        WHERE 1=1
    """
    params = []
    if status:
        if status == "pending":
            query += " AND a.status IN ('pending', 'resubmitted')"
        else:
            query += " AND a.status = ?"
            params.append(status)
    query += " ORDER BY a.created_at DESC"
    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    result = []
    for row in rows:
        cursor2 = await db.execute(
            "SELECT fields_json FROM field_configs WHERE application_type_id = ? AND version = ?",
            (row["application_type_id"], row["field_version"]),
        )
        fc_row = await cursor2.fetchone()
        snapshot = json.loads(fc_row["fields_json"]) if fc_row else []
        result.append({
            "id": row["id"],
            "application_type_id": row["application_type_id"],
            "application_type_name": row["application_type_name"],
            "applicant_id": row["applicant_id"],
            "applicant_name": row["applicant_name"],
            "field_version": row["field_version"],
            "field_values": json.loads(row["field_values_json"]),
            "field_snapshot": snapshot,
            "status": row["status"],
            "reject_reason": row["reject_reason"] or "",
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        })
    return result


async def approve_application(app_id, supervisor_id):
    db = await get_db()
    cursor = await db.execute(
        "SELECT status FROM applications WHERE id = ?",
        (app_id,),
    )
    row = await cursor.fetchone()
    if not row or row["status"] not in ("pending", "resubmitted"):
        return None
    log_id = str(uuid4())
    await db.execute(
        "UPDATE applications SET status = 'approved', updated_at = datetime('now') WHERE id = ?",
        (app_id,),
    )
    await db.execute(
        "INSERT INTO approval_logs (id, application_id, supervisor_id, action) VALUES (?, ?, ?, 'approve')",
        (log_id, app_id, supervisor_id),
    )
    await db.commit()
    return True


async def reject_application(app_id, supervisor_id, reason):
    db = await get_db()
    cursor = await db.execute(
        "SELECT status FROM applications WHERE id = ?",
        (app_id,),
    )
    row = await cursor.fetchone()
    if not row or row["status"] not in ("pending", "resubmitted"):
        return None
    log_id = str(uuid4())
    await db.execute(
        "UPDATE applications SET status = 'rejected', reject_reason = ?, updated_at = datetime('now') WHERE id = ?",
        (reason, app_id),
    )
    await db.execute(
        "INSERT INTO approval_logs (id, application_id, supervisor_id, action, reason) VALUES (?, ?, ?, 'reject', ?)",
        (log_id, app_id, supervisor_id, reason),
    )
    await db.commit()
    return True
