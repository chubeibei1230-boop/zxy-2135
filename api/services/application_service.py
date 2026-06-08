import json
from uuid import uuid4
from api.database import get_db


async def _add_log(application_id, action, operator_id, operator_name, remark=""):
    db = await get_db()
    log_id = str(uuid4())
    await db.execute(
        "INSERT INTO application_logs (id, application_id, action, operator_id, operator_name, remark) VALUES (?, ?, ?, ?, ?, ?)",
        (log_id, application_id, action, operator_id, operator_name, remark),
    )
    await db.commit()
    return log_id


async def _get_process_logs(app_id):
    db = await get_db()
    cursor = await db.execute(
        "SELECT id, application_id, action, operator_id, operator_name, remark, created_at FROM application_logs WHERE application_id = ? ORDER BY rowid",
        (app_id,),
    )
    rows = await cursor.fetchall()
    return [
        {
            "id": r["id"],
            "application_id": r["application_id"],
            "action": r["action"],
            "operator_id": r["operator_id"],
            "operator_name": r["operator_name"],
            "remark": r["remark"] or "",
            "created_at": r["created_at"],
        }
        for r in rows
    ]


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


async def create_application(application_type_id, applicant_id, field_values, applicant_name=""):
    db = await get_db()
    cursor = await db.execute(
        "SELECT version FROM application_types WHERE id = ?",
        (application_type_id,),
    )
    type_row = await cursor.fetchone()
    if not type_row:
        return None
    field_version = type_row["version"]
    app_id = str(uuid4())
    await db.execute(
        "INSERT INTO applications (id, application_type_id, applicant_id, field_version, field_values_json) VALUES (?, ?, ?, ?, ?)",
        (app_id, application_type_id, applicant_id, field_version, json.dumps(field_values, ensure_ascii=False)),
    )
    if not applicant_name:
        cursor2 = await db.execute("SELECT name FROM users WHERE id = ?", (applicant_id,))
        user_row = await cursor2.fetchone()
        applicant_name = user_row["name"] if user_row else ""
    log_id = str(uuid4())
    await db.execute(
        "INSERT INTO application_logs (id, application_id, action, operator_id, operator_name, remark) VALUES (?, ?, 'submit', ?, ?, '')",
        (log_id, app_id, applicant_id, applicant_name),
    )
    await db.commit()
    return app_id


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


async def get_applications(applicant_id=None, status=None):
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
    if applicant_id:
        query += " AND a.applicant_id = ?"
        params.append(applicant_id)
    query, params = await _build_status_filter(query, status, params)
    query += " ORDER BY a.created_at DESC"
    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    result = []
    for row in rows:
        snapshot = await _get_field_snapshot(row["application_type_id"], row["field_version"])
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
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "latest_action": latest,
        })
    return result


async def get_application(app_id):
    db = await get_db()
    cursor = await db.execute("""
        SELECT a.id, a.application_type_id, a.applicant_id, a.field_version,
               a.field_values_json, a.status, a.reject_reason, a.created_at, a.updated_at,
               at.name as application_type_name, u.name as applicant_name
        FROM applications a
        JOIN application_types at ON a.application_type_id = at.id
        JOIN users u ON a.applicant_id = u.id
        WHERE a.id = ?
    """, (app_id,))
    row = await cursor.fetchone()
    if not row:
        return None
    snapshot = await _get_field_snapshot(row["application_type_id"], row["field_version"])
    notes = await _get_supplement_notes(app_id)
    logs = await _get_process_logs(app_id)
    latest = await _get_latest_status_action(app_id)
    return {
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
        "supplement_notes": notes,
        "process_logs": logs,
        "latest_action": latest,
    }


async def add_supplement(app_id, content, operator_id, operator_name=""):
    db = await get_db()
    note_id = str(uuid4())
    await db.execute(
        "INSERT INTO supplement_notes (id, application_id, content) VALUES (?, ?, ?)",
        (note_id, app_id, content),
    )
    await db.execute(
        "UPDATE applications SET updated_at = datetime('now') WHERE id = ?",
        (app_id,),
    )
    if not operator_name:
        cursor = await db.execute("SELECT name FROM users WHERE id = ?", (operator_id,))
        user_row = await cursor.fetchone()
        operator_name = user_row["name"] if user_row else ""
    log_id = str(uuid4())
    await db.execute(
        "INSERT INTO application_logs (id, application_id, action, operator_id, operator_name, remark) VALUES (?, ?, 'supplement', ?, ?, ?)",
        (log_id, app_id, operator_id, operator_name, content),
    )
    await db.commit()
    return note_id


async def resubmit_application(app_id, operator_id, operator_name=""):
    db = await get_db()
    cursor = await db.execute(
        "SELECT status FROM applications WHERE id = ?",
        (app_id,),
    )
    row = await cursor.fetchone()
    if not row or row["status"] != "rejected":
        return False
    if not operator_name:
        cursor2 = await db.execute("SELECT name FROM users WHERE id = ?", (operator_id,))
        user_row = await cursor2.fetchone()
        operator_name = user_row["name"] if user_row else ""
    await db.execute(
        "UPDATE applications SET status = 'resubmitted', reject_reason = '', updated_at = datetime('now') WHERE id = ?",
        (app_id,),
    )
    log_id = str(uuid4())
    await db.execute(
        "INSERT INTO application_logs (id, application_id, action, operator_id, operator_name, remark) VALUES (?, ?, 'resubmit', ?, ?, '')",
        (log_id, app_id, operator_id, operator_name),
    )
    await db.commit()
    return True


async def withdraw_application(app_id, applicant_id, reason=""):
    db = await get_db()
    cursor = await db.execute(
        "SELECT status, applicant_id FROM applications WHERE id = ?",
        (app_id,),
    )
    row = await cursor.fetchone()
    if not row:
        return "not_found"
    if row["applicant_id"] != applicant_id:
        return "not_owner"
    if row["status"] not in ("pending", "resubmitted"):
        return "not_withdrawable"
    cursor2 = await db.execute("SELECT name FROM users WHERE id = ?", (applicant_id,))
    user_row = await cursor2.fetchone()
    operator_name = user_row["name"] if user_row else ""
    await db.execute(
        "UPDATE applications SET status = 'withdrawn', updated_at = datetime('now') WHERE id = ?",
        (app_id,),
    )
    log_id = str(uuid4())
    await db.execute(
        "INSERT INTO application_logs (id, application_id, action, operator_id, operator_name, remark) VALUES (?, ?, 'withdraw', ?, ?, ?)",
        (log_id, app_id, applicant_id, operator_name, reason),
    )
    await db.commit()
    return "ok"


async def _get_field_snapshot(application_type_id, field_version):
    db = await get_db()
    cursor = await db.execute(
        "SELECT fields_json FROM field_configs WHERE application_type_id = ? AND version = ?",
        (application_type_id, field_version),
    )
    row = await cursor.fetchone()
    if not row:
        return []
    return json.loads(row["fields_json"])


async def _get_supplement_notes(app_id):
    db = await get_db()
    cursor = await db.execute(
        "SELECT id, content, created_at FROM supplement_notes WHERE application_id = ? ORDER BY rowid",
        (app_id,),
    )
    rows = await cursor.fetchall()
    return [{"id": r["id"], "content": r["content"], "created_at": r["created_at"]} for r in rows]
