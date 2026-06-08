import json
from uuid import uuid4
from api.database import get_db


async def get_all_types():
    db = await get_db()
    cursor = await db.execute("""
        SELECT at.id, at.name, at.description, at.version, at.created_at, at.updated_at,
               fc.fields_json
        FROM application_types at
        LEFT JOIN field_configs fc ON fc.application_type_id = at.id AND fc.version = at.version
        ORDER BY at.created_at DESC
    """)
    rows = await cursor.fetchall()
    result = []
    for row in rows:
        fields = json.loads(row["fields_json"]) if row["fields_json"] else []
        result.append({
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "version": row["version"],
            "field_count": len(fields),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        })
    return result


async def create_type(name, description):
    db = await get_db()
    type_id = str(uuid4())
    fc_id = str(uuid4())
    await db.execute(
        "INSERT INTO application_types (id, name, description) VALUES (?, ?, ?)",
        (type_id, name, description),
    )
    await db.execute(
        "INSERT INTO field_configs (id, application_type_id, version, fields_json) VALUES (?, ?, 1, '[]')",
        (fc_id, type_id),
    )
    await db.commit()
    return type_id


async def update_type(type_id, name, description):
    db = await get_db()
    sets = []
    params = []
    if name is not None:
        sets.append("name = ?")
        params.append(name)
    if description is not None:
        sets.append("description = ?")
        params.append(description)
    if not sets:
        return
    sets.append("updated_at = datetime('now')")
    params.append(type_id)
    await db.execute(
        f"UPDATE application_types SET {', '.join(sets)} WHERE id = ?",
        params,
    )
    await db.commit()


async def delete_type(type_id):
    db = await get_db()
    await db.execute("DELETE FROM field_configs WHERE application_type_id = ?", (type_id,))
    await db.execute("DELETE FROM application_types WHERE id = ?", (type_id,))
    await db.commit()


async def get_fields(type_id):
    db = await get_db()
    cursor = await db.execute(
        "SELECT version FROM application_types WHERE id = ?",
        (type_id,),
    )
    row = await cursor.fetchone()
    if not row:
        return None
    version = row["version"]
    cursor = await db.execute(
        "SELECT fields_json FROM field_configs WHERE application_type_id = ? AND version = ?",
        (type_id, version),
    )
    fc_row = await cursor.fetchone()
    if not fc_row:
        return []
    return json.loads(fc_row["fields_json"])


async def update_fields(type_id, fields):
    db = await get_db()
    cursor = await db.execute(
        "SELECT version FROM application_types WHERE id = ?",
        (type_id,),
    )
    row = await cursor.fetchone()
    if not row:
        return None
    new_version = row["version"] + 1
    fc_id = str(uuid4())
    await db.execute(
        "INSERT INTO field_configs (id, application_type_id, version, fields_json) VALUES (?, ?, ?, ?)",
        (fc_id, type_id, new_version, json.dumps(fields, ensure_ascii=False)),
    )
    await db.execute(
        "UPDATE application_types SET version = ?, updated_at = datetime('now') WHERE id = ?",
        (new_version, type_id),
    )
    await db.commit()
    return new_version
