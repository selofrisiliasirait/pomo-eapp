# Laporan Progres Awal dan Pengembangan

**Nama proyek:** Aplikasi Pomodoro Study Timer  
**Jumlah anggota:** 4 orang  
**Tahap saat ini:** Implementasi aplikasi lokal dan pengujian alur belajar  
**Pembaruan:** 19 November 2026

## Gambaran Proyek

Aplikasi Pomodoro Study Timer dikembangkan menjadi pendamping belajar berbasis target dengan alur rencanakan, fokus, evaluasi, dan ulangi. Timer, riwayat, target harian, dan statistik dihubungkan dengan peta materi, rencana sesi, checkpoint pemahaman, jadwal pengulangan, serta evaluasi hambatan belajar.

## Hasil Progres Awal

Pada tahap awal, kebutuhan pengguna dan ruang lingkup aplikasi telah dirumuskan dalam dokumen ini. Permasalahan yang menjadi fokus adalah kesulitan mengatur waktu belajar, menjaga keteraturan sesi, dan memantau durasi belajar yang telah dilakukan. Dari kebutuhan tersebut, ditetapkan empat fitur utama sebagai dasar pengembangan.

| Fitur | Rancangan kebutuhan |
| --- | --- |
| Timer Pomodoro | Menghitung mundur waktu belajar dan istirahat, dengan tombol mulai, jeda, lanjutkan, dan reset. Durasi awal yang diusulkan adalah 25 menit belajar dan 5 menit istirahat. |
| Riwayat sesi belajar | Menampilkan tanggal, waktu mulai, dan durasi sesi belajar yang telah diselesaikan. |
| Target harian | Memungkinkan pengguna menetapkan target durasi belajar dalam menit dan melihat progres pencapaiannya. |
| Statistik waktu belajar | Menampilkan total waktu belajar hari ini, jumlah sesi selesai, dan ringkasan durasi belajar per hari. |

Rancangan alur penggunaan juga telah ditentukan: pengguna membuka halaman utama, menetapkan target harian, menjalankan timer, menyelesaikan sesi belajar, lalu melihat pembaruan riwayat dan statistik. Sebagai aturan awal, hanya sesi belajar yang selesai yang dihitung ke target harian; waktu istirahat tidak masuk dalam total durasi belajar. Sesi yang dijeda dapat dilanjutkan, sedangkan sesi yang direset tidak dihitung sebagai sesi selesai.

## Rancangan Awal Halaman

Rancangan halaman telah diterapkan dalam aplikasi HTML, CSS, dan JavaScript yang dapat dibuka langsung melalui `index.html`.

| Halaman | Isi yang direncanakan |
| --- | --- |
| Beranda dan timer | Waktu yang tersisa, jenis sesi, tombol pengendali timer, serta ringkasan target harian. |
| Riwayat belajar | Daftar sesi selesai yang memuat tanggal, waktu mulai, dan durasi belajar. |
| Target harian | Formulir pengaturan target durasi belajar dan indikator pencapaian target. |
| Statistik | Total durasi belajar, jumlah sesi selesai, dan grafik durasi belajar per hari. |
| Peta materi | Pengelolaan mata pelajaran, topik, estimasi, tenggat, prioritas, catatan, dan target pemahaman. |
| Rencana belajar | Penyusunan otomatis, sesi manual, pengaturan tanggal/durasi, mulai sesi, lewati, dan pengubahan rencana. |
| Pengulangan | Jadwal dari checkpoint, pengingat jatuh tempo, pengaturan ulang tanggal, dan sesi ulang. |
| Evaluasi belajar | Ringkasan penilaian diri, catatan checkpoint, hambatan, sesi dihentikan, dan saran belajar. |

## Pembagian Tugas Anggota

| Anggota | Fokus tugas awal | Tugas pengembangan berikutnya |
| --- | --- | --- |
| Anggota 1 | Analisis kebutuhan, alur penggunaan, dan rancangan antarmuka. | Membuat desain visual, tampilan utama, dan navigasi aplikasi. |
| Anggota 2 | Menentukan alur timer dan aturan pergantian sesi. | Mengembangkan timer belajar dan istirahat, tombol pengendali, serta notifikasi sesi selesai. |
| Anggota 3 | Menentukan kebutuhan data riwayat dan target harian. | Membuat penyimpanan data sesi, pengaturan target, dan perhitungan progres harian. |
| Anggota 4 | Menentukan informasi statistik dan skenario pengujian. | Membuat ringkasan dan grafik statistik, mengoordinasikan pengujian, serta menyusun panduan penggunaan. |

Integrasi fitur, perbaikan kesalahan, penyusunan laporan akhir, dan persiapan presentasi menjadi tanggung jawab bersama. Setiap anggota juga menguji serta mendokumentasikan bagian yang dikembangkannya.

## Status Pekerjaan

| Pekerjaan | Status |
| --- | --- |
| Perumusan masalah dan tujuan aplikasi | Tersusun dalam dokumen awal. |
| Penentuan fitur dan aturan dasar | Tersusun sebagai rancangan awal. |
| Rancangan alur dan isi halaman | Tersusun secara konseptual. |
| Rancangan pembagian tugas 4 anggota | Tersusun. |
| Desain visual antarmuka | Diterapkan pada ruang fokus dan seluruh halaman belajar, termasuk tampilan ponsel. |
| Penulisan kode dan integrasi fitur | Timer, materi, rencana, checkpoint, pengulangan, evaluasi, dan cadangan terhubung. |
| Pengujian aplikasi | Pengujian aturan data dan alur browser telah dijalankan; cakupan tersedia di FITUR_DAN_PENGUJIAN.md. |

## Rencana Tahap Berikutnya

1. Mencoba alur belajar dengan materi milik masing-masing anggota tim.
2. Mengumpulkan masukan penggunaan dan meninjau hasil evaluasi belajar.
3. Menyiapkan contoh demonstrasi rencanakan, fokus, evaluasi, dan ulangi.
4. Menyusun bahan presentasi dan laporan pengembangan bersama.

Hasil pengembangan saat ini berupa aplikasi lokal yang dapat digunakan dan diuji melalui `index.html`. Data disimpan pada browser, dapat diekspor dan diimpor sebagai cadangan JSON, serta mendukung migrasi riwayat dari versi awal. Pembagian tanggung jawab tim di atas tetap menjadi acuan peninjauan dan dokumentasi masing-masing bagian.
