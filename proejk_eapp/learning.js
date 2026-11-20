/* Study workflow: material map → plan → focus → checkpoint → review. */
(() => {
  'use strict';
  const C = window.PomoCore, Store = window.PomoStore, App = window.PomoApp, state = Store.state;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const ratings = { understood: 'Sudah paham', unsure: 'Masih ragu', repeat: 'Perlu ulang' };
  const categories = { phone: 'Ponsel / notifikasi', social: 'Media sosial', environment: 'Lingkungan', difficult: 'Materi sulit', tired: 'Lelah', other: 'Lainnya' };
  const priorities = { high: 'Tinggi', normal: 'Normal', low: 'Rendah' };
  const ui = { route: 'ringkasan', search: '', course: '', status: '', planDate: C.today(), reviewFilter: 'pending', evaluationPeriod: '7', checkpointFilter: '', pendingImport: null };
  let confirmResolve = null, barrierContext = null;
  const icon = (name) => `<svg class='icon' aria-hidden='true'><use href='#i-${name}'/></svg>`;
  const action = (name, id, label, style = '') => `<button type='button' class='button button-small ${style}' data-action='${name}' data-id='${esc(id)}'>${label}</button>`;
  const badge = (label, style = '') => `<span class='tag ${style}'>${esc(label)}</span>`;
  const empty = (title, detail, buttons = '') => `<div class='empty-state'>${icon('book')}<h3>${esc(title)}</h3><p>${esc(detail)}</p><div class='inline-actions'>${buttons}</div></div>`;
  const courseOf = (topic) => state.courses.find((r) => r.id === topic?.courseId);
  const topicOf = (id) => state.topics.find((r) => r.id === id);
  const dateLabel = (date) => C.validDate(date) ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z')) : 'Tanpa tenggat';
  const timeLabel = (value) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: C.ZONE }).format(new Date(value));
  function pageHead(title, detail, buttons) { return `<header class='learning-heading'><div><p class='eyebrow'>PENDAMPING BELAJARMU</p><h1>${title}</h1><p>${detail}</p></div><div class='inline-actions'>${buttons || ''}</div></header>`; }
  $('learning-pages').innerHTML = `
    <section class='learning-page' id='materials-page' data-route='materi' hidden>
      ${pageHead('Peta materi belajar', 'Pecah tujuan besar menjadi materi yang bisa kamu kerjakan.', action('course-add', '', '+ Mata pelajaran', 'button-outline') + action('topic-add', '', '+ Materi', 'button-primary'))}
      <div id='course-cards' class='course-grid'></div>
      <div class='learning-toolbar'><label class='search-field'>Cari materi<input id='material-search' type='search' placeholder='Judul, catatan, atau tujuan belajar…'></label><label>Mata pelajaran<select id='material-course'><option value=''>Semua mata pelajaran</option></select></label><label>Status<select id='material-status'><option value=''>Semua status</option><option value='active'>Sedang dipelajari</option><option value='completed'>Selesai</option><option value='weak'>Perlu penguatan</option></select></label></div>
      <div class='list-heading'><h2>Materimu</h2><span id='material-count'></span></div><div id='topic-list' class='topic-grid'></div>
    </section>
    <section class='learning-page' id='planner-page' data-route='rencana' hidden>
      ${pageHead('Rencana belajar', 'Urutkan pengulangan, tenggat, dan prioritas dalam waktu yang kamu punya.', action('plan-add', '', '+ Sesi manual', 'button-outline'))}
      <div class='card planner-controls'><label class='form-field'>Tanggal rencana<input id='plan-date' type='date' required></label><label class='form-field'>Anggaran belajar (menit)<input id='plan-budget' type='number' min='5' max='1440' step='1' required></label>${action('plan-generate', '', 'Susun rencana otomatis', 'button-primary')}</div>
      <p class='rule-note'>Urutan: pengulangan jatuh tempo → tenggat paling dekat → prioritas tinggi. Sesi terakhir dapat lebih pendek agar sesuai anggaran.</p><div id='plan-summary' class='metric-grid'></div><div id='plan-list' class='plan-list'></div>
    </section>
    <section class='learning-page' id='reviews-page' data-route='pengulangan' hidden>
      ${pageHead('Jaga pemahamanmu', 'Kembali ke materi pada waktunya, lalu periksa apa yang masih kamu ingat.', action('review-add', '', '+ Jadwal pengulangan', 'button-primary'))}
      <div id='review-summary' class='metric-grid'></div><div class='learning-toolbar'><label>Tampilkan<select id='review-filter'><option value='pending'>Semua yang dijadwalkan</option><option value='due'>Jatuh tempo & terlewat</option><option value='upcoming'>Akan datang</option><option value='done'>Sudah diulang</option></select></label></div><div id='review-list' class='review-grid'></div>
    </section>
    <section class='learning-page' id='evaluation-page' data-route='evaluasi' hidden>
      ${pageHead('Evaluasi proses belajarmu', 'Lihat hasil penilaian diri, catatan pemahaman, dan hambatan yang berulang.', action('barrier-add', '', '+ Catat hambatan', 'button-outline'))}
      <div class='learning-toolbar'><label>Rentang evaluasi<select id='evaluation-period'><option value='7'>7 hari terakhir</option><option value='30'>30 hari terakhir</option><option value='all'>Semua waktu</option></select></label><label>Checkpoint<select id='checkpoint-filter'><option value=''>Semua checkpoint</option><option value='pending'>Belum diisi</option><option value='understood'>Sudah paham</option><option value='unsure'>Masih ragu</option><option value='repeat'>Perlu ulang</option></select></label></div>
      <div id='evaluation-summary' class='metric-grid'></div><div class='evaluation-grid'><section class='card'><h2>Pemahaman menurut penilaianmu</h2><p class='card-description'>Hasil refleksi pengguna setelah sesi selesai.</p><div id='understanding-chart'></div></section><section class='card'><h2>Hambatan yang kamu catat</h2><p class='card-description'>Catatan hambatan dan sesi dihentikan dihitung terpisah.</p><div id='barrier-chart'></div></section></div>
      <section class='card learning-insights'><h2>Langkah berikutnya</h2><div id='learning-insights'></div></section><div class='list-heading'><h2>Catatan checkpoint</h2><span id='checkpoint-count'></span></div><div id='checkpoint-list' class='reflection-list'></div><div class='list-heading'><h2>Riwayat hambatan</h2></div><div id='barrier-list' class='reflection-list'></div><div class='list-heading'><h2>Sesi yang dihentikan</h2></div><div id='interruption-list' class='reflection-list'></div>
    </section>`;
  $('plan-date').value = ui.planDate; $('plan-budget').value = state.preferences.goal;
  const dialogHead = (titleId, title) => `<div class='dialog-heading'><div><p class='eyebrow'>BELAJAR DENGAN ARAH</p><h2 id='${titleId}'>${title}</h2></div><button type='button' class='icon-button' data-close-dialog aria-label='Tutup dialog'>${icon('close')}</button></div>`;
  const formEnd = (label = 'Simpan') => `<p class='form-error' role='alert'></p><button class='button button-primary dialog-submit' type='submit'>${label}${icon('check')}</button>`;
  document.body.insertAdjacentHTML('beforeend', `
    <dialog id='course-dialog' aria-labelledby='course-title'><form id='course-form'>${dialogHead('course-title', 'Mata pelajaran')}<input type='hidden' name='id'><label class='form-field'>Nama mata pelajaran<input name='name' maxlength='100' required placeholder='Contoh: Basis Data'></label><label class='form-field'>Tujuan belajar<textarea name='goal' maxlength='1000' rows='3' placeholder='Apa yang ingin kamu kuasai?'></textarea></label><label class='form-field'>Warna penanda<select name='color'><option value='green'>Hijau</option><option value='orange'>Jingga</option><option value='blue'>Biru</option><option value='purple'>Ungu</option><option value='pink'>Merah muda</option></select></label>${formEnd('Simpan mata pelajaran')}</form></dialog>
    <dialog id='topic-dialog' class='wide-dialog' aria-labelledby='topic-title'><form id='topic-form'>${dialogHead('topic-title', 'Materi belajar')}<input type='hidden' name='id'><label class='form-field'>Mata pelajaran<select name='courseId' required></select></label><label class='form-field'>Judul materi<input name='title' maxlength='160' required placeholder='Contoh: Normalisasi sampai bentuk 3NF'></label><div class='form-row'><label class='form-field'>Estimasi belajar (menit)<input name='estimate' type='number' min='1' max='6000' step='1' value='60' required></label><label class='form-field'>Tenggat (opsional)<input name='deadline' type='date'></label></div><label class='form-field'>Prioritas<select name='priority'><option value='normal'>Normal</option><option value='high'>Tinggi</option><option value='low'>Rendah</option></select></label><label class='form-field'>Target pemahaman<textarea name='outcome' maxlength='1000' rows='2' placeholder='Contoh: Bisa menormalisasi satu tabel tanpa melihat contoh.'></textarea></label><label class='form-field'>Catatan / sumber materi<textarea name='notes' maxlength='4000' rows='3' placeholder='Bab, halaman, atau sumber yang ingin kamu pelajari.'></textarea></label>${formEnd('Simpan materi')}</form></dialog>
    <dialog id='plan-dialog' aria-labelledby='plan-title'><form id='plan-form'>${dialogHead('plan-title', 'Atur sesi belajar')}<input type='hidden' name='id'><label class='form-field'>Materi<select name='topicId' required></select></label><div class='form-row'><label class='form-field'>Tanggal<input name='date' type='date' required></label><label class='form-field'>Durasi (menit)<input name='minutes' type='number' min='1' max='120' step='1' required></label></div>${formEnd('Simpan sesi')}</form></dialog>
    <dialog id='review-dialog' aria-labelledby='review-title'><form id='review-form'>${dialogHead('review-title', 'Jadwalkan pengulangan')}<input type='hidden' name='id'><label class='form-field'>Materi<select name='topicId' required></select></label><label class='form-field'>Tanggal pengulangan<input name='due' type='date' required></label><label class='form-field'>Bagian yang perlu diingat kembali<textarea name='note' maxlength='1000' rows='3'></textarea></label>${formEnd('Simpan jadwal')}</form></dialog>
    <dialog id='checkpoint-dialog' class='wide-dialog' aria-labelledby='checkpoint-title'><form id='checkpoint-form'>${dialogHead('checkpoint-title', 'Apa yang kamu pahami?')}<input type='hidden' name='id'><p id='checkpoint-context' class='dialog-description'></p><label class='form-field'>Ceritakan kembali poin pentingnya<textarea name='summary' maxlength='4000' rows='5' required placeholder='Coba tulis tanpa melihat materi. Bagian mana yang sudah jelas dan yang masih membingungkan?'></textarea></label><fieldset class='rating-options'><legend>Pemahamanmu setelah sesi ini</legend><label><input type='radio' name='rating' value='understood' required> Sudah paham</label><label><input type='radio' name='rating' value='unsure' required> Masih ragu</label><label><input type='radio' name='rating' value='repeat' required> Perlu ulang</label></fieldset><label class='checkbox-field'><input name='completeTopic' type='checkbox'><span id='complete-topic-label'>Tandai materi ini selesai dipelajari</span></label><p class='form-note'>Sudah paham: ulangi 3 hari lagi, lalu 7, 14, dan 30 hari setelah pengulangan berhasil. Masih ragu / perlu ulang: besok.</p>${formEnd('Simpan checkpoint & jadwal')}<button class='text-link dialog-later' type='button' data-close-dialog>Isi nanti — tetap simpan sesi</button></form></dialog>
    <dialog id='barrier-dialog' aria-labelledby='barrier-title'><form id='barrier-form'>${dialogHead('barrier-title', 'Apa yang menghambatmu?')}<input type='hidden' name='id'><p class='dialog-description'>Catatan kecil untuk menemukan pola dan mengatur sesi berikutnya.</p><label class='form-field'>Kategori<select name='category' required>${Object.entries(categories).map(([value, label]) => `<option value='${value}'>${label}</option>`).join('')}</select></label><label class='form-field'>Catatan (opsional)<textarea name='note' maxlength='1000' rows='3'></textarea></label><label class='checkbox-field' id='barrier-resume-label'><input name='resume' type='checkbox' checked>Lanjutkan timer setelah dialog ditutup</label>${formEnd('Simpan hambatan')}</form></dialog>
    <dialog id='confirm-dialog' aria-labelledby='confirm-title'><div class='dialog-heading'><h2 id='confirm-title'></h2><button class='icon-button' type='button' data-close-dialog aria-label='Batalkan'>${icon('close')}</button></div><p id='confirm-description' class='dialog-description'></p><div class='inline-actions'><button class='button button-outline' id='confirm-cancel' type='button'>Batal</button><button class='button button-primary' id='confirm-accept' type='button'>Lanjutkan</button></div></dialog>
    <dialog id='data-dialog' class='wide-dialog' aria-labelledby='data-title'>${dialogHead('data-title', 'Data & cadangan')}<p class='dialog-description'>Data tersimpan pada browser dan perangkat ini. Ekspor berkas JSON untuk memindahkan atau mencadangkannya.</p><div id='data-summary' class='notice'></div><div class='data-actions'><button class='button button-primary' id='export-data' type='button'>Ekspor cadangan JSON${icon('arrow')}</button><label class='form-field'>Pilih cadangan untuk diimpor<input id='import-file' type='file' accept='.json,application/json'></label><p class='form-note'>Maksimal 5 MB. Berkas divalidasi sebelum data diganti. Timer aktif tidak dilanjutkan dari cadangan.</p><div id='import-preview' class='notice' hidden></div><button class='button button-outline' id='import-apply' type='button' hidden>Ganti data dengan cadangan</button><button class='text-link danger-text' id='clear-samples' type='button' hidden>Hapus hanya riwayat contoh</button></div><p id='data-error' class='form-error' role='alert'></p></dialog>`);

  function fillSelect(select, items, placeholder, selected = select.value) {
    select.innerHTML = (placeholder ? `<option value=''>${esc(placeholder)}</option>` : '') + items.map(([id, label]) => `<option value='${esc(id)}'>${esc(label)}</option>`).join('');
    if ([...select.options].some((r) => r.value === selected)) select.value = selected;
  }
  function topicOptions() { return state.topics.map((r) => [r.id, (courseOf(r)?.name || 'Materi') + ' · ' + r.title + (r.status === 'completed' ? ' (selesai)' : '')]); }
  function formError(form, error) { const output = form.querySelector('.form-error'); if (output) output.textContent = error.message; App.notify(error.message); }
  function openForm(id) { const form = $(id + '-form'); form.reset(); form.querySelector('.form-error').textContent = ''; return form; }
  function setValues(form, values) { for (const [key, value] of Object.entries(values)) if (form.elements.namedItem(key)) form.elements.namedItem(key).value = value ?? ''; }
  function confirm(title, message) {
    if ($('confirm-dialog').open) return Promise.resolve(false);
    $('confirm-title').textContent = title; $('confirm-description').textContent = message;
    $('confirm-dialog').showModal(); return new Promise((resolve) => { confirmResolve = resolve; });
  }
  function resolveConfirm(value) { const resolve = confirmResolve; confirmResolve = null; $('confirm-dialog').close(); resolve?.(value); }
  $('confirm-accept').addEventListener('click', () => resolveConfirm(true));
  $('confirm-cancel').addEventListener('click', () => resolveConfirm(false));
  $('confirm-dialog').addEventListener('close', () => { if (!$('confirm-dialog').open && confirmResolve) { const resolve = confirmResolve; confirmResolve = null; resolve(false); } });
  function navigate(route) {
    if (location.hash !== '#' + route) location.hash = route;
    applyRoute();
  }
  function applyRoute() {
    const requested = location.hash.slice(1) || 'ringkasan';
    if (ui.hash === requested) return;
    ui.hash = requested;
    const route = ['materi', 'rencana', 'pengulangan', 'evaluasi'].includes(requested) ? requested : 'ringkasan';
    ui.route = route; App.setImmersive(false);
    $('workspace-overview').hidden = route !== 'ringkasan';
    document.querySelectorAll('.learning-page').forEach((page) => { page.hidden = page.dataset.route !== route; });
    document.querySelectorAll('.navigation a').forEach((link) => { const active = link.hash === '#' + (['riwayat', 'statistik', 'target'].includes(requested) ? requested : route); link.classList.toggle('active', active); if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    document.querySelector('.breadcrumb > span').textContent = { ringkasan: 'Ruang fokus', materi: 'Peta materi', rencana: 'Rencana belajar', pengulangan: 'Pengulangan', evaluasi: 'Evaluasi belajar' }[route];
    render();
    if (['riwayat', 'statistik', 'target'].includes(requested)) requestAnimationFrame(() => $(requested)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    else window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function renderOverview() {
    const pending = state.checkpoints.filter((r) => !r.submitted);
    const due = state.reviews.filter((r) => r.status === 'pending' && r.due <= C.today());
    const plans = state.plans.filter((r) => r.date === C.today() && r.status === 'todo');
    const next = plans[0];
    $('review-nav-count').hidden = !due.length; $('review-nav-count').textContent = due.length;
    let html = '';
    if (pending.length) html += `<div class='notice notice-warning notice-action'><div><strong>${pending.length} checkpoint belum diisi</strong><p>Sesi sudah tersimpan. Lengkapi refleksi agar jadwal pengulangannya terbentuk.</p></div>${action('checkpoint', pending[0].id, 'Isi checkpoint', 'button-primary')}</div>`;
    if (due.length) html += `<div class='notice notice-action'><div><strong>${due.length} materi waktunya diulang</strong><p>Ingat kembali poin pentingnya sebelum menambah materi baru.</p></div>${action('go-reviews', '', 'Lihat pengulangan', 'button-outline')}</div>`;
    html += `<div class='study-next-card'><div><p class='eyebrow'>LANGKAH BELAJAR BERIKUTNYA</p><h2>${esc(next ? next.title : state.topics.length ? 'Beri harimu rencana yang jelas.' : 'Mulai dari materi yang ingin kamu kuasai.')}</h2><p>${esc(next ? next.minutes + ' menit · ' + next.reason : state.topics.length ? 'Susun sesi otomatis berdasarkan tenggat dan prioritasmu.' : 'Tambah mata pelajaran dan pecah menjadi topik-topik kecil.')}</p></div>${next ? action('plan-start', next.id, 'Mulai sesi ' + icon('play'), 'button-primary') : action(state.topics.length ? 'go-plan' : 'go-materials', '', state.topics.length ? 'Susun rencana' : 'Tambah materi pertama', 'button-primary')}</div>`;
    $('learning-overview').innerHTML = html;
  }
  function renderMaterials() {
    if (ui.course && !state.courses.some((r) => r.id === ui.course)) ui.course = '';
    fillSelect($('material-course'), state.courses.map((r) => [r.id, r.name]), 'Semua mata pelajaran', ui.course);
    $('course-cards').innerHTML = state.courses.map((course) => {
      const topics = state.topics.filter((r) => r.courseId === course.id), done = topics.filter((r) => r.status === 'completed').length;
      return `<article class='course-card color-${course.color}'><div class='card-heading'><span class='course-letter'>${esc(course.name.slice(0, 1).toUpperCase())}</span><div class='inline-actions'>${action('course-edit', course.id, 'Ubah', 'button-quiet')}${action('course-delete', course.id, 'Hapus', 'button-quiet danger-text')}</div></div><h2>${esc(course.name)}</h2><p>${esc(course.goal || 'Bangun pemahaman satu topik demi satu topik.')}</p><div class='mini-progress'><i style='width:${topics.length ? done / topics.length * 100 : 0}%'></i></div><div class='card-heading'><span>${done} / ${topics.length} materi selesai</span>${action('topic-add', course.id, '+ Materi', 'button-quiet')}</div></article>`;
    }).join('') || empty('Peta belajarmu dimulai di sini', 'Buat mata pelajaran, lalu tambahkan materi dan tujuan pemahamannya.', action('course-add', '', '+ Mata pelajaran', 'button-primary'));
    const query = ui.search.toLocaleLowerCase('id');
    const topics = state.topics.filter((r) => (!ui.course || r.courseId === ui.course) && (!query || [r.title, r.notes, r.outcome, courseOf(r)?.name].join(' ').toLocaleLowerCase('id').includes(query)) && (!ui.status || (ui.status === 'weak' ? ['unsure', 'repeat'].includes(C.latestCheckpoint(state, r.id)?.rating) : r.status === ui.status))).sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999') || b.createdAt - a.createdAt);
    $('material-count').textContent = topics.length + ' materi';
    $('topic-list').innerHTML = topics.map((topic) => {
      const learned = C.topicMinutes(state, topic.id), cp = C.latestCheckpoint(state, topic.id), course = courseOf(topic);
      return `<article class='card topic-card'><div class='card-heading'>${badge(course?.name || 'Materi', 'color-' + (course?.color || 'green'))}${badge(topic.status === 'completed' ? 'Selesai' : 'Dipelajari', topic.status === 'completed' ? 'tag-success' : '')}</div><h2>${esc(topic.title)}</h2><div class='topic-tags'>${badge('Prioritas ' + priorities[topic.priority], topic.priority === 'high' ? 'tag-warning' : '')}${badge(topic.deadline ? dateLabel(topic.deadline) : 'Tanpa tenggat', topic.deadline && topic.deadline < C.today() && topic.status !== 'completed' ? 'tag-danger' : '')}${cp ? badge(ratings[cp.rating], 'rating-' + cp.rating) : ''}</div><p class='topic-outcome'>${esc(topic.outcome || 'Tambahkan target pemahaman agar hasil belajarmu lebih terarah.')}</p><div class='mini-progress'><i style='width:${Math.min(100, learned / topic.estimate * 100)}%'></i></div><p class='small-copy'>${learned} menit belajar / estimasi ${topic.estimate} menit · sekitar ${Math.ceil(Math.max(0, topic.estimate - learned) / state.preferences.focus)} sesi tersisa</p>${topic.notes ? `<details><summary>Catatan materi</summary><p class='preserve-text'>${esc(topic.notes)}</p></details>` : ''}<div class='inline-actions topic-actions'>${action('topic-start', topic.id, 'Belajar', 'button-primary')}${action('topic-edit', topic.id, 'Ubah', 'button-outline')}${action('topic-toggle', topic.id, topic.status === 'completed' ? 'Buka lagi' : 'Tandai selesai', 'button-quiet')}${action('review-add', topic.id, 'Jadwalkan ulang', 'button-quiet')}${action('topic-delete', topic.id, 'Hapus', 'button-quiet danger-text')}</div></article>`;
    }).join('') || (state.topics.length ? empty('Materi tidak ditemukan', 'Coba kata kunci atau penyaring lain.') : empty('Belum ada materi', 'Tambahkan topik, perkiraan waktu, dan tenggat untuk mulai menyusun rencana.', action('topic-add', '', '+ Materi', 'button-primary')));
  }
  const metric = (value, label) => `<div class='metric-card'><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
  function renderPlans() {
    const plans = state.plans.filter((r) => r.date === ui.planDate).sort((a, b) => a.createdAt - b.createdAt);
    const total = plans.reduce((n, r) => n + (r.status !== 'skipped' ? r.minutes : 0), 0), done = plans.filter((r) => r.status === 'done').reduce((n, r) => n + r.minutes, 0);
    $('plan-summary').innerHTML = metric(total + ' menit', 'Direncanakan') + metric(done + ' menit', 'Sesi selesai') + metric(plans.filter((r) => r.status === 'todo').length + ' sesi', 'Belum dikerjakan');
    $('plan-list').innerHTML = plans.map((plan, index) => `<article class='plan-item ${plan.status === 'done' ? 'plan-done' : ''}'><span class='plan-number'>${plan.status === 'done' ? '✓' : String(index + 1).padStart(2, '0')}</span><div class='plan-description'><div class='topic-tags'>${badge(plan.reviewId ? 'Pengulangan' : 'Belajar')}${badge({ todo: 'Terjadwal', done: 'Selesai', skipped: 'Dilewati' }[plan.status], plan.status === 'done' ? 'tag-success' : '')}</div><h2>${esc(topicOf(plan.topicId)?.title || plan.title)}</h2><p>${esc(plan.reason || 'Sesi yang kamu atur sendiri.')}</p></div><strong class='plan-duration'>${plan.minutes} menit</strong><div class='inline-actions'>${plan.status === 'todo' ? action('plan-start', plan.id, 'Mulai', 'button-primary') + action('plan-edit', plan.id, 'Ubah', 'button-outline') + action('plan-skip', plan.id, 'Lewati', 'button-quiet') : plan.status === 'skipped' ? action('plan-restore', plan.id, 'Jadwalkan lagi', 'button-outline') : ''}${plan.status !== 'done' ? action('plan-delete', plan.id, 'Hapus', 'button-quiet danger-text') : ''}</div></article>`).join('') || empty('Belum ada rencana untuk tanggal ini', 'Susun otomatis dari peta materi, atau tambahkan sesi secara manual.', action('plan-generate', '', 'Susun rencana otomatis', 'button-primary'));
  }
  function renderReviews() {
    const pending = state.reviews.filter((r) => r.status === 'pending'), today = C.today();
    $('review-summary').innerHTML = metric(pending.filter((r) => r.due <= today).length, 'Jatuh tempo / terlewat') + metric(pending.filter((r) => r.due > today).length, 'Akan datang') + metric(state.reviews.filter((r) => r.status === 'done').length, 'Pengulangan selesai');
    const reviews = state.reviews.filter((r) => ui.reviewFilter === 'done' ? r.status === 'done' : r.status === 'pending' && (ui.reviewFilter === 'due' ? r.due <= today : ui.reviewFilter === 'upcoming' ? r.due > today : true)).sort((a, b) => a.due.localeCompare(b.due));
    $('review-list').innerHTML = reviews.map((review) => {
      const topic = topicOf(review.topicId), due = C.daysBetween(review.due, today);
      return `<article class='card review-card'><div class='card-heading'>${badge(courseOf(topic)?.name || 'Materi')}${badge(review.status === 'done' ? 'Selesai' : due < 0 ? 'Terlewat ' + -due + ' hari' : due === 0 ? 'Hari ini' : dateLabel(review.due), review.status === 'done' ? 'tag-success' : due <= 0 ? 'tag-warning' : '')}</div><h2>${esc(topic?.title || 'Materi')}</h2><p class='small-copy'>Tahap ${review.stage + 1} · ${dateLabel(review.due)}</p><p class='preserve-text review-note'>${esc(review.note || 'Coba jelaskan kembali poin penting materi tanpa melihat catatan.')}</p>${review.status === 'pending' ? `<div class='inline-actions'>${action('review-start', review.id, 'Ulangi sekarang', 'button-primary')}${action('review-edit', review.id, 'Atur tanggal', 'button-outline')}${action('review-defer', review.id, 'Besok', 'button-quiet')}${action('review-delete', review.id, 'Hapus', 'button-quiet danger-text')}</div>` : ''}</article>`;
    }).join('') || empty('Tidak ada pengulangan pada daftar ini', 'Jadwal muncul setelah checkpoint disimpan. Kamu juga bisa menjadwalkannya sendiri.', action('review-add', '', '+ Jadwal pengulangan', 'button-outline'));
  }
  function bars(values, labels) {
    const max = Math.max(1, ...Object.values(values));
    return Object.entries(values).map(([key, value]) => `<div class='analysis-bar'><div><span>${esc(labels[key])}</span><strong>${value}</strong></div><div class='mini-progress'><i style='width:${value / max * 100}%'></i></div></div>`).join('');
  }
  function renderEvaluation() {
    const start = ui.evaluationPeriod === 'all' ? '0000-01-01' : C.offset(C.today(), -(Number(ui.evaluationPeriod) - 1));
    const report = C.analytics(state, start), pending = state.checkpoints.filter((r) => !r.submitted);
    $('evaluation-summary').innerHTML = metric(report.minutes + ' menit', 'Waktu fokus') + metric(report.completedTopics + ' / ' + state.topics.length, 'Materi ditandai selesai') + metric(report.checkpoints, 'Checkpoint diisi') + metric(pending.length, 'Checkpoint belum diisi');
    $('understanding-chart').innerHTML = bars(report.ratings, ratings);
    $('barrier-chart').innerHTML = bars(report.barriers, categories) + `<p class='small-copy'>${report.interruptions} sesi dihentikan dalam rentang ini.</p>`;
    let insights = '';
    if (report.dueReviews) insights += `<p>${icon('history')} Ada ${report.dueReviews} materi yang waktunya diulang. ${action('go-reviews', '', 'Buka pengulangan', 'button-quiet')}</p>`;
    if (pending.length) insights += `<p>${icon('pencil')} Isi ${pending.length} checkpoint agar jadwal pengulangan dan evaluasimu lengkap.</p>`;
    const weak = state.topics.filter((r) => ['unsure', 'repeat'].includes(C.latestCheckpoint(state, r.id)?.rating));
    if (weak.length) insights += `<p>${icon('book')} ${weak.length} materi masih perlu penguatan menurut penilaian terakhirmu. Pecah bagian yang sulit menjadi topik lebih kecil.</p>`;
    const dominant = Object.entries(report.barriers).sort((a, b) => b[1] - a[1])[0];
    if (dominant?.[1]) insights += `<p>${icon('spark')}${esc({ phone: 'Ponsel paling sering mengganggu. Coba aktifkan mode jangan ganggu sebelum sesi.', social: 'Media sosial paling sering mengganggu. Coba jauhkan aksesnya selama satu sesi.', environment: 'Lingkungan paling sering mengganggu. Pilih tempat dan waktu belajar yang lebih tenang.', difficult: 'Materi sulit paling sering dicatat. Kurangi cakupan satu sesi dan siapkan contoh sederhana.', tired: 'Lelah paling sering dicatat. Pertimbangkan sesi lebih pendek dan istirahat yang cukup.', other: 'Tinjau catatan hambatan untuk menemukan perubahan kecil yang bisa kamu coba.' }[dominant[0]])}</p>`;
    $('learning-insights').innerHTML = insights || `<p>${icon('leaf')}Mulai satu sesi dan isi checkpoint untuk mengenali ritme belajarmu.</p>`;
    const sessionIds = new Set(state.sessions.filter((r) => r.date >= start && r.date <= C.today()).map((r) => r.id));
    const cps = state.checkpoints.filter((r) => sessionIds.has(r.sessionId) && (!ui.checkpointFilter || (ui.checkpointFilter === 'pending' ? !r.submitted : r.submitted && r.rating === ui.checkpointFilter))).sort((a, b) => b.createdAt - a.createdAt);
    $('checkpoint-count').textContent = cps.length + ' catatan';
    $('checkpoint-list').innerHTML = cps.map((cp) => `<article class='card reflection-card'><div><div class='card-heading'><h2>${esc(cp.title)}</h2>${badge(cp.submitted ? ratings[cp.rating] : 'Belum diisi', cp.submitted ? 'rating-' + cp.rating : 'tag-warning')}</div><p class='small-copy'>${timeLabel(cp.createdAt)}${cp.completedTopic ? ' · materi ditandai selesai' : ''}</p><p class='preserve-text'>${esc(cp.submitted ? cp.summary : 'Ceritakan apa yang sudah kamu pahami dari sesi ini.')}</p></div>${action('checkpoint', cp.id, cp.submitted ? 'Lihat / ubah' : 'Isi checkpoint', cp.submitted ? 'button-outline' : 'button-primary')}</article>`).join('') || empty('Belum ada checkpoint pada rentang ini', 'Selesaikan sesi fokus untuk membuat catatan pemahaman.');
    const barriers = state.distractions.filter((r) => r.date >= start && r.date <= C.today()).sort((a, b) => b.createdAt - a.createdAt);
    $('barrier-list').innerHTML = barriers.map((r) => `<article class='card reflection-card'><div><h2>${esc(categories[r.category])}</h2><p class='small-copy'>${timeLabel(r.createdAt)}${topicOf(r.topicId) ? ' · ' + esc(topicOf(r.topicId).title) : ''}</p><p class='preserve-text'>${esc(r.note || 'Tidak ada catatan tambahan.')}</p></div><div class='inline-actions'>${action('barrier-edit', r.id, 'Ubah', 'button-outline')}${action('barrier-delete', r.id, 'Hapus', 'button-quiet danger-text')}</div></article>`).join('') || `<p class='empty-inline'>Belum ada hambatan yang dicatat dalam rentang ini.</p>`;
    $('interruption-list').innerHTML = state.interruptions.filter((r) => r.date >= start && r.date <= C.today()).sort((a, b) => b.createdAt - a.createdAt).map((r) => `<article class='card reflection-card'><div><h2>${esc(r.title)}</h2><p class='small-copy'>${timeLabel(r.createdAt)} · ${esc(r.reason)}</p><p>${Math.floor(r.elapsedSeconds / 60)} menit ${r.elapsedSeconds % 60} detik sebelum dihentikan. Durasi ini tidak masuk target.</p></div></article>`).join('') || `<p class='empty-inline'>Belum ada sesi dihentikan dalam rentang ini.</p>`;
  }
  function render() { renderOverview(); renderMaterials(); renderPlans(); renderReviews(); renderEvaluation(); }

  function commit(callback) { return Store.update((s) => { const result = callback(s); C.validateState(s); return result; }); }
  let addTopicAfterCourse = false;
  function openCourse(id = '') {
    const form = openForm('course'), course = state.courses.find((r) => r.id === id);
    if (course) setValues(form, course); else form.elements.color.value = 'green';
    $('course-title').textContent = course ? 'Ubah mata pelajaran' : 'Mata pelajaran baru'; $('course-dialog').showModal();
  }
  function openTopic(id = '', courseId = '') {
    if (!state.courses.length) { addTopicAfterCourse = true; openCourse(); App.notify('Buat mata pelajaran terlebih dahulu, lalu tambahkan materinya.'); return; }
    const form = openForm('topic'), topic = topicOf(id);
    fillSelect(form.elements.courseId, state.courses.map((r) => [r.id, r.name]), '', topic?.courseId || courseId);
    form.elements.estimate.value = 60;
    if (topic) setValues(form, topic);
    $('topic-title').textContent = topic ? 'Ubah materi belajar' : 'Materi baru'; $('topic-dialog').showModal();
  }
  function openPlan(id = '') {
    if (!state.topics.length) { navigate('materi'); openTopic(); return; }
    const form = openForm('plan'), plan = state.plans.find((r) => r.id === id);
    fillSelect(form.elements.topicId, topicOptions(), 'Pilih materi', plan?.topicId || '');
    setValues(form, { date: ui.planDate, minutes: state.preferences.focus, ...plan }); $('plan-dialog').showModal();
  }
  function openReview(id = '', topicId = '') {
    if (!state.topics.length) { navigate('materi'); openTopic(); return; }
    const form = openForm('review'), review = state.reviews.find((r) => r.id === id);
    fillSelect(form.elements.topicId, topicOptions(), 'Pilih materi', review?.topicId || topicId);
    setValues(form, { due: C.offset(C.today(), 1), ...review }); form.elements.due.min = C.today();
    form.elements.topicId.disabled = Boolean(review); $('review-dialog').showModal();
  }
  function openCheckpoint(id) {
    const cp = state.checkpoints.find((r) => r.id === id); if (!cp) throw new Error('Checkpoint tidak ditemukan.');
    if (document.querySelector('dialog[open]')) { App.notify('Tutup dialog yang sedang terbuka terlebih dahulu.'); return; }
    const form = openForm('checkpoint'), topic = topicOf(cp.topicId), session = state.sessions.find((r) => r.id === cp.sessionId);
    setValues(form, { id: cp.id, summary: cp.summary });
    if (cp.rating) form.querySelector(`[name='rating'][value='${cp.rating}']`).checked = true;
    form.elements.completeTopic.disabled = !topic || topic.status === 'completed';
    form.elements.completeTopic.checked = Boolean(topic?.status === 'completed');
    $('complete-topic-label').textContent = !topic ? 'Sesi bebas / materi sudah dihapus' : topic.status === 'completed' ? 'Materi sudah ditandai selesai' : 'Tandai materi ini selesai dipelajari';
    $('checkpoint-context').textContent = cp.title + ' · ' + (session?.duration || 0) + ' menit · ' + timeLabel(cp.createdAt);
    $('checkpoint-title').textContent = cp.submitted ? 'Catatan pemahamanmu' : 'Apa yang kamu pahami?';
    $('checkpoint-dialog').showModal();
  }
  function openBarrier(id = '') {
    const form = openForm('barrier'), record = state.distractions.find((r) => r.id === id);
    const t = App.timer, wasRunning = App.pause();
    barrierContext = { timerId: t.startedAt ? t.id : null, topicId: t.topicId || state.activeTopicId, wasRunning };
    if (record) setValues(form, record);
    form.elements.resume.checked = wasRunning; $('barrier-resume-label').hidden = !wasRunning;
    $('barrier-dialog').showModal();
  }
  $('barrier-dialog').addEventListener('close', () => {
    const context = barrierContext; barrierContext = null;
    if (context?.wasRunning && $('barrier-form').elements.resume.checked && App.timer.id === context.timerId) App.resume();
  });
  function onForm(id, callback) {
    $(id).addEventListener('submit', (event) => {
      event.preventDefault(); const form = event.currentTarget;
      if (!form.reportValidity()) return;
      try { callback(form); } catch (error) { formError(form, error); }
    });
  }
  onForm('course-form', (form) => {
    const id = form.elements.id.value || C.uid('course'), name = form.elements.name.value.trim();
    if (!name) throw new Error('Nama mata pelajaran tidak boleh kosong.');
    if (state.courses.some((r) => r.id !== id && r.name.toLocaleLowerCase('id') === name.toLocaleLowerCase('id'))) throw new Error('Nama mata pelajaran tersebut sudah digunakan.');
    commit((s) => { const old = s.courses.find((r) => r.id === id); const values = { id, name, goal: form.elements.goal.value.trim(), color: form.elements.color.value, createdAt: old?.createdAt || Date.now() }; if (old) Object.assign(old, values); else s.courses.push(values); });
    $('course-dialog').close(); App.notify('Mata pelajaran disimpan.');
    if (addTopicAfterCourse) { addTopicAfterCourse = false; openTopic('', id); }
  });
  onForm('topic-form', (form) => {
    const id = form.elements.id.value || C.uid('topic');
    commit((s) => {
      const old = s.topics.find((r) => r.id === id);
      const values = { id, courseId: form.elements.courseId.value, title: form.elements.title.value.trim(), estimate: form.elements.estimate.valueAsNumber, deadline: form.elements.deadline.value, priority: form.elements.priority.value, notes: form.elements.notes.value.trim(), outcome: form.elements.outcome.value.trim(), status: old?.status || 'active', createdAt: old?.createdAt || Date.now(), completedAt: old?.completedAt || null };
      if (old) Object.assign(old, values); else s.topics.push(values);
    });
    $('topic-dialog').close(); App.notify('Materi disimpan. Sekarang kamu bisa menyusun rencananya.');
  });
  onForm('plan-form', (form) => {
    commit((s) => {
      const old = s.plans.find((r) => r.id === form.elements.id.value);
      if (old && old.status !== 'todo') throw new Error('Hanya sesi yang belum dikerjakan yang bisa diubah.');
      if (old && s.timer?.planId === old.id && s.timer.startedAt) throw new Error('Reset sesi aktif sebelum mengubah rencana ini.');
      const topic = topicOf(form.elements.topicId.value); if (!topic) throw new Error('Pilih materi terlebih dahulu.');
      const values = { id: old?.id || C.uid('plan'), topicId: topic.id, reviewId: old?.topicId === topic.id ? old.reviewId : null, date: form.elements.date.value, minutes: form.elements.minutes.valueAsNumber, status: 'todo', reason: 'Sesi yang kamu atur sendiri', title: topic.title, createdAt: old?.createdAt || Date.now(), sessionId: null };
      if (old) Object.assign(old, values); else s.plans.push(values);
      ui.planDate = values.date; $('plan-date').value = values.date;
    }); $('plan-dialog').close(); App.notify('Sesi terjadwal disimpan.');
  });
  onForm('review-form', (form) => {
    commit((s) => {
      const topicId = form.elements.topicId.value; if (!topicOf(topicId)) throw new Error('Pilih materi terlebih dahulu.');
      const byId = s.reviews.find((r) => r.id === form.elements.id.value);
      const pending = byId || s.reviews.find((r) => r.topicId === topicId && r.status === 'pending');
      if (pending?.status === 'done') throw new Error('Pengulangan yang sudah selesai tidak dapat dijadwalkan ulang.');
      if (pending) { pending.due = form.elements.due.value; pending.note = form.elements.note.value.trim(); }
      else s.reviews.push({ id: C.uid('review'), topicId, due: form.elements.due.value, stage: 0, status: 'pending', note: form.elements.note.value.trim(), createdAt: Date.now(), completedAt: null });
    }); $('review-dialog').close(); App.notify('Jadwal pengulangan disimpan.');
  });
  onForm('checkpoint-form', (form) => {
    commit((s) => C.saveCheckpoint(s, form.elements.id.value, { summary: form.elements.summary.value, rating: form.elements.rating.value, completeTopic: !form.elements.completeTopic.disabled && form.elements.completeTopic.checked }));
    const saved = state.checkpoints.find((r) => r.id === form.elements.id.value);
    $('checkpoint-dialog').close(); App.notify('Checkpoint tersimpan.' + (topicOf(saved?.topicId) ? ' Jadwal pengulangan sudah diperbarui.' : ''));
  });
  onForm('barrier-form', (form) => {
    commit((s) => {
      const old = s.distractions.find((r) => r.id === form.elements.id.value);
      if (old) { old.category = form.elements.category.value; old.note = form.elements.note.value.trim(); }
      else s.distractions.push({ id: C.uid('barrier'), topicId: barrierContext?.topicId || null, timerId: barrierContext?.timerId || null, date: C.today(), category: form.elements.category.value, note: form.elements.note.value.trim(), createdAt: Date.now() });
    }); $('barrier-dialog').close(); App.notify('Hambatan dicatat untuk evaluasi belajarmu.');
  });
  async function runAction(name, id) {
    if (name === 'go-materials') return navigate('materi');
    if (name === 'go-plan') return navigate('rencana');
    if (name === 'go-reviews') return navigate('pengulangan');
    if (name === 'course-add') return openCourse();
    if (name === 'course-edit') return openCourse(id);
    if (name === 'course-delete') {
      if (await confirm('Hapus mata pelajaran?', 'Materi, rencana, dan jadwal pengulangannya akan dihapus. Riwayat sesi serta checkpoint tetap disimpan.')) commit((s) => C.removeCourse(s, id));
      return;
    }
    if (name === 'topic-add') return openTopic('', id);
    if (name === 'topic-edit') return openTopic(id);
    if (name === 'topic-delete') {
      if (await confirm('Hapus materi ini?', 'Rencana dan pengulangan yang terhubung akan dihapus. Riwayat belajar dan catatan pemahaman tetap disimpan.')) commit((s) => C.removeTopic(s, id));
      return;
    }
    if (name === 'topic-toggle') {
      const topic = topicOf(id); if (!topic) throw new Error('Materi tidak ditemukan.');
      commit((s) => C.setTopicCompleted(s, topic, topic.status !== 'completed')); return;
    }
    if (name === 'topic-start') return App.startLearning({ topicId: id });
    if (name === 'plan-add') return openPlan();
    if (name === 'plan-edit') return openPlan(id);
    if (name === 'plan-generate') {
      if (!$('plan-date').reportValidity() || !$('plan-budget').reportValidity()) return;
      if (!state.topics.length) { navigate('materi'); return openTopic(); }
      const day = $('plan-date').value, budget = $('plan-budget').valueAsNumber;
      if (state.plans.some((r) => r.date === day && r.status !== 'done' && r.id !== state.timer?.planId) && !await confirm('Susun ulang rencana?', 'Sesi belum dikerjakan dan sesi dilewati pada tanggal ini akan diganti. Sesi selesai dan sesi yang sedang berjalan tetap dipertahankan.')) return;
      ui.planDate = day;
      const plans = commit((s) => C.generatePlan(s, day, budget));
      App.notify(plans.length ? plans.length + ' sesi berhasil disusun berdasarkan prioritas.' : 'Tidak ada sesi baru. Anggaran sudah terpenuhi atau semua materi selesai.'); return;
    }
    if (name.startsWith('plan-')) {
      const plan = state.plans.find((r) => r.id === id); if (!plan) throw new Error('Rencana tidak ditemukan.');
      if (name === 'plan-start') {
        if (plan.date > C.today() && !await confirm('Mulai rencana lebih awal?', 'Rencana ini untuk ' + dateLabel(plan.date) + '. Sesi belajar akan dicatat pada tanggal penyelesaiannya.')) return;
        return App.startLearning({ topicId: plan.topicId, planId: plan.id, reviewId: plan.reviewId, minutes: plan.minutes });
      }
      if (state.timer?.planId === id && state.timer.startedAt) throw new Error('Reset sesi aktif sebelum mengubah rencananya.');
      if (name === 'plan-skip') commit(() => { plan.status = 'skipped'; });
      if (name === 'plan-restore') commit(() => { plan.status = 'todo'; });
      if (name === 'plan-delete' && await confirm('Hapus sesi dari rencana?', 'Materi dan riwayat belajarnya tetap tersimpan.')) commit((s) => { s.plans = s.plans.filter((r) => r.id !== id); });
      return;
    }
    if (name === 'review-add') return openReview('', id);
    if (name === 'review-edit') return openReview(id);
    if (name.startsWith('review-')) {
      const review = state.reviews.find((r) => r.id === id); if (!review) throw new Error('Pengulangan tidak ditemukan.');
      if (name === 'review-start') return App.startLearning({ topicId: review.topicId, reviewId: review.id });
      if (state.timer?.reviewId === id && state.timer.startedAt) throw new Error('Reset sesi pengulangan aktif terlebih dahulu.');
      if (name === 'review-defer') commit(() => { review.due = C.offset(C.today(), 1); });
      if (name === 'review-delete' && await confirm('Hapus jadwal pengulangan?', 'Materi dan checkpoint tetap disimpan. Rencana pengulangan yang belum dikerjakan juga akan dihapus.')) commit((s) => { s.reviews = s.reviews.filter((r) => r.id !== id); s.plans = s.plans.filter((r) => r.reviewId !== id || r.status !== 'todo'); });
      return;
    }
    if (name === 'checkpoint') return openCheckpoint(id);
    if (name === 'barrier-add') return openBarrier();
    if (name === 'barrier-edit') return openBarrier(id);
    if (name === 'barrier-delete' && await confirm('Hapus catatan hambatan?', 'Catatan ini juga akan dikeluarkan dari ringkasan evaluasi.')) commit((s) => { s.distractions = s.distractions.filter((r) => r.id !== id); });
  }
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
    button.disabled = true;
    try { await runAction(button.dataset.action, button.dataset.id || ''); }
    catch (error) { App.notify(error.message); }
    finally { if (button.isConnected) button.disabled = false; }
  });
  $('material-search').addEventListener('input', () => { ui.search = $('material-search').value; renderMaterials(); });
  $('material-course').addEventListener('change', () => { ui.course = $('material-course').value; renderMaterials(); });
  $('material-status').addEventListener('change', () => { ui.status = $('material-status').value; renderMaterials(); });
  $('plan-date').addEventListener('change', () => { if (C.validDate($('plan-date').value)) { ui.planDate = $('plan-date').value; renderPlans(); } });
  $('review-filter').addEventListener('change', () => { ui.reviewFilter = $('review-filter').value; renderReviews(); });
  $('evaluation-period').addEventListener('change', () => { ui.evaluationPeriod = $('evaluation-period').value; renderEvaluation(); });
  $('checkpoint-filter').addEventListener('change', () => { ui.checkpointFilter = $('checkpoint-filter').value; renderEvaluation(); });
  $('log-barrier').addEventListener('click', () => openBarrier());
  $('data-button').addEventListener('click', () => {
    const isDb = Store.dbStatus?.connected;
    const dbText = isDb
      ? ' · Database: MySQL Lokal (XAMPP pomo_db)'
      : ' · Database: Penyimpanan lokal browser';
    $('data-summary').textContent = state.courses.length + ' mata pelajaran · ' + state.topics.length + ' materi · ' + state.sessions.length + ' sesi · ' + state.checkpoints.length + ' checkpoint' + dbText + '.';
    $('clear-samples').hidden = !state.sessions.some((r) => r.sample); $('data-error').textContent = ''; $('data-dialog').showModal();
  });
  $('export-data').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(Store.exportData(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'pomo-cadangan-' + C.today() + '.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    App.notify('Cadangan JSON siap diunduh.');
  });
  $('import-file').addEventListener('change', async () => {
    ui.pendingImport = null; $('import-preview').hidden = true; $('import-apply').hidden = true; $('data-error').textContent = '';
    const file = $('import-file').files[0]; if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Berkas terlalu besar. Maksimal 5 MB.');
      ui.pendingImport = Store.parseBackup(JSON.parse(await file.text()));
      $('import-preview').textContent = 'Cadangan valid: ' + ui.pendingImport.courses.length + ' mata pelajaran, ' + ui.pendingImport.topics.length + ' materi, dan ' + ui.pendingImport.sessions.length + ' sesi. Data saat ini akan diganti setelah kamu mengonfirmasi.';
      $('import-preview').hidden = false; $('import-apply').hidden = false;
    } catch (error) { $('data-error').textContent = 'Impor ditolak: ' + error.message; }
  });
  $('import-apply').addEventListener('click', async () => {
    if (!ui.pendingImport) return;
    $('data-dialog').close();
    if (!await confirm('Ganti data dengan cadangan?', 'Seluruh data aplikasi saat ini akan diganti. Ekspor data saat ini terlebih dahulu jika masih diperlukan. Timer aktif akan dihentikan.')) { $('data-dialog').showModal(); return; }
    try { Store.replace(ui.pendingImport); ui.pendingImport = null; $('import-file').value = ''; $('import-preview').hidden = true; $('import-apply').hidden = true; App.notify('Cadangan berhasil dipulihkan.'); }
    catch (error) { $('data-error').textContent = error.message; $('data-dialog').showModal(); }
  });
  $('clear-samples').addEventListener('click', async () => {
    $('data-dialog').close();
    if (!await confirm('Hapus riwayat contoh?', 'Sesi asli dan seluruh materi buatanmu tetap disimpan.')) return;
    commit((s) => { const removed = new Set(s.sessions.filter((r) => r.sample).map((r) => r.id)); s.sessions = s.sessions.filter((r) => !r.sample); s.checkpoints = s.checkpoints.filter((r) => !removed.has(r.sessionId)); });
    App.notify('Riwayat contoh sudah dihapus.');
  });
  document.querySelectorAll('.navigation a').forEach((link) => link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(link.hash.slice(1));
  }));
  window.addEventListener('hashchange', applyRoute);
  Store.subscribe(render);
  window.PomoLearning = { navigate, render, openCheckpoint, confirm };
  applyRoute();
})();
