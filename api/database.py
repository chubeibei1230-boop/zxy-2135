import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app.db")

_db = None


async def get_db():
    global _db
    if _db is None:
        _db = await aiosqlite.connect(DB_PATH)
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA foreign_keys=ON")
    return _db


async def close_db():
    global _db
    if _db is not None:
        await _db.close()
        _db = None


async def init_db():
    db = await get_db()
    await db.executescript("""
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'executor', 'supervisor'))
);

CREATE TABLE IF NOT EXISTS application_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS field_configs (
    id TEXT PRIMARY KEY,
    application_type_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    fields_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (application_type_id) REFERENCES application_types(id)
);

CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    application_type_id TEXT NOT NULL,
    applicant_id TEXT NOT NULL,
    field_version INTEGER NOT NULL,
    field_values_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'resubmitted', 'withdrawn')),
    reject_reason TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (application_type_id) REFERENCES application_types(id),
    FOREIGN KEY (applicant_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS supplement_notes (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id)
);

CREATE TABLE IF NOT EXISTS approval_logs (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    supervisor_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('approve', 'reject', 'withdraw', 'supplement', 'resubmit', 'submit')),
    reason TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id),
    FOREIGN KEY (supervisor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS application_logs (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('submit', 'approve', 'reject', 'supplement', 'resubmit', 'withdraw')),
    operator_id TEXT NOT NULL,
    operator_name TEXT NOT NULL DEFAULT '',
    remark TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id),
    FOREIGN KEY (operator_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_type ON applications(application_type_id);
CREATE INDEX IF NOT EXISTS idx_field_configs_type_version ON field_configs(application_type_id, version);
CREATE INDEX IF NOT EXISTS idx_supplement_notes_application ON supplement_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_application ON approval_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_application_logs_application ON application_logs(application_id);
""")
    cursor = await db.execute("SELECT COUNT(*) FROM users")
    row = await cursor.fetchone()
    if row[0] == 0:
        await db.executescript("""
INSERT INTO users (id, employee_id, name, role) VALUES
    ('u1', 'A001', '张管理', 'admin'),
    ('u2', 'E001', '李执行', 'executor'),
    ('u3', 'S001', '王监督', 'supervisor'),
    ('u4', 'E002', '赵执行', 'executor');

INSERT INTO application_types (id, name, description, version) VALUES
    ('at1', '设备采购申请', '用于申请采购办公设备及用品', 1);

INSERT INTO field_configs (id, application_type_id, version, fields_json) VALUES
    ('fc1', 'at1', 1, '[{"id":"f1","name":"设备名称","type":"text","required":true,"sort_order":1},{"id":"f2","name":"数量","type":"number","required":true,"sort_order":2},{"id":"f3","name":"期望到货日期","type":"date","required":true,"sort_order":3},{"id":"f4","name":"紧急程度","type":"select","required":true,"options":["普通","紧急","特急"],"sort_order":4},{"id":"f5","name":"用途说明","type":"textarea","required":false,"sort_order":5}]');
""")
    await db.commit()


async def reset_db():
    await close_db()
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    await init_db()
