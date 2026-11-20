# Cakupan Fitur dan Validasi Pomo

Pembaruan: **19 November 2026**. Aplikasi lokal menggunakan HTML, CSS, dan JavaScript. Kelima fitur pengembangan yang disepakati sudah diimplementasikan dan dihubungkan ke timer serta penyimpanan.

| Fitur yang disepakati | Implementasi |
| --- | --- |
| Peta materi belajar | Pengelolaan mata pelajaran dan materi, target pemahaman, estimasi waktu, tenggat, prioritas, catatan, pencarian, penyaring status, dan progres waktu. |
| Rencana sesi otomatis | Prioritas pengulangan/tenggat, pembagian sesuai durasi fokus dan anggaran harian, tanggal rencana, sesi manual, pengubahan, mulai, lewati, jadwalkan lagi, dan penghapusan. |
| Checkpoint pemahaman | Ringkasan dan penilaian diri, penandaan materi selesai secara eksplisit, pengubahan catatan, penundaan pengisian dengan pengingat yang persisten. |
| Jadwal pengulangan | Penjadwalan dari checkpoint, interval bertahap, pengingat jatuh tempo, jadwal manual, atur tanggal, tunda besok, sesi ulang yang terhubung ke checkpoint. |
| Evaluasi kebiasaan belajar | Kategori dan catatan hambatan, ringkasan penilaian diri, waktu fokus, materi selesai, sesi dihentikan, saran berbasis catatan, serta penyaring rentang waktu. |

## Fitur pendukung

- Timer fokus dan istirahat dengan mulai, jeda, lanjutkan, reset, dan pengaturan durasi.
- Pemulihan sesi aktif maupun dijeda setelah halaman dimuat ulang.
- Target harian, riwayat, grafik mingguan, hari beruntun, dan kebun fokus.
- Suasana Hutan/Senja/Malam dan mode fokus tanpa panel lain.
- Ekspor/impor JSON, validasi relasi data, pratinjau dan konfirmasi impor.
- Migrasi data lama, penanda riwayat contoh, dan penghapusan khusus data contoh.
- Tampilan desktop/ponsel, navigasi keyboard, label formulir, dan pengurangan animasi.

## Pengujian aturan data

Jalankan `node --test tests/learning-core.test.cjs`. Cakupannya:

- Tanggal dan batas hari Asia/Jakarta, tahun kabisat, dan penolakan tanggal tidak valid.
- Migrasi sesi lama dan validasi cadangan, identitas unik, serta referensi antardata.
- Pembagian estimasi menjadi sesi, batas anggaran, sesi terakhir pendek, urutan tenggat/prioritas.
- Penyusunan ulang yang mempertahankan sesi selesai dan sesi aktif.
- Penyelesaian sesi satu kali, hubungan sesi dengan rencana, dan checkpoint otomatis.
- Istirahat tidak menambah durasi belajar atau siklus fokus.
- Aturan 1/3/7/14/30 hari, pengubahan checkpoint, dan satu jadwal aktif per materi.
- Checkpoint lama tidak menimpa jadwal dari penilaian yang lebih baru.
- Materi selesai melewati sesi belajar biasa yang belum dimulai.
- Penghapusan materi membersihkan jadwal dengan mempertahankan riwayat dan refleksi.
- Penghapusan mata pelajaran dengan sesi aktif ditolak tanpa perubahan sebagian.
- Evaluasi memisahkan sesi selesai, contoh, hambatan, dan sesi dihentikan.

## Pengujian alur di browser

Jalankan server `node serve.cjs 4175`, lalu `node tests/browser-flow.cjs` di terminal lain. Pengujian memakai profil browser terpisah dan data buatan khusus pengujian.

Alur yang telah diverifikasi meliputi pembuatan dan pengubahan mata pelajaran/materi; rencana otomatis dan manual; sesi fokus terhubung; pencatatan hambatan dengan jeda/lanjutkan; checkpoint wajib dan checkpoint yang ditunda; pengulangan dan penandaan materi selesai; pengubahan, pelewatan, pemulihan, dan penghapusan sesi rencana; evaluasi; serta penghapusan materi/mata pelajaran sambil mempertahankan catatan belajar.

Ekspor benar-benar mengunduh JSON. Impor yang tidak valid ditolak tanpa mengganti data, sedangkan cadangan valid dipulihkan setelah konfirmasi. Timer aktif dan dijeda serta checkpoint tertunda diuji melalui pemuatan ulang halaman.

Kelima halaman utama diperiksa pada lebar **320, 390, 620, 768, dan 1024 piksel**, serta desktop 1440 piksel. Berkas `index.html` juga dibuka langsung tanpa server. Kesalahan JavaScript dan kegagalan render dikumpulkan selama pengujian.

Gambar hasil dan ringkasan pemeriksaan tersimpan di `.preview/`. Waktu dalam pengujian browser dipercepat dengan jam uji terpisah; jam ini hanya dimasukkan oleh skrip pengujian dan tidak ada pada aplikasi yang dipakai pengguna.

## Ruang lingkup penyimpanan

Data tersimpan lokal pada browser/perangkat. Pengingat pengulangan tampil ketika aplikasi dibuka. Penilaian pemahaman diisi oleh pengguna. Panduan pemakaian, aturan rinci, dan cara memindahkan data tersedia di `README.md`.
