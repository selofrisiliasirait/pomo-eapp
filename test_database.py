"""Pengujian menyeluruh lapisan database MySQL lokal (XAMPP).
Jalankan: python test_database.py
"""
import time
import database as db

print("=== PENGUJIAN DATABASE POMO MYSQL (XAMPP) ===")

# 1. Inisialisasi dan Koneksi
db.init_database()
info = db.check_connection()
print(f"[OK] Terhubung ke: {info['name']} (Versi: {info['version']})")
print(f"[OK] Host: {info['host']}:{info['port']}")

# 2. CRUD Courses (Mata Pelajaran)
cid = db.save_course({"name": "Basis Data Lanjut", "goal": "Menguasai SQL dan Normalisasi", "color": "blue"})
courses = db.list_courses()
assert any(c["id"] == cid for c in courses), "Create course gagal"
print("[OK] Create course berhasil")

db.save_course({"id": cid, "name": "Basis Data Terapan", "goal": "SQL, NoSQL, dan Integrasi", "color": "purple"})
updated_course = next(c for c in db.list_courses() if c["id"] == cid)
assert updated_course["name"] == "Basis Data Terapan", "Update course gagal"
assert updated_course["color"] == "purple", "Update course color gagal"
print("[OK] Update course berhasil")

# 3. Validasi Course
for bad in ({"name": "   "}, {"name": "A" * 101}, {"name": "Valid", "color": "invalid_color"}):
    try:
        db.save_course(bad)
        assert False, f"Validasi harusnya menolak {bad}"
    except db.ValidationError as err:
        print(f"[OK] Validasi berhasil menolak: {err}")

# 4. CRUD Topics (Materi) dengan Uji SQL Injection
tid = db.save_topic({
    "courseId": cid,
    "title": "Query Berparameter & Anti SQLi",
    "estimate": 50,
    "deadline": "2026-12-15",
    "priority": "high",
    "notes": "admin' OR '1'='1'; DROP TABLE students; --",
    "outcome": "Aman dari SQL Injection",
})
topic = next(t for t in db.list_topics(cid) if t["id"] == tid)
assert topic["notes"] == "admin' OR '1'='1'; DROP TABLE students; --", "SQL Injection protection gagal"
assert topic["status"] == "active", "Status awal materi harus active"
print("[OK] Create topic & pencegahan SQL Injection berhasil")

db.set_topic_completed(tid, True)
topic_done = next(t for t in db.list_topics(cid) if t["id"] == tid)
assert topic_done["status"] == "completed", "Set topic completed gagal"
assert topic_done["completedAt"] is not None, "completedAt harus terisi"
print("[OK] Update status topic selesai berhasil")

# 5. CRUD Reviews (Jadwal Pengulangan)
rid = db.save_review({
    "topicId": tid,
    "due": "2026-11-23",
    "stage": 1,
    "status": "pending",
    "note": "Ulangi pemahaman query berparameter",
})
reviews = db.list_reviews(tid)
assert any(r["id"] == rid for r in reviews), "Create review gagal"
print("[OK] Create review berhasil")

# 6. CRUD Sessions (Sesi Fokus)
now = int(time.time() * 1000)
sess_data = {
    "id": "timer-test-01",
    "date": "2026-11-20",
    "startedAt": now - 1500000,
    "endedAt": now,
    "duration": 25,
    "title": "Query Berparameter & Anti SQLi",
    "courseName": "Basis Data Terapan",
    "topicId": tid,
    "reviewId": rid,
}
# Uji idempotensi (tidak boleh tercatat dobel jika id sama)
db.save_session(sess_data)
db.save_session(sess_data)
sessions = [s for s in db.list_sessions() if s["id"] == "timer-test-01"]
assert len(sessions) == 1, "Idempotensi sesi gagal (tercatat ganda)"
print("[OK] Create session & idempotensi berhasil")

# 7. Summary sesi per hari
summary = db.summary_for("2026-11-20")
assert summary["sessions"] >= 1 and summary["minutes"] >= 25, "Summary sesi gagal"
print(f"[OK] Summary tanggal 2026-11-20: {summary['sessions']} sesi, {summary['minutes']} menit")

# 8. CRUD Plans (Rencana Belajar)
pid = db.save_plan({
    "topicId": tid,
    "reviewId": rid,
    "date": "2026-11-20",
    "minutes": 25,
    "status": "done",
    "reason": "Prioritas tinggi & pengulangan",
    "title": "Belajar SQLi Defense",
    "sessionId": "timer-test-01",
})
plans = db.list_plans("2026-11-20")
assert any(p["id"] == pid for p in plans), "Create plan gagal"
print("[OK] Create plan berhasil")

# 9. CRUD Checkpoints (Refleksi Pemahaman)
cpid = db.save_checkpoint({
    "sessionId": "timer-test-01",
    "topicId": tid,
    "title": "Query Berparameter & Anti SQLi",
    "summary": "Parameter query memisahkan instruksi SQL dari data masukan pengguna.",
    "rating": "understood",
    "submitted": True,
    "completedTopic": True,
})
checkpoints = db.list_checkpoints()
assert any(c["id"] == cpid for c in checkpoints), "Create checkpoint gagal"
print("[OK] Create checkpoint pemahaman berhasil")

# 10. CRUD Distractions (Catat Hambatan)
did = db.save_distraction({
    "topicId": tid,
    "timerId": "timer-test-01",
    "date": "2026-11-20",
    "category": "phone",
    "note": "Pemberitahuan pesan masuk di ponsel",
})
distractions = db.list_distractions()
assert any(d["id"] == did for d in distractions), "Create distraction gagal"
print("[OK] Catat hambatan (distraction) berhasil")

# 11. CRUD Interruptions (Sesi Terhenti)
iid = db.save_interruption({
    "topicId": tid,
    "title": "Query Berparameter & Anti SQLi",
    "date": "2026-11-20",
    "reason": "Reset timer",
    "elapsedSeconds": 300,
})
interruptions = db.list_interruptions()
assert any(i["id"] == iid for i in interruptions), "Create interruption berhasil"
print("[OK] Catat sesi terhenti (interruption) berhasil")

# 12. CRUD Preferences
db.save_preferences({"focus": 30, "short": 7, "long": 20, "goal": 180, "scene": "sunset"})
prefs = db.get_preferences()
assert prefs["focus"] == 30 and prefs["short"] == 7 and prefs["goal"] == 180 and prefs["scene"] == "sunset", "Save preferences gagal"
print("[OK] Save & get preferences berhasil")

# 13. Load Full State
full_state = db.load_all_state()
assert full_state["version"] == 2
assert len(full_state["courses"]) >= 1
assert len(full_state["topics"]) >= 1
assert len(full_state["sessions"]) >= 1
print(f"[OK] load_all_state berhasil: {len(full_state['courses'])} courses, {len(full_state['topics'])} topics, {len(full_state['sessions'])} sessions")

# 14. Pembersihan Data Uji & Relasional ON DELETE (CASCADE & SET NULL)
db.delete_course(cid)
assert not any(c["id"] == cid for c in db.list_courses()), "Delete course gagal"
assert not any(t["id"] == tid for t in db.list_topics()), "Cascade topics gagal saat course dihapus"
assert not any(r["id"] == rid for r in db.list_reviews()), "Cascade reviews gagal saat topic dihapus"

# Verifikasi riwayat sesi tetap ada (topicId menjadi NULL / SET NULL)
retained_session = next(s for s in db.list_sessions() if s["id"] == "timer-test-01")
assert retained_session["topicId"] is None, "Aturan SET NULL pada riwayat sesi gagal"
print("[OK] Relasi CASCADE dan SET NULL terverifikasi aman!")

# Bersihkan sesi uji dan kembalikan preferensi bawaan
with db.cursor(commit=True) as cur:
    cur.execute("DELETE FROM sessions WHERE id = 'timer-test-01'")
    cur.execute("UPDATE preferences SET focus=25, short_break=5, long_break=15, goal=150, scene='forest' WHERE id=1")

print("\n>>> SEMUA 14 PENGUJIAN DATABASE MYSQL (XAMPP) LULUS 100%! <<<")
