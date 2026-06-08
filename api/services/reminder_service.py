from uuid import uuid4
from api.database import get_db

REMIND_INTERVAL_SECONDS = 300


async def create_reminder(application_id, operator_id, operator_name="", reason=""):
    db = await get_db()
    cursor = await db.execute(
        "SELECT status FROM applications WHERE id = ?",
        (application_id,),
    )
    row = await cursor.fetchone()
    if not row:
        return "not_found"
    if row["status"] not in ("pending", "resubmitted"):
        return "not_remindable"

    cursor2 = await db.execute(
        "SELECT created_at FROM reminders WHERE application_id = ? ORDER BY rowid DESC LIMIT 1",
        (application_id,),
    )
    last_row = await cursor2.fetchone()
    if last_row:
        cursor3 = await db.execute(
            "SELECT CAST((julianday('now') - julianday(?)) * 86400 AS INTEGER) AS diff_seconds",
            (last_row["created_at"],),
        )
        diff_row = await cursor3.fetchone()
        if diff_row and diff_row["diff_seconds"] is not None and diff_row["diff_seconds"] < REMIND_INTERVAL_SECONDS:
            remaining = REMIND_INTERVAL_SECONDS - diff_row["diff_seconds"]
            return f"cooldown:{remaining}"

    if not operator_name:
        cursor4 = await db.execute("SELECT name FROM users WHERE id = ?", (operator_id,))
        user_row = await cursor4.fetchone()
        operator_name = user_row["name"] if user_row else ""

    remind_id = str(uuid4())
    await db.execute(
        "INSERT INTO reminders (id, application_id, operator_id, operator_name, reason) VALUES (?, ?, ?, ?, ?)",
        (remind_id, application_id, operator_id, operator_name, reason),
    )
    await db.execute(
        "UPDATE applications SET updated_at = datetime('now') WHERE id = ?",
        (application_id,),
    )
    log_id = str(uuid4())
    await db.execute(
        "INSERT INTO application_logs (id, application_id, action, operator_id, operator_name, remark) VALUES (?, ?, 'remind', ?, ?, ?)",
        (log_id, application_id, operator_id, operator_name, reason),
    )
    await db.commit()
    return remind_id


async def get_reminder_info(application_id):
    db = await get_db()
    cursor = await db.execute(
        "SELECT COUNT(*) as cnt FROM reminders WHERE application_id = ?",
        (application_id,),
    )
    count_row = await cursor.fetchone()
    remind_count = count_row["cnt"] if count_row else 0

    if remind_count == 0:
        return {
            "reminded": False,
            "remind_count": 0,
            "last_remind_at": "",
            "last_remind_reason": "",
        }

    cursor2 = await db.execute(
        "SELECT created_at, reason FROM reminders WHERE application_id = ? ORDER BY rowid DESC LIMIT 1",
        (application_id,),
    )
    last_row = await cursor2.fetchone()
    return {
        "reminded": True,
        "remind_count": remind_count,
        "last_remind_at": last_row["created_at"] if last_row else "",
        "last_remind_reason": last_row["reason"] or "" if last_row else "",
    }
