# Pomo — Pendamping Belajar Berbasis Target (E-Application)

Aplikasi pendamping belajar berbasis Pomodoro dengan arsitektur **Python sebagai Backend**, **HTML/CSS/JavaScript sebagai Frontend**, **Eel sebagai Penghubung**, dan **Database MySQL Lokal (XAMPP)** sebagai media penyimpanan data yang persisten dan terstruktur.

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Prasyarat
1. **XAMPP**: Pastikan modul **MySQL** sudah berjalan (Status: Running / Port: 3306).
2. **Python**: Python 3.10+ terpasang di komputer.
3. **Pustaka Python**: Pasang dependensi melalui terminal:
   ```powershell
   pip install -r requirements.txt
   ```

### 2. Menjalankan Aplikasi (Mode Penuh Python + MySQL)
Jalankan file `main.py`:
```powershell
python main.py
```
- Sistem akan secara otomatis menginisialisasi database `pomo_db` dan membuat 9 tabel yang diperlukan dari berkas `schema.sql`.
- Jendela aplikasi desktop akan terbuka otomatis (berukuran 1280x800) menggunakan peramban Google Chrome atau Microsoft Edge.
- Status koneksi di pojok kanan atas aplikasi akan menampilkan:
  **🟢 MySQL Lokal (XAMPP - pomo_db)**.

### 3. Menguji Lapisan Database
Untuk memvalidasi koneksi MySQL, skema 9 tabel, operasi CRUD, keamanan dari serangan *SQL Injection*, serta aturan relasi `ON DELETE CASCADE` dan `SET NULL`, jalankan:
```powershell
python test_database.py
```
Hasil uji akan menampilkan **14 skenario pengujian lulus 100%**.

### 4. Menguji Aturan Logika Belajar (Node.js Test Runner)
Aturan logika belajar (perhitungan Pomodoro, spaced repetition 1/3/7/14/30 hari, pembagian anggaran waktu, checkpoint) juga dapat diuji tanpa dependensi eksternal:
```powershell
node --test proejk_eapp/tests/learning-core.test.cjs
```

---

## 🏛️ Arsitektur Sistem

```
+--------------------------------------------------------------+
|                        FRONTEND                              |
|           HTML5, CSS3, JavaScript (Vanilla ES6+)             |
|   index.html | app.js | learning.js | data-store.js          |
+------------------------------+-------------------------------+
                               |
                   Eel (WebSockets / JSON-RPC)
                    <script src="/eel.js"></script>
                               |
+------------------------------v-------------------------------+
|                        BACKEND                               |
|                  Python (main.py, Eel)                       |
|   - Ekspos fungsi CRUD (@eel.expose)                         |
|   - Validasi data masukan (ValidationError)                  |
|   - Penanganan error terpusat (@aman)                        |
+------------------------------+-------------------------------+
                               |
                   mysql-connector-python
                   (Query berparameter anti-SQLi)
                               |
+------------------------------v-------------------------------+
|                     DATABASE SERVER                          |
|             MySQL / MariaDB Lokal (XAMPP 3306)               |
|                      Database: pomo_db                       |
|   9 Tabel: courses, topics, reviews, sessions, plans,         |
|   checkpoints, distractions, interruptions, preferences      |
+--------------------------------------------------------------+
```

---

## 🗄️ Struktur Database (`pomo_db`)

Database `pomo_db` memiliki 9 tabel yang saling berelasi:
1. **`courses`**: Menyimpan mata pelajaran, warna kartu, tujuan, dan tanggal dibuat.
2. **`topics`**: Menyimpan materi pelajaran, estimasi menit, tenggat (`deadline`), prioritas, target pemahaman, dan status selesai.
3. **`reviews`**: Menyimpan jadwal pengulangan berjarak (*spaced repetition*) yang otomatis dihitung dari hasil checkpoint (interval 1/3/7/14/30 hari).
4. **`sessions`**: Menyimpan riwayat setiap sesi fokus Pomodoro yang berhasil diselesaikan (waktu mulai, selesai, durasi menit, dan mata pelajaran).
5. **`plans`**: Menyimpan rencana belajar harian yang disusun otomatis berdasarkan anggaran menit atau sesi manual.
6. **`checkpoints`**: Menyimpan ringkasan refleksi dan penilaian pemahaman diri (*understood*, *unsure*, *repeat*) setelah sesi selesai.
7. **`distractions`**: Menyimpan catatan hambatan/gangguan belajar (ponsel, sosial, lingkungan, kelelahan, materi sulit).
8. **`interruptions`**: Menyimpan log sesi yang terhenti atau direset di tengah jalan.
9. **`preferences`**: Menyimpan preferensi durasi fokus (default 25 menit), istirahat pendek (5 m), istirahat panjang (15 m), target harian (150 m), dan tema latar belakang (*forest*, *sunset*, *night*).

---

## 📁 Struktur Berkas Proyek

```
proejk_eapp/
├── main.py                  # Titik masuk aplikasi Python & penghubung Eel
├── database.py              # Lapisan akses data MySQL (CRUD & Query berparameter)
├── schema.sql               # Skema pembuatan database dan 9 tabel relasional
├── test_database.py         # Skrip pengujian otomatis database MySQL
├── requirements.txt         # Daftar pustaka Python (eel, mysql-connector-python)
├── web/                     # Berkas frontend antarmuka pengguna
│   ├── index.html           # Struktur halaman, navigasi, dan modal dialog
│   ├── app.js               # Logika timer, statistik harian, suasana fokus
│   ├── data-store.js        # Store data persisten (sinkronisasi MySQL & fallback lokal)
│   ├── learning.js          # Peta materi, rencana, checkpoint, pengulangan, evaluasi
│   ├── learning-core.js     # Aturan bisnis murni & algoritma spaced repetition
│   ├── styles.css           # Desain visual studio fokus, tombol, dan tipografi
│   └── learning.css         # Desain kartu materi, tabel rencana, dan grafik evaluasi
├── docs/                    # Berkas makalah dan dokumentasi laporan proyek
└── tests/                   # Pengujian logika belajar berbasis Node.js
```

---

## 🛡️ Keamanan dan Keandalan Data
- **Pencegahan SQL Injection**: Seluruh query SQL pada `database.py` menggunakan format parameter `%s` tanpa konkatenasi string langsung.
- **Validasi Ganda**: Input divalidasi ketat pada lapisan frontend (tipe data, format tanggal, batasan karakter) dan kembali divalidasi pada lapisan backend Python (`ValidationError`).
- **Integritas Relasional**: Aturan `ON DELETE CASCADE` menghapus materi dan pengulangan saat mata pelajaran dihapus, sedangkan `ON DELETE SET NULL` memastikan riwayat sesi belajar tetap aman dan tidak hilang.
- **Fallback Otomatis**: Jika aplikasi dibuka tanpa Python (misal dibuka langsung via browser atau dalam lingkungan pengujian), aplikasi otomatis menggunakan penyimpanan browser lokal (`localStorage`) tanpa menampilkan kesalahan.
