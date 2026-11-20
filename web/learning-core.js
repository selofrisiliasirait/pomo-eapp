/* Domain rules shared by the browser and Node's built-in test runner. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PomoCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const ZONE = "Asia/Jakarta";
  const DAY = 86400000;
  const RATINGS = ["understood", "unsure", "repeat"];
  const CATEGORIES = ["phone", "social", "environment", "difficult", "tired", "other"];
  const DEFAULTS = { focus: 25, short: 5, long: 15, goal: 150 };
  function uid(prefix = "item") { return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`}`; }
  function today(value = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
    return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type).value).join("-");
  }
  function validDate(value) { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value; }
  function offset(date, days) { if (!validDate(date)) throw new Error("Tanggal tidak valid."); return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10); }
  function daysBetween(a, b) { return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY); }
  function emptyState() { return { version: 2, preferences: { ...DEFAULTS }, scene: "forest", topic: "", cycle: 0, activeTopicId: null, timer: null, courses: [], topics: [], plans: [], reviews: [], checkpoints: [], distractions: [], interruptions: [], sessions: [], updatedAt: Date.now() }; }
  function integer(value, min, max, label) { if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label} harus berupa bilangan ${min}–${max}.`); return value; }
  function text(value, max, label, required = false) { if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new Error(`${label} tidak valid (maksimal ${max} karakter).`); return value.trim(); }
  function identifier(value, nullable = false) { if (nullable && (value === null || value === undefined)) return null; if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new Error("Identitas data tidak valid."); return value; }
  function timestamp(value, label = "Waktu") { if (!Number.isFinite(value) || value < 0 || value > 8640000000000000) throw new Error(`${label} tidak valid.`); return value; }
  function choice(value, options, label) { if (!options.includes(value)) throw new Error(`${label} tidak valid.`); return value; }
  function date(value, optional = false) { if (optional && (value === "" || value === null || value === undefined)) return ""; if (!validDate(value)) throw new Error("Tanggal tidak valid."); return value; }
  function records(value, label, mapper) {
    if (!Array.isArray(value) || value.length > 20000) throw new Error(`Daftar ${label} tidak valid atau terlalu besar.`);
    const ids = new Set();
    return value.map((record) => {
      if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error(`Data ${label} tidak valid.`);
      const result = mapper(record);
      if (ids.has(result.id)) throw new Error(`Identitas ${label} duplikat.`);
      ids.add(result.id); return result;
    });
  }
  function validateState(raw) {
    if (!raw || raw.version !== 2) throw new Error("Versi cadangan tidak didukung.");
    const state = emptyState();
    for (const [key, max] of Object.entries({ focus: 120, short: 60, long: 60, goal: 1440 })) state.preferences[key] = integer(raw.preferences?.[key], key === "goal" ? 5 : 1, max, "Pengaturan");
    state.scene = choice(raw.scene, ["forest", "sunset", "night"], "Suasana");
    state.topic = text(raw.topic ?? "", 160, "Topik aktif");
    state.cycle = integer(raw.cycle ?? 0, 0, 3, "Siklus");
    state.activeTopicId = identifier(raw.activeTopicId, true);
    state.courses = records(raw.courses, "mata pelajaran", (r) => ({ id: identifier(r.id), name: text(r.name, 100, "Nama mata pelajaran", true), goal: text(r.goal ?? "", 1000, "Tujuan"), color: choice(r.color, ["green", "orange", "blue", "purple", "pink"], "Warna"), createdAt: timestamp(r.createdAt) }));
    const courseIds = new Set(state.courses.map((r) => r.id));
    state.topics = records(raw.topics, "materi", (r) => {
      if (!courseIds.has(r.courseId)) throw new Error("Mata pelajaran untuk materi tidak ditemukan.");
      return { id: identifier(r.id), courseId: identifier(r.courseId), title: text(r.title, 160, "Judul materi", true), estimate: integer(r.estimate, 1, 6000, "Estimasi belajar"), deadline: date(r.deadline, true), priority: choice(r.priority, ["low", "normal", "high"], "Prioritas"), notes: text(r.notes ?? "", 4000, "Catatan materi"), outcome: text(r.outcome ?? "", 1000, "Target pemahaman"), status: choice(r.status, ["active", "completed"], "Status materi"), createdAt: timestamp(r.createdAt), completedAt: r.completedAt == null ? null : timestamp(r.completedAt) };
    });
    const topicIds = new Set(state.topics.map((r) => r.id));
    if (state.activeTopicId && !topicIds.has(state.activeTopicId)) state.activeTopicId = null;
    state.sessions = records(raw.sessions, "sesi", (r) => ({ id: identifier(r.id), date: date(r.date), startedAt: timestamp(r.startedAt), endedAt: timestamp(r.endedAt), duration: integer(r.duration, 1, 120, "Durasi sesi"), title: text(r.title, 160, "Judul sesi", true), courseName: text(r.courseName ?? "", 100, "Nama mata pelajaran"), topicId: identifier(r.topicId, true), planId: identifier(r.planId, true), reviewId: identifier(r.reviewId, true), sample: r.sample === true }));
    state.reviews = records(raw.reviews, "pengulangan", (r) => {
      if (!topicIds.has(r.topicId)) throw new Error("Materi untuk pengulangan tidak ditemukan.");
      return { id: identifier(r.id), topicId: identifier(r.topicId), due: date(r.due), stage: integer(r.stage, 0, 4, "Tahap pengulangan"), status: choice(r.status, ["pending", "done"], "Status pengulangan"), note: text(r.note ?? "", 1000, "Catatan pengulangan"), createdAt: timestamp(r.createdAt), completedAt: r.completedAt == null ? null : timestamp(r.completedAt) };
    });
    const reviewIds = new Set(state.reviews.map((r) => r.id));
    const pendingTopics = state.reviews.filter((r) => r.status === "pending").map((r) => r.topicId);
    if (new Set(pendingTopics).size !== pendingTopics.length) throw new Error("Ada pengulangan aktif yang duplikat untuk satu materi.");
    state.plans = records(raw.plans, "rencana", (r) => {
      if (!topicIds.has(r.topicId) && r.status === "todo") throw new Error("Materi pada rencana tidak ditemukan.");
      if (r.reviewId && !reviewIds.has(r.reviewId) && r.status === "todo") throw new Error("Pengulangan pada rencana tidak ditemukan.");
      return { id: identifier(r.id), topicId: identifier(r.topicId), reviewId: identifier(r.reviewId, true), date: date(r.date), minutes: integer(r.minutes, 1, 120, "Durasi rencana"), status: choice(r.status, ["todo", "done", "skipped"], "Status rencana"), reason: text(r.reason ?? "", 300, "Alasan prioritas"), title: text(r.title ?? "Materi belajar", 160, "Judul rencana", true), createdAt: timestamp(r.createdAt), sessionId: identifier(r.sessionId, true) };
    });
    const sessionIds = new Set(state.sessions.map((r) => r.id));
    state.checkpoints = records(raw.checkpoints, "checkpoint", (r) => {
      if (!sessionIds.has(r.sessionId)) throw new Error("Sesi checkpoint tidak ditemukan.");
      return { id: identifier(r.id), sessionId: identifier(r.sessionId), topicId: identifier(r.topicId, true), title: text(r.title, 160, "Materi checkpoint", true), summary: text(r.summary ?? "", 4000, "Ringkasan"), rating: r.rating == null ? null : choice(r.rating, RATINGS, "Pemahaman"), submitted: r.submitted === true, createdAt: timestamp(r.createdAt), updatedAt: r.updatedAt == null ? null : timestamp(r.updatedAt), completedTopic: r.completedTopic === true };
    });
    if (new Set(state.checkpoints.map((r) => r.sessionId)).size !== state.checkpoints.length) throw new Error("Checkpoint untuk sesi yang sama duplikat.");
    for (const cp of state.checkpoints) if (cp.submitted && (!cp.summary || !cp.rating)) throw new Error("Checkpoint tersimpan belum lengkap.");
    state.distractions = records(raw.distractions, "hambatan", (r) => ({ id: identifier(r.id), topicId: identifier(r.topicId, true), timerId: identifier(r.timerId, true), date: date(r.date), category: choice(r.category, CATEGORIES, "Kategori hambatan"), note: text(r.note ?? "", 1000, "Catatan hambatan"), createdAt: timestamp(r.createdAt) }));
    state.interruptions = records(raw.interruptions, "sesi dihentikan", (r) => ({ id: identifier(r.id), topicId: identifier(r.topicId, true), title: text(r.title || "Sesi fokus", 160, "Judul sesi", true), date: date(r.date), reason: text(r.reason, 100, "Alasan sesi dihentikan", true), elapsedSeconds: integer(r.elapsedSeconds, 0, 7200, "Waktu sesi terhenti"), createdAt: timestamp(r.createdAt) }));
    if (raw.timer != null) {
      const r = raw.timer;
      state.timer = { id: identifier(r.id), mode: choice(r.mode, ["focus", "short", "long"], "Mode timer"), minutes: integer(r.minutes, 1, 120, "Durasi timer"), remaining: integer(r.remaining, 0, 7200, "Sisa waktu"), running: r.running === true, deadline: r.deadline == null ? null : timestamp(r.deadline), startedAt: r.startedAt == null ? null : timestamp(r.startedAt), title: text(r.title || "Sesi fokus", 160, "Judul sesi", true), courseName: text(r.courseName ?? "", 100, "Mata pelajaran"), topicId: identifier(r.topicId, true), planId: identifier(r.planId, true), reviewId: identifier(r.reviewId, true) };
      if (state.timer.remaining > state.timer.minutes * 60 || (state.timer.running && state.timer.deadline == null)) throw new Error("Status timer tidak konsisten.");
    }
    state.updatedAt = timestamp(raw.updatedAt ?? Date.now());
    return state;
  }
  function migrateLegacy(raw) {
    const state = emptyState();
    if (!raw || raw.version !== 1 || !Array.isArray(raw.sessions)) return state;
    for (const [key, max] of Object.entries({ focus: 120, short: 60, long: 60, goal: 1440 })) {
      const n = raw.preferences?.[key]; if (Number.isInteger(n) && n >= (key === "goal" ? 5 : 1) && n <= max) state.preferences[key] = n;
    }
    if (["forest", "sunset", "night"].includes(raw.scene)) state.scene = raw.scene;
    if (typeof raw.topic === "string") state.topic = raw.topic.slice(0, 160);
    if (Number.isInteger(raw.cycle)) state.cycle = ((raw.cycle % 4) + 4) % 4;
    const seen = new Set();
    state.sessions = raw.sessions.filter((r) => r && typeof r.title === "string" && validDate(r.date) && Number.isFinite(r.startedAt) && Number.isFinite(r.endedAt) && Number.isInteger(r.duration) && r.duration > 0 && r.duration <= 120).map((r) => {
      let id = /^[a-zA-Z0-9_-]{1,100}$/.test(r.id || "") ? r.id : uid("legacy");
      if (seen.has(id)) id = uid("legacy"); seen.add(id);
      return { id, date: r.date, startedAt: r.startedAt, endedAt: r.endedAt, duration: r.duration, title: r.title.slice(0, 160) || "Sesi fokus", courseName: "", topicId: null, planId: null, reviewId: null, sample: r.sample === true };
    });
    return validateState(state);
  }
  function topicMinutes(state, topicId) { return state.sessions.filter((r) => r.topicId === topicId && !r.sample).reduce((total, r) => total + r.duration, 0); }
  function latestCheckpoint(state, topicId) { return state.checkpoints.filter((r) => r.topicId === topicId && r.submitted).sort((a, b) => b.createdAt - a.createdAt || (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null; }
  function candidates(state, dateValue) {
    date(dateValue);
    const dueReviews = state.reviews.filter((r) => r.status === "pending" && r.due <= dateValue).sort((a, b) => a.due.localeCompare(b.due));
    const reviewing = new Set(dueReviews.map((r) => r.topicId));
    const reviewItems = dueReviews.map((r) => ({ topic: state.topics.find((t) => t.id === r.topicId), review: r, remaining: state.preferences.focus, reason: r.due < dateValue ? "Pengulangan terlewat" : "Pengulangan jatuh tempo" })).filter((r) => r.topic);
    const topics = state.topics.filter((r) => r.status === "active" && !reviewing.has(r.id)).sort((a, b) => {
      const due = (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31");
      return due || ({ high: 0, normal: 1, low: 2 }[a.priority] - { high: 0, normal: 1, low: 2 }[b.priority]) || a.createdAt - b.createdAt;
    });
    return [...reviewItems, ...topics.map((topic) => {
      const left = topic.estimate - topicMinutes(state, topic.id);
      let reason = topic.deadline ? topic.deadline < dateValue ? "Tenggat terlewat" : `Tenggat ${topic.deadline}` : "Belum memiliki tenggat";
      if (topic.priority === "high") reason += " · prioritas tinggi";
      if (left <= 0) reason += " · perlu evaluasi lanjutan";
      return { topic, review: null, remaining: Math.max(left, state.preferences.focus * (left <= 0 ? 1 : 0)), reason };
    })];
  }
  function generatePlan(state, dateValue, budget, now = Date.now()) {
    date(dateValue); integer(budget, 5, 1440, "Anggaran harian");
    const completed = state.plans.filter((r) => r.date === dateValue && r.status === "done");
    const activeId = state.timer?.startedAt ? state.timer.planId : null;
    const retained = state.plans.filter((r) => r.date !== dateValue || r.status === "done" || r.id === activeId);
    let capacity = Math.max(0, budget - completed.reduce((n, r) => n + r.minutes, 0) - retained.filter((r) => r.date === dateValue && r.id === activeId && r.status !== "done").reduce((n, r) => n + r.minutes, 0));
    const activeTopic = activeId ? retained.find((r) => r.id === activeId)?.topicId : null;
    const result = [];
    for (const item of candidates(state, dateValue)) {
      let left = item.remaining;
      if (item.topic.id === activeTopic) continue;
      while (left > 0 && capacity > 0) {
        const minutes = Math.min(state.preferences.focus, left, capacity);
        result.push({ id: uid("plan"), topicId: item.topic.id, reviewId: item.review?.id || null, date: dateValue, minutes, status: "todo", reason: item.reason, title: item.topic.title, createdAt: now + result.length, sessionId: null });
        left -= minutes; capacity -= minutes;
        if (item.review) break;
      }
      if (capacity <= 0) break;
    }
    state.plans = [...retained, ...result]; return result;
  }
  function completeFocus(state, timer, endedAt = Date.now()) {
    if (timer.mode !== "focus") return null;
    const previous = state.sessions.find((r) => r.id === timer.id);
    if (previous) return previous;
    const session = { id: timer.id, date: today(endedAt), startedAt: timer.startedAt || endedAt - timer.minutes * 60000, endedAt, duration: timer.minutes, title: timer.title || "Sesi fokus", courseName: timer.courseName || "", topicId: timer.topicId || null, planId: timer.planId || null, reviewId: timer.reviewId || null, sample: false };
    state.sessions.push(session);
    const plan = state.plans.find((r) => r.id === timer.planId);
    if (plan) { plan.status = "done"; plan.sessionId = session.id; }
    state.checkpoints.push({ id: uid("checkpoint"), sessionId: session.id, topicId: session.topicId, title: session.title, summary: "", rating: null, submitted: false, createdAt: endedAt, updatedAt: null, completedTopic: false });
    state.cycle = (state.cycle + 1) % 4;
    return session;
  }
  function setTopicCompleted(state, topic, completed, now = Date.now()) {
    topic.status = completed ? "completed" : "active";
    topic.completedAt = completed ? now : null;
    if (completed) state.plans.filter((r) => r.topicId === topic.id && !r.reviewId && r.status === "todo" && r.id !== state.timer?.planId).forEach((r) => { r.status = "skipped"; r.reason = "Materi sudah ditandai selesai"; });
  }
  function saveCheckpoint(state, id, input, now = Date.now()) {
    const cp = state.checkpoints.find((r) => r.id === id);
    if (!cp) throw new Error("Checkpoint tidak ditemukan.");
    const summary = text(input.summary, 4000, "Ringkasan pemahaman", true);
    const rating = choice(input.rating, RATINGS, "Pemahaman");
    const firstSubmission = !cp.submitted;
    cp.summary = summary; cp.rating = rating; cp.submitted = true; cp.updatedAt = now;
    const topic = state.topics.find((r) => r.id === cp.topicId);
    if (topic) {
      if (input.completeTopic) { setTopicCompleted(state, topic, true, now); cp.completedTopic = true; }
      const session = state.sessions.find((r) => r.id === cp.sessionId);
      const sourceReview = state.reviews.find((r) => r.id === session?.reviewId);
      if (firstSubmission && sourceReview) { sourceReview.status = "done"; sourceReview.completedAt = now; }
      const stage = rating === "understood" ? Math.min(4, sourceReview ? sourceReview.stage + 1 : 1) : 0;
      const due = offset(today(now), [1, 3, 7, 14, 30][stage]);
      const pending = state.reviews.find((r) => r.topicId === topic.id && r.status === "pending");
      if (latestCheckpoint(state, topic.id)?.id === cp.id) {
        if (pending) { pending.due = due; pending.stage = stage; pending.note = summary.slice(0, 1000); }
        else state.reviews.push({ id: uid("review"), topicId: topic.id, due, stage, status: "pending", note: summary.slice(0, 1000), createdAt: now, completedAt: null });
      }
    }
    return cp;
  }
  function removeTopic(state, id) {
    if (state.timer?.topicId === id && state.timer.startedAt) throw new Error("Selesaikan atau reset sesi aktif sebelum menghapus materi ini.");
    state.topics = state.topics.filter((r) => r.id !== id);
    const reviewIds = new Set(state.reviews.filter((r) => r.topicId === id).map((r) => r.id));
    state.reviews = state.reviews.filter((r) => r.topicId !== id);
    state.plans = state.plans.filter((r) => r.topicId !== id && !reviewIds.has(r.reviewId));
    if (state.activeTopicId === id) state.activeTopicId = null;
    if (state.timer?.topicId === id) state.timer = null;
  }
  function removeCourse(state, id) { const topics = state.topics.filter((r) => r.courseId === id); if (topics.some((r) => state.timer?.topicId === r.id && state.timer.startedAt)) throw new Error("Reset sesi aktif sebelum menghapus mata pelajaran ini."); topics.forEach((r) => removeTopic(state, r.id)); state.courses = state.courses.filter((r) => r.id !== id); }
  function analytics(state, startDate = "0000-01-01", endDate = today()) {
    const sessions = state.sessions.filter((r) => !r.sample && r.date >= startDate && r.date <= endDate);
    const sessionIds = new Set(sessions.map((r) => r.id));
    const checkpoints = state.checkpoints.filter((r) => r.submitted && sessionIds.has(r.sessionId));
    const barriers = state.distractions.filter((r) => r.date >= startDate && r.date <= endDate);
    return { minutes: sessions.reduce((n, r) => n + r.duration, 0), sessions: sessions.length, checkpoints: checkpoints.length, ratings: Object.fromEntries(RATINGS.map((rating) => [rating, checkpoints.filter((r) => r.rating === rating).length])), barriers: Object.fromEntries(CATEGORIES.map((category) => [category, barriers.filter((r) => r.category === category).length])), interruptions: state.interruptions.filter((r) => r.date >= startDate && r.date <= endDate).length, completedTopics: state.topics.filter((r) => r.status === "completed").length, dueReviews: state.reviews.filter((r) => r.status === "pending" && r.due <= endDate).length };
  }
  return { ZONE, DEFAULTS, RATINGS, CATEGORIES, uid, today, validDate, offset, daysBetween, emptyState, validateState, migrateLegacy, topicMinutes, latestCheckpoint, candidates, generatePlan, completeFocus, setTopicCompleted, saveCheckpoint, removeTopic, removeCourse, analytics };
});
