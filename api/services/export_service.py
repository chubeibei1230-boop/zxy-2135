import json
import csv
import io
from api.database import get_db
from api.services import reminder_service


async def _get_latest_status_action(app_id):
    db = await get_db()
    cursor = await db.execute(
        "SELECT action, operator_name, remark, created_at FROM application_logs WHERE application_id = ? AND action != 'supplement' ORDER BY rowid DESC LIMIT 1",
        (app_id,),
    )
    row = await cursor.fetchone()
    if not row:
        return None
    return {
        "action": row["action"],
        "operator_name": row["operator_name"],
        "remark": row["remark"] or "",
        "created_at": row["created_at"],
    }


async def export_csv(application_type_id=None, status=None, start_date=None, end_date=None, is_urgent=None):
    db = await get_db()
    query = """
        SELECT a.id, a.application_type_id, a.applicant_id, a.field_version,
               a.field_values_json, a.status, a.urgent, a.urgent_reason, a.created_at,
               at.name as application_type_name, u.name as applicant_name
        FROM applications a
        JOIN application_types at ON a.application_type_id = at.id
        JOIN users u ON a.applicant_id = u.id
        WHERE 1=1
    """
    params = []
    if application_type_id:
        query += " AND a.application_type_id = ?"
        params.append(application_type_id)
    if status:
        statuses = [s.strip() for s in status.split(",") if s.strip()]
        if statuses:
            placeholders = ",".join(["?"] * len(statuses))
            query += f" AND a.status IN ({placeholders})"
            params.extend(statuses)
    if start_date:
        query += " AND a.created_at >= ?"
        params.append(start_date)
    if end_date:
        query += " AND a.created_at < date(?, '+1 day')"
        params.append(end_date)
    if is_urgent is not None:
        query += " AND a.urgent = ?"
        params.append(1 if is_urgent else 0)
    query += " ORDER BY a.created_at DESC"
    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()

    rows_data = []
    all_field_names_ordered = []

    for row in rows:
        fc_cursor = await db.execute(
            "SELECT fields_json FROM field_configs WHERE application_type_id = ? AND version = ?",
            (row["application_type_id"], row["field_version"]),
        )
        fc_row = await fc_cursor.fetchone()
        snapshot = json.loads(fc_row["fields_json"]) if fc_row else []
        field_values = json.loads(row["field_values_json"])

        for f in snapshot:
            if f["name"] not in all_field_names_ordered:
                all_field_names_ordered.append(f["name"])

        latest = await _get_latest_status_action(row["id"])
        remind_info = await reminder_service.get_reminder_info(row["id"])

        rows_data.append({
            "id": row["id"],
            "applicant_name": row["applicant_name"],
            "application_type_name": row["application_type_name"],
            "status": row["status"],
            "urgent": bool(row["urgent"]),
            "urgent_reason": row["urgent_reason"] or "",
            "created_at": row["created_at"],
            "snapshot": snapshot,
            "field_values": field_values,
            "latest_action": latest,
            "reminder_info": remind_info,
        })

    output = io.StringIO()
    base_headers = ["申请编号", "申请人", "申请类型", "状态", "是否加急", "加急原因", "是否被催办", "催办次数", "最后催办时间", "最后催办说明", "创建时间", "最近操作", "最近操作人", "最近操作说明"]
    headers = base_headers + all_field_names_ordered
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()

    status_map = {
        "pending": "待审批",
        "approved": "已通过",
        "rejected": "已驳回",
        "resubmitted": "已重新提交",
        "withdrawn": "已撤回",
    }

    action_map = {
        "submit": "提交",
        "approve": "审批通过",
        "reject": "驳回",
        "supplement": "补充说明",
        "resubmit": "重新提交",
        "withdraw": "撤回",
        "remind": "催办",
    }

    for rd in rows_data:
        latest = rd["latest_action"]
        ri = rd["reminder_info"]
        record = {
            "申请编号": rd["id"],
            "申请人": rd["applicant_name"],
            "申请类型": rd["application_type_name"],
            "状态": status_map.get(rd["status"], rd["status"]),
            "是否加急": "是" if rd["urgent"] else "否",
            "加急原因": rd["urgent_reason"],
            "是否被催办": "是" if ri["reminded"] else "否",
            "催办次数": str(ri["remind_count"]),
            "最后催办时间": ri["last_remind_at"],
            "最后催办说明": ri["last_remind_reason"],
            "创建时间": rd["created_at"],
            "最近操作": action_map.get(latest["action"], latest["action"]) if latest else "",
            "最近操作人": latest["operator_name"] if latest else "",
            "最近操作说明": latest["remark"] if latest else "",
        }
        for f in rd["snapshot"]:
            record[f["name"]] = rd["field_values"].get(f["id"], "")
        writer.writerow(record)

    return output.getvalue()
