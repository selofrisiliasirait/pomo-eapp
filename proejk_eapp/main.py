"""Titik masuk aplikasi Pomo: menghubungkan antarmuka web dengan database MySQL (XAMPP) melalui Eel."""
import functools
import os
import sys

import eel
import eel.browsers as browsers
from mysql.connector import Error

import database as db

BASE_DIR = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))

# Daftarkan jalur peramban lokal jika belum terdeteksi otomatis
CHROME_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
]
EDGE_PATHS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]

for p in CHROME_PATHS:
    if os.path.isfile(p):
        try:
            browsers.set_path("chrome", p)
            break
        except Exception:
            pass

for p in EDGE_PATHS:
    if os.path.isfile(p):
        try:
            browsers.set_path("edge", p)
            break
        except Exception:
            pass

# Tentukan folder frontend
candidates = [
    os.path.join(BASE_DIR, "web"),
    os.path.join(BASE_DIR, "proejk_eapp"),
    BASE_DIR,
    "web",
    "proejk_eapp",
    ".",
]
web_dir = None
for c in candidates:
    if os.path.isfile(os.path.join(c, "index.html")):
        web_dir = c
        break

if not web_dir:
    web_dir = os.path.join(BASE_DIR, "web")

eel.init(web_dir)


def aman(func):
    """Membungkus fungsi agar hasilnya selalu berbentuk {ok: True, data: ...} atau {ok: False, error: ...}."""
    @functools.wraps(func)
    def pembungkus(*args, **kwargs):
        try:
            return {"ok": True, "data": func(*args, **kwargs)}
        except db.ValidationError as error:
            return {"ok": False, "error": str(error)}
        except Error as error:
            pesan = f"Kesalahan database MySQL: {error}"
            return {"ok": False, "error": pesan}
        except Exception as error:
            return {"ok": False, "error": f"Kesalahan sistem: {error}"}
    return pembungkus


# ========== FUNGSI YANG DIEKSPOS KE JAVASCRIPT MELALUI EEL ==========

@eel.expose
@aman
def cek_koneksi():
    """Memeriksa status koneksi ke MySQL."""
    return db.check_connection()


@eel.expose
@aman
def load_all_state():
    """Memuat seluruh data dari 9 tabel database ke frontend."""
    return db.load_all_state()


@eel.expose
@aman
def sync_state(state):
    """Menyimpan seluruh pembaruan state aplikasi ke database MySQL."""
    return db.sync_state(state)


# ----- Mata Pelajaran (courses) -----
@eel.expose
@aman
def get_courses():
    return db.list_courses()


@eel.expose
@aman
def save_course(data):
    return db.save_course(data)


@eel.expose
@aman
def delete_course(course_id):
    return db.delete_course(course_id)


# ----- Materi (topics) -----
@eel.expose
@aman
def get_topics(course_id=None):
    return db.list_topics(course_id)


@eel.expose
@aman
def save_topic(data):
    return db.save_topic(data)


@eel.expose
@aman
def set_topic_completed(topic_id, completed):
    return db.set_topic_completed(topic_id, bool(completed))


@eel.expose
@aman
def delete_topic(topic_id):
    return db.delete_topic(topic_id)


# ----- Jadwal Pengulangan (reviews) -----
@eel.expose
@aman
def get_reviews(topic_id=None):
    return db.list_reviews(topic_id)


@eel.expose
@aman
def save_review(data):
    return db.save_review(data)


@eel.expose
@aman
def delete_review(review_id):
    return db.delete_review(review_id)


# ----- Rencana Belajar (plans) -----
@eel.expose
@aman
def get_plans(plan_date=None):
    return db.list_plans(plan_date)


@eel.expose
@aman
def save_plan(data):
    return db.save_plan(data)


@eel.expose
@aman
def delete_plan(plan_id):
    return db.delete_plan(plan_id)


# ----- Sesi Fokus (sessions) -----
@eel.expose
@aman
def get_sessions(limit=1000):
    return db.list_sessions(limit)


@eel.expose
@aman
def save_session(data):
    return db.save_session(data)


@eel.expose
@aman
def delete_sample_sessions():
    return db.delete_sample_sessions()


@eel.expose
@aman
def get_summary(day):
    return db.summary_for(day)


# ----- Checkpoints Pemahaman -----
@eel.expose
@aman
def get_checkpoints():
    return db.list_checkpoints()


@eel.expose
@aman
def save_checkpoint(data):
    return db.save_checkpoint(data)


@eel.expose
@aman
def delete_checkpoint(cp_id):
    return db.delete_checkpoint(cp_id)


# ----- Hambatan & Sesi Terhenti -----
@eel.expose
@aman
def get_distractions():
    return db.list_distractions()


@eel.expose
@aman
def save_distraction(data):
    return db.save_distraction(data)


@eel.expose
@aman
def get_interruptions():
    return db.list_interruptions()


@eel.expose
@aman
def save_interruption(data):
    return db.save_interruption(data)


# ----- Pengaturan (preferences) -----
@eel.expose
@aman
def get_preferences():
    return db.get_preferences()


@eel.expose
@aman
def save_preferences(data):
    return db.save_preferences(data)


def start_app():
    """Memulai inisialisasi database dan menjalankan server Eel."""
    print("Menginisialisasi database pomo_db di XAMPP MySQL...")
    try:
        db.init_database()
        info = db.check_connection()
        print(f"Koneksi berhasil: {info['name']} (Versi: {info['version']})")
    except Exception as e:
        print(f"Peringatan koneksi database: {e}")
        print("Pastikan layanan MySQL di XAMPP Control Panel sudah berjalan.")

    port = int(os.getenv("PORT", "8000"))
    print(f"Membuka antarmuka Pomo di port {port} (folder: {web_dir})...")

    # Coba luncurkan peramban yang tersedia
    try:
        eel.start("index.html", host="0.0.0.0", size=(1280, 800), port=port, block=True)
    except (SystemExit, KeyboardInterrupt):
        print("Aplikasi Pomo ditutup.")
    except Exception as e:
        print(f"Gagal membuka peramban otomatis: {e}")
        print(f"Silakan buka manual di browser: http://localhost:{port}/index.html")
        try:
            eel.start("index.html", mode="default", port=port, block=True)
        except Exception:
            pass


if __name__ == "__main__":
    start_app()
