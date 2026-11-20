"""Lapisan akses database MySQL untuk aplikasi Pomo.
Menggunakan mysql-connector-python dengan query berparameter (mencegah SQL Injection).
Kompatibel dengan MySQL dan MariaDB lokal (XAMPP).
"""
import os
import sys
import time
import uuid
from contextlib import contextmanager
from datetime import date

import mysql.connector
from mysql.connector import Error

BASE_DIR = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))

CONFIG = {
    "host": os.getenv("POMO_DB_HOST", "localhost"),
    "port": int(os.getenv("POMO_DB_PORT", "3306")),
    "user": os.getenv("POMO_DB_USER", "root"),
    "password": os.getenv("POMO_DB_PASSWORD", ""),
    "database": os.getenv("POMO_DB_NAME", "pomo_db"),
}

COLORS = ("green", "orange", "blue", "purple", "pink")
PRIORITIES = ("low", "normal", "high")
SCENES = ("forest", "sunset", "night")
RATINGS = ("understood", "unsure", "repeat")
PLAN_STATUSES = ("todo", "done", "skipped")
REVIEW_STATUSES = ("pending", "done")
DISTRACTION_CATEGORIES = ("phone", "social", "environment", "difficult", "tired", "other")


class ValidationError(Exception):
    """Dilempar ketika data tidak memenuhi aturan validasi."""


def get_connection():
    """Membuka koneksi ke database MySQL."""
    return mysql.connector.connect(**CONFIG)


@contextmanager
def cursor(commit=False):
    """Context manager untuk mengelola koneksi dan cursor secara aman."""
    db = get_connection()
    cur = db.cursor(dictionary=True)
    try:
        yield cur
        if commit:
            db.commit()
    except Error:
        db.rollback()
        raise
    finally:
        cur.close()
        db.close()


def find_schema_path():
    """Mencari file schema.sql di berbagai kemungkinan direktori."""
    candidates = [
        os.path.join(BASE_DIR, "schema.sql"),
        os.path.join(BASE_DIR, "proejk_eapp", "schema.sql"),
        os.path.join(os.path.dirname(BASE_DIR), "files", "schema.sql"),
        os.path.abspath("schema.sql"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return os.path.join(BASE_DIR, "schema.sql")


def init_database():
    """Membuat database dan seluruh 9 tabel dari schema.sql jika belum ada."""
    schema_file = find_schema_path()
    if not os.path.isfile(schema_file):
        raise FileNotFoundError(f"File skema tidak ditemukan di {schema_file}")

    config = {k: v for k, v in CONFIG.items() if k != "database"}
    with open(schema_file, encoding="utf-8") as file:
        statements = [s.strip() for s in file.read().split(";") if s.strip()]

    db = mysql.connector.connect(**config)
    try:
        cur = db.cursor()
        for statement in statements:
            cur.execute(statement)
        db.commit()
        cur.close()
    finally:
        db.close()


def check_connection():
    """Memeriksa status koneksi ke MySQL dan menghitung jumlah record di tiap tabel."""
    with cursor() as cur:
        cur.execute("SELECT DATABASE() AS name, VERSION() AS version")
        info = cur.fetchone() or {}

        counts = {}
        for tbl in ("courses", "topics", "reviews", "sessions", "plans", "checkpoints", "distractions", "interruptions", "preferences"):
            try:
                cur.execute(f"SELECT COUNT(*) AS total FROM {tbl}")
                counts[tbl] = cur.fetchone()["total"]
            except Exception:
                counts[tbl] = 0

        return {
            "status": "connected",
            "name": info.get("name", CONFIG["database"]),
            "version": info.get("version", "unknown"),
            "host": CONFIG["host"],
            "port": CONFIG["port"],
            "counts": counts,
        }


def new_id(prefix):
    return f"{prefix}-{uuid.uuid4()}"


def now_ms():
    return int(time.time() * 1000)


def text(value, maximum, label, required=False):
    if value is None:
        value = ""
    if not isinstance(value, str):
        value = str(value)
    if len(value) > maximum:
        raise ValidationError(f"{label} tidak valid (maksimal {maximum} karakter).")
    value = value.strip()
    if required and not value:
        raise ValidationError(f"{label} tidak boleh kosong.")
    return value


def integer(value, low, high, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValidationError(f"{label} harus berupa bilangan {low}-{high}.")
    val = int(value)
    if not low <= val <= high:
        raise ValidationError(f"{label} harus berupa bilangan {low}-{high}.")
    return val


def iso_date(value, optional=False):
    if optional and not value:
        return None
    if isinstance(value, date):
        return value.isoformat()
    try:
        return date.fromisoformat(str(value).strip()).isoformat()
    except (TypeError, ValueError):
        raise ValidationError("Tanggal tidak valid (gunakan format YYYY-MM-DD).")


def clean(row):
    """Mengubah tipe date, bigint timestamp, dan tinyint boolean ke format JSON-friendly."""
    if not row:
        return row
    result = {}
    for key, value in row.items():
        if isinstance(value, date):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result


# ---------- 1. Mata Pelajaran (courses) ----------
COURSE_COLUMNS = "id, name, goal, color, created_at AS createdAt"


def list_courses():
    with cursor() as cur:
        cur.execute(f"SELECT {COURSE_COLUMNS} FROM courses ORDER BY created_at ASC")
        return [clean(r) for r in cur.fetchall()]


def save_course(data):
    name = text(data.get("name"), 100, "Nama mata pelajaran", True)
    goal = text(data.get("goal", ""), 1000, "Tujuan")
    color = data.get("color", "green")
    if color not in COLORS:
        raise ValidationError(f"Warna tidak valid ({', '.join(COLORS)}).")
    course_id = data.get("id") or new_id("course")
    created_at = int(data.get("createdAt") or now_ms())

    with cursor(commit=True) as cur:
        cur.execute("SELECT id FROM courses WHERE id = %s", (course_id,))
        if cur.fetchone():
            cur.execute(
                "UPDATE courses SET name=%s, goal=%s, color=%s WHERE id=%s",
                (name, goal, color, course_id),
            )
        else:
            cur.execute(
                "INSERT INTO courses (id, name, goal, color, created_at) VALUES (%s, %s, %s, %s, %s)",
                (course_id, name, goal, color, created_at),
            )
    return course_id


def delete_course(course_id):
    with cursor(commit=True) as cur:
        cur.execute("DELETE FROM courses WHERE id = %s", (course_id,))
        return cur.rowcount > 0


# ---------- 2. Materi (topics) ----------
TOPIC_COLUMNS = (
    "id, course_id AS courseId, title, estimate, deadline, priority, notes, "
    "outcome, status, created_at AS createdAt, completed_at AS completedAt"
)


def list_topics(course_id=None):
    sql = f"SELECT {TOPIC_COLUMNS} FROM topics"
    params = ()
    if course_id:
        sql += " WHERE course_id = %s"
        params = (course_id,)
    with cursor() as cur:
        cur.execute(sql + " ORDER BY deadline IS NULL, deadline ASC, created_at ASC", params)
        rows = [clean(r) for r in cur.fetchall()]
        for r in rows:
            if r.get("deadline") is None:
                r["deadline"] = ""
        return rows


def save_topic(data):
    course_id = text(data.get("courseId"), 100, "Mata pelajaran", True)
    title = text(data.get("title"), 160, "Judul materi", True)
    estimate = integer(data.get("estimate"), 1, 6000, "Estimasi belajar")
    deadline = iso_date(data.get("deadline"), optional=True)
    priority = data.get("priority", "normal")
    if priority not in PRIORITIES:
        raise ValidationError("Prioritas tidak valid (low, normal, high).")
    notes = text(data.get("notes", ""), 4000, "Catatan materi")
    outcome = text(data.get("outcome", ""), 1000, "Target pemahaman")
    status = data.get("status", "active")
    if status not in ("active", "completed"):
        status = "active"

    topic_id = data.get("id") or new_id("topic")
    created_at = int(data.get("createdAt") or now_ms())
    completed_at = data.get("completedAt")
    if completed_at is not None:
        completed_at = int(completed_at)

    with cursor(commit=True) as cur:
        cur.execute("SELECT id FROM courses WHERE id = %s", (course_id,))
        if not cur.fetchone():
            raise ValidationError("Mata pelajaran untuk materi ini tidak ditemukan.")

        cur.execute("SELECT id FROM topics WHERE id = %s", (topic_id,))
        if cur.fetchone():
            cur.execute(
                "UPDATE topics SET course_id=%s, title=%s, estimate=%s, deadline=%s, "
                "priority=%s, notes=%s, outcome=%s, status=%s, completed_at=%s WHERE id=%s",
                (course_id, title, estimate, deadline, priority, notes, outcome, status, completed_at, topic_id),
            )
        else:
            cur.execute(
                "INSERT INTO topics (id, course_id, title, estimate, deadline, priority, notes, outcome, status, created_at, completed_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (topic_id, course_id, title, estimate, deadline, priority, notes, outcome, status, created_at, completed_at),
            )
    return topic_id


def set_topic_completed(topic_id, completed):
    with cursor(commit=True) as cur:
        status = "completed" if completed else "active"
        completed_at = now_ms() if completed else None
        cur.execute("UPDATE topics SET status=%s, completed_at=%s WHERE id=%s", (status, completed_at, topic_id))
        return cur.rowcount > 0


def delete_topic(topic_id):
    with cursor(commit=True) as cur:
        cur.execute("DELETE FROM topics WHERE id = %s", (topic_id,))
        return cur.rowcount > 0


# ---------- 3. Jadwal Pengulangan (reviews) ----------
REVIEW_COLUMNS = (
    "id, topic_id AS topicId, due, stage, status, note, "
    "created_at AS createdAt, completed_at AS completedAt"
)


def list_reviews(topic_id=None):
    sql = f"SELECT {REVIEW_COLUMNS} FROM reviews"
    params = ()
    if topic_id:
        sql += " WHERE topic_id = %s"
        params = (topic_id,)
    with cursor() as cur:
        cur.execute(sql + " ORDER BY due ASC, stage ASC", params)
        rows = [clean(r) for r in cur.fetchall()]
        for r in rows:
            if r.get("note") is None:
                r["note"] = ""
        return rows


def save_review(data):
    topic_id = text(data.get("topicId"), 100, "Materi pengulangan", True)
    due = iso_date(data.get("due"), optional=False)
    stage = integer(data.get("stage", 0), 0, 4, "Tahap pengulangan")
    status = data.get("status", "pending")
    if status not in REVIEW_STATUSES:
        status = "pending"
    note = text(data.get("note", ""), 1000, "Catatan pengulangan")
    review_id = data.get("id") or new_id("review")
    created_at = int(data.get("createdAt") or now_ms())
    completed_at = data.get("completedAt")
    if completed_at is not None:
        completed_at = int(completed_at)

    with cursor(commit=True) as cur:
        cur.execute("SELECT id FROM topics WHERE id = %s", (topic_id,))
        if not cur.fetchone():
            raise ValidationError("Materi untuk jadwal pengulangan ini tidak ditemukan.")

        cur.execute("SELECT id FROM reviews WHERE id = %s", (review_id,))
        if cur.fetchone():
            cur.execute(
                "UPDATE reviews SET topic_id=%s, due=%s, stage=%s, status=%s, note=%s, completed_at=%s WHERE id=%s",
                (topic_id, due, stage, status, note, completed_at, review_id),
            )
        else:
            cur.execute(
                "INSERT INTO reviews (id, topic_id, due, stage, status, note, created_at, completed_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (review_id, topic_id, due, stage, status, note, created_at, completed_at),
            )
    return review_id


def delete_review(review_id):
    with cursor(commit=True) as cur:
        cur.execute("DELETE FROM reviews WHERE id = %s", (review_id,))
        return cur.rowcount > 0


# ---------- 4. Sesi Fokus (sessions) ----------
SESSION_COLUMNS = (
    "id, session_date AS date, started_at AS startedAt, ended_at AS endedAt, "
    "duration, title, course_name AS courseName, topic_id AS topicId, "
    "plan_id AS planId, review_id AS reviewId, is_sample AS sample"
)


def list_sessions(limit=1000):
    limit = integer(limit, 1, 10000, "Batas data sesi")
    with cursor() as cur:
        cur.execute(f"SELECT {SESSION_COLUMNS} FROM sessions ORDER BY ended_at DESC LIMIT %s", (limit,))
        rows = [clean(r) for r in cur.fetchall()]
        for r in rows:
            r["sample"] = bool(r.get("sample", 0))
            if r.get("courseName") is None:
                r["courseName"] = ""
        return rows


def save_session(data):
    session_id = data.get("id") or new_id("timer")
    date_val = iso_date(data.get("date"))
    started_at = integer(data.get("startedAt"), 0, 8_640_000_000_000_000, "Waktu mulai")
    ended_at = integer(data.get("endedAt"), 0, 8_640_000_000_000_000, "Waktu selesai")
    duration = integer(data.get("duration"), 1, 120, "Durasi sesi")
    title = text(data.get("title"), 160, "Judul sesi", True)
    course_name = text(data.get("courseName", ""), 100, "Nama mata pelajaran")
    topic_id = data.get("topicId") or None
    plan_id = data.get("planId") or None
    review_id = data.get("reviewId") or None
    is_sample = 1 if data.get("sample") else 0

    with cursor(commit=True) as cur:
        if topic_id:
            cur.execute("SELECT id FROM topics WHERE id = %s", (topic_id,))
            if not cur.fetchone():
                topic_id = None
        if review_id:
            cur.execute("SELECT id FROM reviews WHERE id = %s", (review_id,))
            if not cur.fetchone():
                review_id = None

        cur.execute("SELECT id FROM sessions WHERE id = %s", (session_id,))
        if cur.fetchone():
            return session_id

        cur.execute(
            "INSERT INTO sessions (id, session_date, started_at, ended_at, duration, title, course_name, topic_id, plan_id, review_id, is_sample) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (session_id, date_val, started_at, ended_at, duration, title, course_name, topic_id, plan_id, review_id, is_sample),
        )
    return session_id


def delete_sample_sessions():
    with cursor(commit=True) as cur:
        cur.execute("DELETE FROM sessions WHERE is_sample = TRUE")
        return cur.rowcount


def summary_for(day):
    day = iso_date(day)
    with cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) AS sessions, COALESCE(SUM(duration), 0) AS minutes "
            "FROM sessions WHERE session_date = %s AND is_sample = FALSE",
            (day,),
        )
        row = cur.fetchone() or {"sessions": 0, "minutes": 0}
        return {"date": day, "sessions": int(row["sessions"]), "minutes": int(row["minutes"])}


# ---------- 5. Rencana Belajar (plans) ----------
PLAN_COLUMNS = (
    "id, topic_id AS topicId, review_id AS reviewId, plan_date AS date, "
    "minutes, status, reason, title, created_at AS createdAt, session_id AS sessionId"
)


def list_plans(plan_date=None):
    sql = f"SELECT {PLAN_COLUMNS} FROM plans"
    params = ()
    if plan_date:
        sql += " WHERE plan_date = %s"
        params = (iso_date(plan_date),)
    with cursor() as cur:
        cur.execute(sql + " ORDER BY plan_date ASC, created_at ASC", params)
        rows = [clean(r) for r in cur.fetchall()]
        for r in rows:
            if r.get("reason") is None:
                r["reason"] = ""
        return rows


def save_plan(data):
    topic_id = text(data.get("topicId"), 100, "Materi rencana", True)
    review_id = data.get("reviewId") or None
    plan_date = iso_date(data.get("date"), optional=False)
    minutes = integer(data.get("minutes"), 1, 120, "Durasi rencana")
    status = data.get("status", "todo")
    if status not in PLAN_STATUSES:
        status = "todo"
    reason = text(data.get("reason", ""), 300, "Alasan prioritas")
    title = text(data.get("title", "Materi belajar"), 160, "Judul rencana", True)
    plan_id = data.get("id") or new_id("plan")
    created_at = int(data.get("createdAt") or now_ms())
    session_id = data.get("sessionId") or None

    with cursor(commit=True) as cur:
        cur.execute("SELECT id FROM topics WHERE id = %s", (topic_id,))
        if not cur.fetchone():
            raise ValidationError("Materi pada rencana ini tidak ditemukan.")

        if review_id:
            cur.execute("SELECT id FROM reviews WHERE id = %s", (review_id,))
            if not cur.fetchone():
                review_id = None
        if session_id:
            cur.execute("SELECT id FROM sessions WHERE id = %s", (session_id,))
            if not cur.fetchone():
                session_id = None

        cur.execute("SELECT id FROM plans WHERE id = %s", (plan_id,))
        if cur.fetchone():
            cur.execute(
                "UPDATE plans SET topic_id=%s, review_id=%s, plan_date=%s, minutes=%s, status=%s, reason=%s, title=%s, session_id=%s WHERE id=%s",
                (topic_id, review_id, plan_date, minutes, status, reason, title, session_id, plan_id),
            )
        else:
            cur.execute(
                "INSERT INTO plans (id, topic_id, review_id, plan_date, minutes, status, reason, title, created_at, session_id) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (plan_id, topic_id, review_id, plan_date, minutes, status, reason, title, created_at, session_id),
            )
    return plan_id


def delete_plan(plan_id):
    with cursor(commit=True) as cur:
        cur.execute("DELETE FROM plans WHERE id = %s", (plan_id,))
        return cur.rowcount > 0


# ---------- 6. Checkpoints Pemahaman ----------
CHECKPOINT_COLUMNS = (
    "id, session_id AS sessionId, topic_id AS topicId, title, summary, "
    "rating, submitted, created_at AS createdAt, updated_at AS updatedAt, completed_topic AS completedTopic"
)


def list_checkpoints():
    with cursor() as cur:
        cur.execute(f"SELECT {CHECKPOINT_COLUMNS} FROM checkpoints ORDER BY created_at DESC")
        rows = [clean(r) for r in cur.fetchall()]
        for r in rows:
            r["submitted"] = bool(r.get("submitted", 0))
            r["completedTopic"] = bool(r.get("completedTopic", 0))
            if r.get("summary") is None:
                r["summary"] = ""
        return rows


def save_checkpoint(data):
    session_id = text(data.get("sessionId"), 100, "Sesi checkpoint", True)
    topic_id = data.get("topicId") or None
    title = text(data.get("title", "Checkpoint"), 160, "Materi checkpoint", True)
    summary = text(data.get("summary", ""), 4000, "Ringkasan pemahaman")
    rating = data.get("rating") or None
    if rating and rating not in RATINGS:
        rating = None
    submitted = 1 if data.get("submitted") else 0
    completed_topic = 1 if data.get("completedTopic") else 0
    cp_id = data.get("id") or new_id("checkpoint")
    created_at = int(data.get("createdAt") or now_ms())
    updated_at = data.get("updatedAt")
    if updated_at is not None:
        updated_at = int(updated_at)

    with cursor(commit=True) as cur:
        cur.execute("SELECT id FROM sessions WHERE id = %s", (session_id,))
        if not cur.fetchone():
            raise ValidationError("Sesi untuk checkpoint ini tidak ditemukan.")

        if topic_id:
            cur.execute("SELECT id FROM topics WHERE id = %s", (topic_id,))
            if not cur.fetchone():
                topic_id = None

        cur.execute("SELECT id FROM checkpoints WHERE id = %s OR session_id = %s", (cp_id, session_id))
        row = cur.fetchone()
        if row:
            real_id = row["id"]
            cur.execute(
                "UPDATE checkpoints SET topic_id=%s, title=%s, summary=%s, rating=%s, submitted=%s, updated_at=%s, completed_topic=%s WHERE id=%s",
                (topic_id, title, summary, rating, submitted, updated_at or now_ms(), completed_topic, real_id),
            )
            return real_id
        else:
            cur.execute(
                "INSERT INTO checkpoints (id, session_id, topic_id, title, summary, rating, submitted, created_at, updated_at, completed_topic) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (cp_id, session_id, topic_id, title, summary, rating, submitted, created_at, updated_at, completed_topic),
            )
            return cp_id


def delete_checkpoint(cp_id):
    with cursor(commit=True) as cur:
        cur.execute("DELETE FROM checkpoints WHERE id = %s", (cp_id,))
        return cur.rowcount > 0


# ---------- 7. Hambatan Belajar (distractions) ----------
DISTRACTION_COLUMNS = "id, topic_id AS topicId, timer_id AS timerId, barrier_date AS date, category, note, created_at AS createdAt"


def list_distractions():
    with cursor() as cur:
        cur.execute(f"SELECT {DISTRACTION_COLUMNS} FROM distractions ORDER BY created_at DESC")
        rows = [clean(r) for r in cur.fetchall()]
        for r in rows:
            if r.get("note") is None:
                r["note"] = ""
        return rows


def save_distraction(data):
    topic_id = data.get("topicId") or None
    timer_id = data.get("timerId") or None
    barrier_date = iso_date(data.get("date"), optional=False)
    category = data.get("category", "other")
    if category not in DISTRACTION_CATEGORIES:
        category = "other"
    note = text(data.get("note", ""), 1000, "Catatan hambatan")
    dist_id = data.get("id") or new_id("distraction")
    created_at = int(data.get("createdAt") or now_ms())

    with cursor(commit=True) as cur:
        if topic_id:
            cur.execute("SELECT id FROM topics WHERE id = %s", (topic_id,))
            if not cur.fetchone():
                topic_id = None

        cur.execute(
            "INSERT INTO distractions (id, topic_id, timer_id, barrier_date, category, note, created_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (dist_id, topic_id, timer_id, barrier_date, category, note, created_at),
        )
    return dist_id


# ---------- 8. Sesi Terhenti (interruptions) ----------
INTERRUPTION_COLUMNS = (
    "id, topic_id AS topicId, title, stop_date AS date, reason, "
    "elapsed_seconds AS elapsedSeconds, created_at AS createdAt"
)


def list_interruptions():
    with cursor() as cur:
        cur.execute(f"SELECT {INTERRUPTION_COLUMNS} FROM interruptions ORDER BY created_at DESC")
        return [clean(r) for r in cur.fetchall()]


def save_interruption(data):
    topic_id = data.get("topicId") or None
    title = text(data.get("title", "Sesi fokus"), 160, "Judul sesi", True)
    stop_date = iso_date(data.get("date"), optional=False)
    reason = text(data.get("reason", "Reset timer"), 100, "Alasan terhenti", True)
    elapsed = integer(data.get("elapsedSeconds", 0), 0, 7200, "Waktu terhenti")
    int_id = data.get("id") or new_id("interruption")
    created_at = int(data.get("createdAt") or now_ms())

    with cursor(commit=True) as cur:
        if topic_id:
            cur.execute("SELECT id FROM topics WHERE id = %s", (topic_id,))
            if not cur.fetchone():
                topic_id = None

        cur.execute(
            "INSERT INTO interruptions (id, topic_id, title, stop_date, reason, elapsed_seconds, created_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (int_id, topic_id, title, stop_date, reason, elapsed, created_at),
        )
    return int_id


# ---------- 9. Pengaturan (preferences) ----------
def get_preferences():
    with cursor() as cur:
        cur.execute("SELECT focus, short_break AS 'short', long_break AS 'long', goal, scene FROM preferences WHERE id = 1")
        row = cur.fetchone()
        if not row:
            return {"focus": 25, "short": 5, "long": 15, "goal": 150, "scene": "forest"}
        return row


def save_preferences(data):
    focus = integer(data.get("focus", 25), 1, 120, "Durasi fokus")
    short = integer(data.get("short", 5), 1, 60, "Istirahat pendek")
    long = integer(data.get("long", 15), 1, 60, "Istirahat panjang")
    goal = integer(data.get("goal", 150), 5, 1440, "Target harian")
    scene = data.get("scene", "forest")
    if scene not in SCENES:
        scene = "forest"

    with cursor(commit=True) as cur:
        cur.execute(
            "INSERT INTO preferences (id, focus, short_break, long_break, goal, scene) "
            "VALUES (1, %s, %s, %s, %s, %s) "
            "ON DUPLICATE KEY UPDATE focus=%s, short_break=%s, long_break=%s, goal=%s, scene=%s",
            (focus, short, long, goal, scene, focus, short, long, goal, scene),
        )
    return True


# ---------- Sinkronisasi Penuh State (load_all_state & sync_state) ----------
def load_all_state():
    """Memuat seluruh data dari 9 tabel ke format state Pomo yang siap dipakai di antarmuka."""
    prefs = get_preferences()
    return {
        "version": 2,
        "preferences": {
            "focus": prefs.get("focus", 25),
            "short": prefs.get("short", 5),
            "long": prefs.get("long", 15),
            "goal": prefs.get("goal", 150),
        },
        "scene": prefs.get("scene", "forest"),
        "topic": "",
        "cycle": 0,
        "activeTopicId": None,
        "timer": None,
        "courses": list_courses(),
        "topics": list_topics(),
        "plans": list_plans(),
        "reviews": list_reviews(),
        "checkpoints": list_checkpoints(),
        "distractions": list_distractions(),
        "interruptions": list_interruptions(),
        "sessions": list_sessions(),
        "updatedAt": now_ms(),
    }


def sync_state(state):
    """Menyimpan seluruh pembaruan state frontend ke MySQL secara teratur dan transaksional."""
    if not isinstance(state, dict):
        raise ValidationError("Data state tidak valid.")

    # 1. Simpan preferensi
    if "preferences" in state:
        p_data = dict(state["preferences"])
        if "scene" in state:
            p_data["scene"] = state["scene"]
        save_preferences(p_data)

    # 2. Simpan courses
    for c in state.get("courses", []):
        try:
            save_course(c)
        except Exception:
            pass

    # 3. Simpan topics
    for t in state.get("topics", []):
        try:
            save_topic(t)
        except Exception:
            pass

    # 4. Simpan reviews
    for r in state.get("reviews", []):
        try:
            save_review(r)
        except Exception:
            pass

    # 5. Simpan sessions
    for s in state.get("sessions", []):
        try:
            save_session(s)
        except Exception:
            pass

    # 6. Simpan plans
    for p in state.get("plans", []):
        try:
            save_plan(p)
        except Exception:
            pass

    # 7. Simpan checkpoints
    for cp in state.get("checkpoints", []):
        try:
            save_checkpoint(cp)
        except Exception:
            pass

    # 8. Simpan distractions
    for d in state.get("distractions", []):
        try:
            save_distraction(d)
        except Exception:
            pass

    # 9. Simpan interruptions
    for it in state.get("interruptions", []):
        try:
            save_interruption(it)
        except Exception:
            pass

    return True
