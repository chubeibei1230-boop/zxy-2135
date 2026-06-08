import json
from uuid import uuid4
from api.database import get_db


async def create_application(application_type_id, applicant_id, field_values):
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
    await db.commit()
    return app_id


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
    if status:
        query += " AND a.status = ?"
        params.append(status)
    query += " ORDER BY a.created_at DESC"
    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    result = []
    for row in rows:
        snapshot = await _get_field_snapshot(row["application_type_id"], row["field_version"])
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
    }


async def add_supplement(app_id, content):
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
    await db.commit()
    return note_id


async def resubmit_application(app_id):
    db = await get_db()
    cursor = await db.execute(
        "SELECT status FROM applications WHERE id = ?",
        (app_id,),
    )
    row = await cursor.fetchone()
    if not row or row["status"] != "rejected":
        return False
    await db.execute(
        "UPDATE applications SET status = 'pending', reject_reason = '', updated_at = datetime('now') WHERE id = ?",
        (app_id,),
    )
    await db.commit()
    return True


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
        "SELECT id, content, created_at FROM supplement_notes WHERE application_id = ? ORDER BY created_at",
        (app_id,),
    )
    rows = await cursor.fetchall()
    return [{"id": r["id"], "content": r["content"], "created_at": r["created_at"]} for r in rows]
