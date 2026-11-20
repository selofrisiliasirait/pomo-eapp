"use strict";
(() => {
  const Core = window.PomoCore;
  const Store = window.PomoStore;
  const state = Store.state;
  const $ = (id) => document.getElementById(id);
  const names = { focus: "Fokus", short: "Istirahat pendek", long: "Istirahat panjang" };
  const scenes = { forest: "Hutan yang tenang", sunset: "Senja yang hangat", night: "Malam yang hening" };
  let finishing = false, immersive = false, previousFocus = null, expandedHistory = false, toastTimeout;
  function createTimer(mode = "focus", context = {}) {
    const topic = state.topics.find((r) => r.id === (context.topicId || state.activeTopicId));
    const course = state.courses.find((r) => r.id === topic?.courseId);
    const minutes = context.minutes || state.preferences[mode];
    return { id: Core.uid("timer"), mode, minutes, remaining: minutes * 60, running: false, deadline: null, startedAt: null, title: topic?.title || state.topic || "Sesi fokus", courseName: course?.name || "", topicId: topic?.id || null, planId: context.planId || null, reviewId: context.reviewId || null };
  }
  function timer() { return state.timer || (state.timer = createTimer()); }
  function remaining(t = timer()) { return t.running ? Math.max(0, Math.ceil((t.deadline - Date.now()) / 1000)) : t.remaining; }
  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon"); svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#i-" + name); svg.append(use); return svg;
  }
  function notify(message) {
    clearTimeout(toastTimeout); $("toast").textContent = message; $("toast").classList.add("visible");
    toastTimeout = setTimeout(() => $("toast").classList.remove("visible"), 4500);
  }
  function durationMarkup(minutes) {
    const hours = Math.floor(minutes / 60), rest = minutes % 60;
    return hours ? hours + " <small>jam</small>" + (rest ? " " + rest + " <small>menit</small>" : "") : rest + " <small>menit</small>";
  }
  function weekDates(offset = 0) {
    const today = Core.today(), weekday = new Date(today + "T00:00:00Z").getUTCDay();
    return Array.from({ length: 7 }, (_, index) => Core.offset(today, -((weekday + 6) % 7) - offset * 7 + index));
  }
  const sum = (items) => items.reduce((n, r) => n + r.duration, 0);
  function renderChart() {
    const dates = weekDates(Number($("chart-period").value));
    const values = dates.map((date) => sum(state.sessions.filter((r) => r.date === date)));
    const ceiling = Math.max(180, Math.ceil(Math.max(...values) / 60) * 60);
    $("axis-top").textContent = ceiling + " m"; $("axis-middle").textContent = ceiling / 2 + " m";
    $("chart-total").innerHTML = durationMarkup(values.reduce((a, b) => a + b, 0));
    $("chart-bars").replaceChildren(...dates.map((date, index) => {
      const column = document.createElement("div"); column.className = "chart-column" + (date === Core.today() ? " is-today" : "");
      column.tabIndex = 0; column.setAttribute("role", "img");
      const fullDate = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(date + "T00:00:00Z"));
      column.setAttribute("aria-label", fullDate + ": " + values[index] + " menit fokus");
      const area = document.createElement("div"); area.className = "chart-bar-area";
      const bar = document.createElement("span"); bar.className = "chart-bar"; bar.style.height = values[index] / ceiling * 100 + "%";
      const tooltip = document.createElement("span"); tooltip.className = "chart-tooltip"; tooltip.textContent = values[index] + " menit";
      const label = document.createElement("span"); label.className = "chart-day"; label.textContent = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][index];
      bar.append(tooltip); area.append(bar); column.append(area, label); return column;
    }));
    const days = values.filter(Boolean).length;
    $("chart-insight").textContent = days ? "Kamu belajar di " + days + " hari " + (Number($("chart-period").value) ? "minggu lalu." : "minggu ini.") : "Sesi fokus pertamamu akan muncul di sini.";
  }
  function renderHistory() {
    const sorted = [...state.sessions].sort((a, b) => b.endedAt - a.endedAt);
    const visible = expandedHistory ? sorted : sorted.slice(0, 3);
    $("history-count").textContent = sorted.length + " sesi";
    const formatTime = (value) => new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: Core.ZONE }).format(new Date(value));
    $("history-list").replaceChildren(...visible.map((session) => {
      const row = document.createElement("div"); row.className = "history-entry";
      const badge = document.createElement("span"); badge.className = "history-icon"; badge.append(icon("book"));
      const desc = document.createElement("div"); desc.className = "history-description";
      const title = document.createElement("strong"); title.textContent = session.title; title.title = session.title;
      const sub = document.createElement("span");
      const date = session.date === Core.today() ? "Hari ini" : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: Core.ZONE }).format(new Date(session.endedAt));
      sub.textContent = date + " · " + formatTime(session.startedAt) + " – " + formatTime(session.endedAt) + (session.sample ? " · contoh" : "");
      desc.append(title, sub);
      const duration = document.createElement("div"); duration.className = "history-duration";
      const value = document.createElement("strong"); value.textContent = session.duration + " menit";
      const cp = state.checkpoints.find((r) => r.sessionId === session.id);
      const detail = document.createElement("button"); detail.type = "button"; detail.className = "text-link"; detail.style.fontSize = "9px";
      detail.textContent = cp ? cp.submitted ? "Lihat checkpoint" : "Isi checkpoint" : "Selesai";
      if (cp) { detail.dataset.action = "checkpoint"; detail.dataset.id = cp.id; } else detail.disabled = true;
      duration.append(value, detail); row.append(badge, desc, duration); return row;
    }));
    if (!visible.length) { const empty = document.createElement("p"); empty.className = "history-empty"; empty.textContent = "Belum ada sesi selesai. Pilih materi dan mulai sesi pertamamu."; $("history-list").append(empty); }
    $("history-more").hidden = sorted.length <= 3;
    $("history-more").replaceChildren(document.createTextNode(expandedHistory ? "Tampilkan lebih sedikit" : "Lihat semua riwayat"), icon("arrow"));
    $("history-more").setAttribute("aria-expanded", String(expandedHistory));
  }
  function renderTotals() {
    const date = Core.today(), sessions = state.sessions.filter((r) => r.date === date), total = sum(sessions);
    $("today-total").innerHTML = durationMarkup(total); $("today-sessions").innerHTML = sessions.length + " <small>sesi</small>";
    const week = new Set(weekDates()); $("week-total").innerHTML = durationMarkup(sum(state.sessions.filter((r) => week.has(r.date))));
    $("today-date").textContent = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: Core.ZONE }).format(new Date());
    $("today-date").dateTime = date;
    $("goal-current").textContent = total; $("goal-total").textContent = state.preferences.goal;
    $("goal-caption").textContent = sessions.length + " sesi fokus selesai";
    const percentage = Math.min(100, Math.round(total / state.preferences.goal * 100));
    $("goal-percent").textContent = percentage + "%"; $("goal-fill").style.width = percentage + "%";
    $("goal-progress").setAttribute("aria-valuemax", state.preferences.goal);
    $("goal-progress").setAttribute("aria-valuenow", Math.min(total, state.preferences.goal));
    $("goal-progress").setAttribute("aria-valuetext", total + " dari " + state.preferences.goal + " menit");
    $("goal-message").replaceChildren(icon("spark"), document.createTextNode(total >= state.preferences.goal ? "Target tercapai. Nikmati hasil usahamu!" : state.preferences.goal - total + " menit lagi menuju target harian."));
    const samples = state.sessions.some((r) => r.sample);
    document.querySelector(".sample-label").hidden = !samples;
    const isDb = Store.dbStatus?.connected;
    $("data-mode-label").textContent = isDb
      ? (samples ? "MySQL Lokal (Riwayat contoh)" : "MySQL Lokal (XAMPP - pomo_db)")
      : (samples ? "Memuat riwayat contoh" : "Tersimpan di perangkat ini");
    $("data-mode-label").closest(".preview-badge")?.classList.toggle("is-mysql", Boolean(isDb));
    $("storage-warning").hidden = !Store.warning; $("storage-warning").textContent = Store.warning;
    const days = new Set(state.sessions.map((r) => r.date)); let cursor = days.has(date) ? date : Core.offset(date, -1), streak = 0;
    while (days.has(cursor)) { streak++; cursor = Core.offset(cursor, -1); }
    $("streak-count").textContent = streak; $("garden-sessions").textContent = sessions.length;
    $("garden-stage").textContent = ["Benih hari ini", "Mulai berakar", "Daun mulai tumbuh", "Semakin rimbun", "Tumbuh subur"][Math.min(4, sessions.length)];
    $("garden-message").textContent = sessions.length >= 4 ? "Empat daun, satu kebiasaan baik. Terus rawat ritmemu." : sessions.length ? 4 - sessions.length + " sesi lagi untuk menumbuhkan seluruh daun." : "Mulai satu sesi. Biarkan hal baik tumbuh dari sana.";
    document.querySelectorAll("[data-leaf]").forEach((leaf) => leaf.classList.toggle("is-dormant", Number(leaf.dataset.leaf) > sessions.length));
    renderChart(); renderHistory();
  }
  function renderScene() {
    $("focus-studio").dataset.scene = state.scene; $("scene-caption").textContent = scenes[state.scene];
    document.querySelectorAll("[data-scene-option]").forEach((button) => { const on = button.dataset.sceneOption === state.scene; button.classList.toggle("active", on); button.setAttribute("aria-pressed", String(on)); });
  }
  function renderSelection() {
    const t = timer(), selected = t.topicId || state.activeTopicId || "";
    const select = $("focus-topic-select");
    const free = document.createElement("option"); free.value = ""; free.textContent = "Belajar bebas — tanpa materi";
    select.replaceChildren(free, ...state.topics.map((topic) => {
      const option = document.createElement("option"); option.value = topic.id;
      option.textContent = (state.courses.find((r) => r.id === topic.courseId)?.name || "Materi") + " · " + topic.title + (topic.status === "completed" ? " (selesai)" : ""); return option;
    }));
    select.value = selected; select.disabled = Boolean(t.startedAt);
    $("study-topic").hidden = Boolean(selected); $("study-topic").disabled = Boolean(t.startedAt);
    if (document.activeElement !== $("study-topic")) $("study-topic").value = state.topic;
  }
  function renderClock() {
    const t = timer(), left = remaining(t);
    $("focus-studio").classList.toggle("is-running", t.running);
    $("timer-display").textContent = String(Math.floor(left / 60)).padStart(2, "0") + ":" + String(left % 60).padStart(2, "0");
    document.title = t.running ? $("timer-display").textContent + " · " + names[t.mode] + " — Pomo" : "Pomo — Pendamping belajar";
    $("dial-progress").style.strokeDashoffset = 804.25 * (1 - left / (t.minutes * 60));
    const label = t.running ? "Jeda sesi" : t.startedAt ? "Lanjutkan sesi" : t.mode === "focus" ? "Mulai fokus" : "Mulai istirahat";
    $("start-button").replaceChildren(icon(t.running ? "pause" : "play"), Object.assign(document.createElement("span"), { textContent: label }));
    $("start-button").disabled = finishing;
    $("timer-context").textContent = t.mode === "focus" ? t.reviewId ? "PENGULANGAN MATERI" : "SAATNYA BELAJAR" : "WAKTUNYA MENGISI ENERGI";
    $("timer-state").replaceChildren(document.createElement("span"), document.createTextNode(t.running ? "Satu hal, satu waktu" : t.startedAt ? "Dijeda. Ambil waktumu" : "Siap saat kamu siap"));
    $("session-label").textContent = "Sesi " + (state.cycle + 1) + " dari 4";
    [...$("session-dots").children].forEach((dot, index) => { dot.className = index < state.cycle ? "done" : index === state.cycle ? "current" : ""; });
    document.querySelectorAll(".mode-button").forEach((button) => { const selected = button.dataset.mode === t.mode; button.classList.toggle("active", selected); button.setAttribute("aria-pressed", String(selected)); });
  }
  function interrupt(reason) {
    const t = timer();
    if (t.mode === "focus" && t.startedAt) state.interruptions.push({ id: Core.uid("interruption"), topicId: t.topicId, title: t.title, date: Core.today(), reason, elapsedSeconds: Math.max(0, Math.min(7200, t.minutes * 60 - remaining(t))), createdAt: Date.now() });
  }
  function reset(mode = timer().mode, reason = "Reset timer") {
    interrupt(reason); state.timer = createTimer(mode); Store.save(); notify("Timer kembali ke awal. Waktu sesi terhenti tidak dihitung ke target.");
  }
  function pause() { const t = timer(); if (!t.running) return false; if (remaining(t) === 0) { finish(); return false; } t.remaining = remaining(t); t.running = false; t.deadline = null; Store.save(); return true; }
  function resume() {
    const t = timer();
    if (t.running || finishing) return;
    if (!t.startedAt) {
      const topic = state.topics.find((r) => r.id === (t.topicId || state.activeTopicId));
      t.topicId = topic?.id || null; t.title = topic?.title || $("study-topic").value.trim() || "Sesi fokus";
      t.courseName = state.courses.find((r) => r.id === topic?.courseId)?.name || "";
      t.startedAt = Date.now(); state.topic = $("study-topic").value.trim();
    }
    t.running = true; t.deadline = Date.now() + t.remaining * 1000; Store.save();
  }
  async function finish() {
    if (finishing) return;
    const current = { ...timer() }; finishing = true; renderClock();
    try {
      const session = await Store.complete(current);
      if (session) {
        if (immersive) setImmersive(false);
        notify("Sesi selesai. Catat apa yang kamu pahami sebelum beristirahat.");
        const checkpoint = state.checkpoints.find((r) => r.sessionId === session.id);
        if (checkpoint && !document.querySelector("dialog[open]")) window.PomoLearning?.openCheckpoint(checkpoint.id);
      } else if (current.mode !== "focus") notify("Istirahat selesai. Siap melanjutkan belajar?");
    } catch (error) { pause(); notify("Sesi belum dapat disimpan: " + error.message); }
    finally { finishing = false; renderAll(); }
  }
  function toggle() { if (finishing) return; if (timer().running && remaining() === 0) { finish(); return; } timer().running ? pause() : resume(); }
  async function startLearning(context) {
    const topic = state.topics.find((r) => r.id === context.topicId);
    if (!topic) throw new Error("Materi ini sudah tidak tersedia.");
    const plan = context.planId ? state.plans.find((r) => r.id === context.planId) : null;
    if (context.planId && (!plan || plan.status !== "todo")) throw new Error("Rencana ini sudah selesai atau dilewati.");
    const review = context.reviewId ? state.reviews.find((r) => r.id === context.reviewId) : null;
    if (context.reviewId && (!review || review.status !== "pending")) throw new Error("Pengulangan ini sudah selesai atau dihapus.");
    const current = timer();
    if (current.startedAt) {
      if (current.planId && current.planId === context.planId) { window.PomoLearning?.navigate("ringkasan"); return; }
      const accepted = window.PomoLearning ? await window.PomoLearning.confirm("Ganti sesi yang sedang berjalan?", "Sesi aktif akan dihentikan dan tidak dihitung sebagai sesi selesai.") : window.confirm("Hentikan sesi aktif dan mulai materi baru?");
      if (!accepted) return;
      interrupt("Beralih ke materi lain");
    }
    state.activeTopicId = topic.id;
    state.timer = createTimer("focus", { ...context, minutes: context.minutes || plan?.minutes || state.preferences.focus });
    Store.save(); window.PomoLearning?.navigate("ringkasan"); resume();
    $("focus-studio").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function setImmersive(enabled) {
    if (enabled === immersive) return;
    immersive = enabled; if (enabled) previousFocus = document.activeElement;
    document.body.classList.toggle("is-immersive", enabled);
    $("immersive-button").setAttribute("aria-pressed", String(enabled));
    $("immersive-button").setAttribute("aria-label", enabled ? "Keluar mode fokus" : "Masuk mode fokus");
    $("immersive-button").replaceChildren(icon(enabled ? "close" : "expand"));
    document.querySelectorAll(".sidebar, .topbar, .page-heading, .summary-strip, .right-column, .activity-grid, .page-footer, #learning-overview, #learning-pages").forEach((el) => { el.inert = enabled; });
    if (enabled) { $("focus-studio").setAttribute("role", "dialog"); $("focus-studio").setAttribute("aria-modal", "true"); $("start-button").focus({ preventScroll: true }); }
    else { $("focus-studio").removeAttribute("role"); $("focus-studio").removeAttribute("aria-modal"); (previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : $("immersive-button")).focus({ preventScroll: true }); }
  }
  function renderAll() { renderClock(); renderSelection(); renderScene(); renderTotals(); }
  $("start-button").addEventListener("click", toggle);
  $("reset-button").addEventListener("click", () => reset());
  document.querySelectorAll(".mode-button").forEach((button) => button.addEventListener("click", () => { if (timer().mode !== button.dataset.mode) reset(button.dataset.mode, "Mengganti jenis sesi"); }));
  $("focus-topic-select").addEventListener("change", () => { state.activeTopicId = $("focus-topic-select").value || null; state.timer = createTimer(timer().mode); Store.save(); });
  $("study-topic").addEventListener("change", () => { state.topic = $("study-topic").value.trim(); if (!timer().startedAt) timer().title = state.topic || "Sesi fokus"; Store.save(); });
  $("chart-period").addEventListener("change", renderChart);
  $("history-more").addEventListener("click", () => { expandedHistory = !expandedHistory; renderHistory(); });
  document.querySelectorAll("[data-scene-option]").forEach((button) => button.addEventListener("click", () => { state.scene = button.dataset.sceneOption; Store.save(); }));
  $("immersive-button").addEventListener("click", () => setImmersive(!immersive));
  $("exit-immersive").addEventListener("click", () => setImmersive(false));
  document.querySelectorAll(".settings-trigger").forEach((button) => button.addEventListener("click", () => { for (const key of ["focus", "short", "long"]) $(key + "-duration").value = state.preferences[key]; $("settings-dialog").showModal(); }));
  $("settings-form").addEventListener("submit", (event) => {
    event.preventDefault(); if (!event.currentTarget.reportValidity()) return;
    interrupt("Mengubah durasi timer");
    for (const key of ["focus", "short", "long"]) state.preferences[key] = $(key + "-duration").valueAsNumber;
    state.timer = createTimer(timer().mode); Store.save(); $("settings-dialog").close(); notify("Durasi disimpan. Rencana berikutnya menggunakan pengaturan baru.");
  });
  $("edit-goal").addEventListener("click", () => { $("daily-goal").value = state.preferences.goal; $("goal-dialog").showModal(); });
  document.querySelectorAll("[data-goal]").forEach((button) => button.addEventListener("click", () => { $("daily-goal").value = button.dataset.goal; }));
  $("goal-form").addEventListener("submit", (event) => { event.preventDefault(); if (!event.currentTarget.reportValidity()) return; state.preferences.goal = $("daily-goal").valueAsNumber; Store.save(); $("goal-dialog").close(); notify("Target harian diperbarui."); });
  $("help-button").addEventListener("click", () => $("help-dialog").showModal());
  document.addEventListener("click", (event) => { const button = event.target.closest("[data-close-dialog]"); if (button) button.closest("dialog")?.close(); });
  document.addEventListener("keydown", (event) => {
    if (document.querySelector("dialog[open]")) return;
    if (event.code === "Escape" && immersive) { event.preventDefault(); setImmersive(false); return; }
    if (event.code === "Tab" && immersive) {
      const controls = [...$("focus-studio").querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled])")].filter((el) => el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      return;
    }
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.code === "KeyF" && !$("workspace-overview").hidden && !event.target.closest("input, textarea, select, [contenteditable]")) { event.preventDefault(); setImmersive(!immersive); return; }
    if (event.code !== "Space" || event.target.closest("input, textarea, select, button, a, [contenteditable]") || $("workspace-overview").hidden) return;
    event.preventDefault(); toggle();
  });
  let previousDate = Core.today();
  setInterval(() => {
    if (timer().running) { if (remaining() === 0) finish(); else renderClock(); }
    if (Core.today() !== previousDate) { previousDate = Core.today(); renderAll(); window.PomoLearning?.render(); }
  }, 250);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { if (timer().running && remaining() === 0) finish(); else renderAll(); window.PomoLearning?.render(); } });
  Store.subscribe(renderAll);
  window.PomoApp = { notify, startLearning, pause, resume, reset, setImmersive, get timer() { return timer(); }, get running() { return timer().running; } };
  renderAll();
  if (timer().running && remaining() === 0) setTimeout(finish, 0);
})();
