# Pomo — Pendamping Belajar Berbasis Target

Aplikasi belajar lokal dengan alur **rencanakan → fokus → evaluasi → ulangi**. Dibangun menggunakan HTML, CSS, dan JavaScript tanpa dependensi eksternal.

## Menjalankan aplikasi

Buka **index.html** langsung di browser modern. Seluruh berkas HTML, CSS, dan JavaScript harus tetap berada di folder proyek yang sama. Tidak perlu instalasi paket atau koneksi internet.

Jika ingin memakai server lokal, jalankan:

```powershell
node serve.cjs
```

Buka http://127.0.0.1:4173. Gunakan browser dan alamat yang sama agar penyimpanan tetap konsisten. Penyimpanan file langsung, localhost, dan 127.0.0.1 terpisah; pindahkan data melalui ekspor/impor jika mengganti cara membuka aplikasi.

## Fitur lengkap

| Bagian | Kemampuan |
| --- | --- |
| Peta materi | Tambah, ubah, hapus mata pelajaran dan materi; tujuan belajar; estimasi menit; tenggat; prioritas; catatan; pencarian; filter mata pelajaran dan status. |
| Rencana belajar | Penyusunan otomatis per tanggal dan anggaran menit; sesi manual; ubah tanggal/durasi; mulai sesi; lewati; jadwalkan lagi; hapus sesi. |
| Pomodoro | Fokus, jeda pendek/panjang, mulai, jeda, lanjutkan, reset, durasi khusus, pemilihan materi, sesi bebas, pemulihan timer aktif/dijeda setelah halaman dimuat ulang. |
| Checkpoint | Ringkasan wajib dan penilaian diri setelah sesi; pilihan menandai materi selesai; checkpoint boleh ditunda dan tetap muncul di dashboard; catatan dapat diubah. |
| Pengulangan | Jadwal otomatis dari penilaian diri; pengingat jatuh tempo/terlewat; penambahan jadwal manual; atur tanggal; tunda besok; mulai sesi ulang; riwayat pengulangan selesai. |
| Evaluasi | Ringkasan waktu fokus, progres materi saat ini, checkpoint, penilaian pemahaman, kategori hambatan, sesi dihentikan, saran berbasis catatan, filter 7 hari/30 hari/semua waktu. |
| Target dan statistik | Target menit harian, progres, riwayat sesi, grafik minggu ini/minggu lalu, hari belajar beruntun, kebun fokus. |
| Ruang fokus | Suasana Hutan/Senja/Malam; mode fokus; pintasan Spasi, F, dan Esc; navigasi keyboard; dukungan pengurangan animasi. |
| Data | Penyimpanan lokal; migrasi riwayat versi lama; ekspor JSON; validasi dan pratinjau impor; konfirmasi penggantian data; penghapusan khusus riwayat contoh. |

## Alur penggunaan

1. Buka **Peta materi**, tambah mata pelajaran, lalu pecah materi menjadi topik kecil. Isi estimasi waktu, tenggat, prioritas, dan hasil yang ingin dicapai.
2. Buka **Rencana belajar**, pilih tanggal dan anggaran belajar, lalu susun otomatis atau tambahkan sesi manual.
3. Tekan **Mulai** pada sesi rencana. Materi dan durasinya langsung terhubung ke timer. Kamu juga dapat memilih materi langsung di Ruang fokus.
4. Saat menemui hambatan, tekan **Catat hambatan**. Timer aktif dijeda selama pencatatan dan dapat dilanjutkan otomatis setelah dialog ditutup.
5. Setelah sesi selesai, isi **checkpoint**: tulis kembali poin penting dan pilih tingkat pemahaman. Menandai materi selesai merupakan keputusan pengguna.
6. Buka **Pengulangan** untuk melihat materi yang perlu dipelajari kembali. Sesi pengulangan juga berakhir dengan checkpoint.
7. Gunakan **Evaluasi belajar** untuk meninjau hasil dan hambatan. Ekspor cadangan lewat **Data & cadangan** saat dibutuhkan.

## Aturan perencanaan dan pengulangan

- Rencana otomatis mendahulukan pengulangan jatuh tempo, lalu materi dengan tenggat terdekat. Prioritas menjadi pembeda untuk tenggat yang sama.
- Estimasi sisa materi dihitung dari sesi fokus selesai. Durasi sesi dibatasi pengaturan fokus dan sisa anggaran; sesi terakhir boleh lebih pendek.
- Menyusun ulang rencana mempertahankan sesi selesai dan sesi yang sedang dikerjakan. Sesi belum dikerjakan/dilewati pada tanggal tersebut diganti setelah konfirmasi.
- Materi yang estimasi waktunya sudah terpenuhi tetapi belum ditandai selesai tetap dapat memperoleh satu sesi evaluasi lanjutan.
- **Sudah paham:** pengulangan awal 3 hari kemudian, lalu 7, 14, dan 30 hari ketika pengulangan berikutnya berhasil. Interval tertinggi tetap 30 hari.
- **Masih ragu / perlu ulang:** pengulangan besok dan tahap pengulangan kembali ke awal.
- Satu materi memiliki paling banyak satu jadwal pengulangan aktif. Checkpoint lama yang baru dilengkapi tidak menimpa jadwal dari penilaian yang lebih baru.
- Menandai materi selesai melewati sisa sesi belajar biasa yang belum dimulai; jadwal pengulangan tetap dipertahankan.
- Pengingat tampil di dashboard dan menu Pengulangan saat aplikasi dibuka. Penilaian pemahaman diisi sendiri oleh pengguna.

## Penyimpanan dan integritas data

Data disimpan di localStorage pada browser/perangkat yang sama. Akun dan sinkronisasi antarperangkat belum menjadi bagian aplikasi lokal ini. Cadangan JSON dapat dipakai untuk memindahkan data.

- Data pengguna baru dimulai kosong. Riwayat contoh dari versi lama diberi penanda dan bisa dihapus tanpa menghapus sesi asli.
- Data versi 1 dimigrasikan tanpa menghapus sumber lamanya. Kunci penyimpanan utama versi ini adalah pomo-study-v2.
- Timer aktif menggunakan waktu akhir yang tersimpan. Setelah aplikasi dibuka kembali, sesi yang sudah mencapai waktu akhirnya diselesaikan satu kali.
- Hanya sesi fokus selesai yang dihitung ke target. Jeda dan sesi direset tidak masuk waktu fokus; sesi dihentikan mempunyai catatan tersendiri.
- Menghapus materi/mata pelajaran membersihkan rencana dan pengulangan terkait, tetapi mempertahankan riwayat serta checkpoint sebagai catatan belajar.
- Impor memeriksa versi, tipe, batas nilai, identitas duplikat, tanggal, dan hubungan data. Berkas tidak valid ditolak sebelum data diganti. Batas berkas 5 MB.
- Impor yang valid memerlukan konfirmasi karena mengganti data saat ini. Ekspor terlebih dahulu jika data lama masih diperlukan. Timer dari cadangan dihentikan saat diimpor.
- Bila penyimpanan penuh/diblokir atau data lama rusak, aplikasi menampilkan pemberitahuan; gunakan ekspor agar perubahan dalam memori tetap bisa diselamatkan.
- Batas hari dan minggu memakai zona waktu Asia/Jakarta.

## Pengujian

Pengujian aturan data menggunakan Node.js, tanpa paket tambahan:

```powershell
node --test tests/learning-core.test.cjs
```

Pengujian browser menggunakan Edge/Chrome terpasang dan Node.js 22+. Jalankan server di terminal pertama:

```powershell
node serve.cjs 4175
```

Lalu di terminal kedua:

```powershell
node tests/browser-flow.cjs
```

Bila browser ada di lokasi lain, atur POMO_BROWSER_PATH ke lokasi executable. POMO_TEST_URL dapat mengganti alamat server pengujian. Pengujian memakai profil sementara yang terpisah dari browser pribadi dan menyimpan gambar hasilnya di .preview/.

Lihat FITUR_DAN_PENGUJIAN.md untuk daftar cakupan dan bukti validasi.

## Struktur berkas

| Berkas | Tanggung jawab |
| --- | --- |
| index.html | Ruang fokus, navigasi, dan dialog pengaturan dasar. |
| styles.css | Tampilan Studio dan lanskap. |
| learning.css | Halaman, kartu, formulir, dan tampilan responsif alur belajar. |
| learning-core.js | Aturan perencanaan, checkpoint, pengulangan, migrasi, dan validasi. |
| data-store.js | Penyimpanan, cadangan, pembaruan antartab, dan penyelesaian sesi. |
| app.js | Timer, target harian, statistik, riwayat, dan suasana. |
| learning.js | Peta materi, rencana, pengulangan, evaluasi, dan pengelolaan data. |
| serve.cjs | Server statis lokal opsional. |
| tests/ | Pengujian aturan dan alur browser. |
