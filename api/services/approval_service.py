import json
from uuid import uuid4
from api.database import get_db


async def _build_status_filter(query, status_param, params):
    if not status_param:
        return query, params
    statuses = [s.strip() for s in status_param.split(",") if s.strip()]
    if not statuses:
        return query, params
    placeholders = ",".join(["?"] * len(statuses))
    query += f" AND a.status IN ({placeholders})"
    params.extend(statuses)
    return query, params


async def get_approvals(status=None, is_urgent=None):
    db = await get_db()
    query = """
        SELECT a.id, a.application_type_id, a.applicant_id, a.field_version,
               a.field_values_json, a.status, a.reject_reason, a.urgent, a.urgent_reason, a.created_at, a.updated_at,
               at.name as application_type_name, u.name as applicant_name
        FROM applications a
        JOIN application_types at ON a.application_type_id = at.id
        JOIN users u ON a.applicant_id = u.id
        WHERE 1=1
    """
    params = []
    query, params = await _build_status_filter(query, status, params)
    if is_urgent is not None:
        query += " AND a.urgent = ?"
        params.append(1 if is_urgent else 0)
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
        latest = await _get_latest_status_action(row["id"])
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
            "urgent": bool(row["urgent"]),
            "urgent_reason": row["urgent_reason"] or "",
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "latest_action": latest,
        })
    return result


async def approve_application(app_id, supervisor_id):
    db = await get_db()
    cursor = await db.execute(
        "SELECT status FROM applications WHERE id = ?",
        (app_id,),
    )
    row = await cursor.fetchone()
    if not row:
        return "not_found"
    if row["status"] == "withdrawn":
        return "withdrawn"
    if row["status"] not in ("pending", "resubmitted"):
        return "not_approvable"
    cursor2 = await db.execute("SELECT name FROM users WHERE id = ?", (supervisor_id,))
    user_row = await cursor2.fetchone()
    supervisor_name = user_row["name"] if user_row else ""
    log_id = str(uuid4())
    await db.execute(
        "UPDATE applications SET status = 'approved', updated_at = datetime('now') WHERE id = ?",
        (app_id,),
    )
    await db.execute(
        "INSERT INTO approval_logs (id, application_id, supervisor_id, action) VALUES (?, ?, ?, 'approve')",
        (log_id, app_id, supervisor_id),
    )
    app_log_id = str(uuid4())
    await db.execute(
        "INSERT INTO application_logs (id, application_id, action, operator_id, operator_name, remark) VALUES (?, ?, 'approve', ?, ?, '')",
        (app_log_id, app_id, supervisor_id, supervisor_name),
    )
    await db.commit()
    return "ok"


async def reject_application(app_id, supervisor_id, reason):
    db = await get_db()
    cursor = await db.execute(
        "SELECT status FROM applications WHERE id = ?",
        (app_id,),
    )
    row = await cursor.fetchone()
    if not row:
        return "not_found"
    if row["status"] == "withdrawn":
        return "withdrawn"
    if row["status"] not in ("pending", "resubmitted"):
        return "not_rejectable"
    cursor2 = await db.execute("SELECT name FROM users WHERE id = ?", (supervisor_id,))
    user_row = await cursor2.fetchone()
    supervisor_name = user_row["name"] if user_row else ""
    log_id = str(uuid4())
    await db.execute(
        "UPDATE applications SET status = 'rejected', reject_reason = ?, updated_at = datetime('now') WHERE id = ?",
        (reason, app_id),
    )
    await db.execute(
        "INSERT INTO approval_logs (id, application_id, supervisor_id, action, reason) VALUES (?, ?, ?, 'reject', ?)",
        (log_id, app_id, supervisor_id, reason),
    )
    app_log_id = str(uuid4())
    await db.execute(
        "INSERT INTO application_logs (id, application_id, action, operator_id, operator_name, remark) VALUES (?, ?, 'reject', ?, ?, ?)",
        (app_log_id, app_id, supervisor_id, supervisor_name, reason),
    )
    await db.commit()
    return "ok"


async def _get_latest_status_action(app_id):
    db = await get_db()
    cursor = await db.execute(
        "SELECT id, application_id, action, operator_id, operator_name, remark, created_at FROM application_logs WHERE application_id = ? AND action != 'supplement' ORDER BY rowid DESC LIMIT 1",
        (app_id,),
    )
    row = await cursor.fetchone()
    if not row:
        return None
    return {
        "id": row["id"],
        "application_id": row["application_id"],
        "action": row["action"],
        "operator_id": row["operator_id"],
        "operator_name": row["operator_name"],
        "remark": row["remark"] or "",
        "created_at": row["created_at"],
    }
