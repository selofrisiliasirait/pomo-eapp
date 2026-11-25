const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const corePath = fs.existsSync(path.join(__dirname, '../web/learning-core.js'))
  ? '../web/learning-core.js'
  : '../learning-core.js';
const C = require(corePath);
const NOW = Date.parse('2026-11-19T09:00:00Z');
const TODAY = C.today(NOW);
function fixture() {
  const s = C.emptyState();
  s.courses.push({ id: 'course-db', name: 'Basis Data', goal: 'Menguasai SQL', color: 'green', createdAt: NOW });
  s.topics.push({ id: 'topic-sql', courseId: 'course-db', title: 'SQL dasar', estimate: 60, deadline: C.offset(TODAY, 2), priority: 'normal', notes: '', outcome: 'Menulis SELECT', status: 'active', createdAt: NOW, completedAt: null });
  return s;
}
function focus(s, id = 'timer-test', topicId = 'topic-sql', reviewId = null, planId = null) {
  return { id, mode: 'focus', minutes: 25, remaining: 0, running: false, deadline: NOW, startedAt: NOW - 25 * 60000, title: 'SQL dasar', courseName: 'Basis Data', topicId, reviewId, planId };
}
test('Jakarta calendar handles UTC day boundaries and leap days', () => {
  assert.equal(C.today('2026-11-19T18:00:00Z'), '2026-11-20');
  assert.equal(C.offset('2024-02-28', 1), '2024-02-29');
  assert.equal(C.validDate('2026-02-30'), false);
  assert.equal(C.daysBetween('2026-11-20', '2026-11-19'), 1);
});
test('empty and populated data round-trip through strict validation', () => {
  assert.deepEqual(C.validateState(C.emptyState()).topics, []);
  const s = fixture(); assert.deepEqual(C.validateState(s).topics, s.topics);
});
test('migration preserves legacy sessions and settings without generating new demo data', () => {
  const s = C.migrateLegacy({ version: 1, preferences: { focus: 40, short: 5, long: 15, goal: 120 }, cycle: 2, topic: 'Lama', scene: 'night', sessions: [{ id: 'legacy-session', title: 'Materi lama', date: TODAY, startedAt: NOW - 60000, endedAt: NOW, duration: 1, sample: false }, null] });
  assert.equal(s.sessions.length, 1); assert.equal(s.preferences.focus, 40); assert.equal(s.scene, 'night'); assert.equal(s.courses.length, 0); assert.equal(s.version, 2);
});
test('duplicate ids, invalid dates, orphaned topics, and missing arrays are rejected', () => {
  const s = fixture(); s.topics.push({ ...s.topics[0] }); assert.throws(() => C.validateState(s), /duplikat/);
  const a = fixture(); a.topics[0].deadline = '2026-02-30'; assert.throws(() => C.validateState(a), /Tanggal/);
  const b = fixture(); b.topics[0].courseId = 'missing'; assert.throws(() => C.validateState(b), /tidak ditemukan/);
  const d = fixture(); delete d.checkpoints; assert.throws(() => C.validateState(d), /checkpoint/);
});
test('planner splits estimates and respects exact daily budget', () => {
  const s = fixture(), plan = C.generatePlan(s, TODAY, 60, NOW);
  assert.deepEqual(plan.map((r) => r.minutes), [25, 25, 10]);
  assert.equal(plan.reduce((n, r) => n + r.minutes, 0), 60);
  C.validateState(s);
});
test('planner can make a short final session and rejects zero/decimal budgets', () => {
  const s = fixture(); assert.deepEqual(C.generatePlan(s, TODAY, 5, NOW).map((r) => r.minutes), [5]);
  assert.throws(() => C.generatePlan(s, TODAY, 0), /Anggaran/);
  assert.throws(() => C.generatePlan(s, TODAY, 12.5), /Anggaran/);
});
test('due reviews precede study, including review of a completed topic', () => {
  const s = fixture(); s.topics[0].status = 'completed';
  s.reviews.push({ id: 'review-due', topicId: 'topic-sql', due: TODAY, stage: 0, status: 'pending', note: '', createdAt: NOW, completedAt: null });
  const plan = C.generatePlan(s, TODAY, 100, NOW);
  assert.equal(plan.length, 1); assert.equal(plan[0].reviewId, 'review-due');
});
test('earlier deadlines come first and priority breaks deadline ties', () => {
  const s = fixture();
  s.topics.push({ ...s.topics[0], id: 'topic-urgent', title: 'Urgent', deadline: TODAY, priority: 'low' });
  s.topics.push({ ...s.topics[0], id: 'topic-high', title: 'High', priority: 'high' });
  const items = C.candidates(s, TODAY); assert.deepEqual(items.map((r) => r.topic.id), ['topic-urgent', 'topic-high', 'topic-sql']);
});
test('regenerating preserves completed and currently running plan entries', () => {
  const s = fixture(); C.generatePlan(s, TODAY, 60, NOW); s.plans[0].status = 'done';
  const first = s.plans[0].id, active = s.plans[1].id;
  s.timer = { ...focus(s), id: 'running', planId: active, startedAt: NOW, remaining: 25 * 60, deadline: NOW + 25 * 60000, running: true };
  C.generatePlan(s, TODAY, 60, NOW + 1);
  assert.ok(s.plans.some((r) => r.id === first)); assert.ok(s.plans.some((r) => r.id === active));
  assert.ok(s.plans.reduce((n, r) => n + r.minutes, 0) <= 60);
});
test('completion is idempotent, connects plan, and makes one pending checkpoint', () => {
  const s = fixture(); const p = C.generatePlan(s, TODAY, 25, NOW)[0]; const t = focus(s, 'timer-one', 'topic-sql', null, p.id);
  C.completeFocus(s, t, NOW); C.completeFocus(s, t, NOW);
  assert.equal(s.sessions.length, 1); assert.equal(s.checkpoints.length, 1); assert.equal(s.plans[0].status, 'done'); assert.equal(s.cycle, 1);
  assert.equal(s.topics[0].status, 'active'); assert.equal(C.topicMinutes(s, 'topic-sql'), 25);
  C.validateState(s);
});
test('breaks never create learning time, checkpoints, or cycle progress', () => {
  const s = fixture(); assert.equal(C.completeFocus(s, { ...focus(s), mode: 'short' }, NOW), null);
  assert.equal(s.sessions.length, 0); assert.equal(s.checkpoints.length, 0); assert.equal(s.cycle, 0);
});
test('understood checkpoint schedules review in 3 days and explicit completion marks topic', () => {
  const s = fixture(); C.generatePlan(s, TODAY, 60, NOW); C.completeFocus(s, focus(s), NOW);
  C.saveCheckpoint(s, s.checkpoints[0].id, { summary: 'SELECT memilih kolom, WHERE menyaring baris.', rating: 'understood', completeTopic: true }, NOW);
  assert.equal(s.reviews[0].due, C.offset(TODAY, 3)); assert.equal(s.topics[0].status, 'completed'); assert.ok(s.plans.every((r) => r.status === 'skipped')); C.validateState(s);
});
test('unsure and repeat schedule tomorrow and reject empty reflections', () => {
  for (const rating of ['unsure', 'repeat']) {
    const s = fixture(); C.completeFocus(s, focus(s), NOW);
    assert.throws(() => C.saveCheckpoint(s, s.checkpoints[0].id, { summary: '   ', rating }, NOW), /Ringkasan/);
    C.saveCheckpoint(s, s.checkpoints[0].id, { summary: 'Bagian JOIN masih membingungkan.', rating }, NOW);
    assert.equal(s.reviews[0].due, C.offset(TODAY, 1)); assert.equal(s.topics[0].status, 'active');
  }
});
test('successful review progresses to 7 days; repeated review resets to tomorrow', () => {
  const s = fixture(); C.completeFocus(s, focus(s), NOW); C.saveCheckpoint(s, s.checkpoints[0].id, { summary: 'SQL dipahami.', rating: 'understood' }, NOW);
  const review = s.reviews[0]; C.completeFocus(s, focus(s, 'timer-review', 'topic-sql', review.id), NOW + 1000);
  C.saveCheckpoint(s, s.checkpoints[1].id, { summary: 'Bisa mengingat kembali.', rating: 'understood' }, NOW + 1000);
  assert.equal(review.status, 'done'); assert.equal(s.reviews.find((r) => r.status === 'pending').due, C.offset(TODAY, 7));
  assert.equal(s.reviews.filter((r) => r.status === 'pending').length, 1);
});
test('editing a checkpoint updates one pending review without duplicating completion', () => {
  const s = fixture(); C.completeFocus(s, focus(s), NOW); const cp = s.checkpoints[0];
  C.saveCheckpoint(s, cp.id, { summary: 'Cukup paham.', rating: 'understood' }, NOW);
  C.saveCheckpoint(s, cp.id, { summary: 'Ternyata masih perlu latihan JOIN.', rating: 'repeat' }, NOW + 1000);
  assert.equal(s.reviews.length, 1); assert.equal(s.reviews[0].due, C.offset(TODAY, 1)); assert.equal(s.sessions.length, 1); C.validateState(s);
});
test('an older deferred reflection cannot overwrite a newer understanding schedule', () => {
  const s = fixture(); C.completeFocus(s, focus(s, 'timer-older'), NOW);
  C.completeFocus(s, focus(s, 'timer-newer'), NOW + 1000);
  C.saveCheckpoint(s, s.checkpoints[1].id, { summary: 'Latihan terbaru sudah dipahami.', rating: 'understood' }, NOW + 1000);
  const scheduled = s.reviews[0].due;
  C.saveCheckpoint(s, s.checkpoints[0].id, { summary: 'Pada sesi sebelumnya masih bingung.', rating: 'repeat' }, NOW + 2000);
  assert.equal(s.reviews[0].due, scheduled); assert.equal(s.reviews.length, 1); assert.equal(C.latestCheckpoint(s, 'topic-sql').id, s.checkpoints[1].id);
});
test('free-focus checkpoints save without creating orphan review records', () => {
  const s = fixture(); C.completeFocus(s, focus(s, 'timer-free', null), NOW);
  C.saveCheckpoint(s, s.checkpoints[0].id, { summary: 'Menyelesaikan bacaan umum.', rating: 'understood' }, NOW);
  assert.equal(s.reviews.length, 0); C.validateState(s);
});
test('deleting topic cleans plans/reviews and preserves session/checkpoint snapshots', () => {
  const s = fixture(); C.generatePlan(s, TODAY, 60, NOW); C.completeFocus(s, focus(s), NOW);
  C.saveCheckpoint(s, s.checkpoints[0].id, { summary: 'Sudah belajar SQL.', rating: 'unsure' }, NOW);
  C.removeTopic(s, 'topic-sql'); assert.equal(s.topics.length, 0); assert.equal(s.plans.length, 0); assert.equal(s.reviews.length, 0); assert.equal(s.sessions.length, 1); assert.equal(s.checkpoints.length, 1); C.validateState(s);
});
test('deletion of active course is atomic and rejected before removing other topics', () => {
  const s = fixture(); s.topics.push({ ...s.topics[0], id: 'topic-other' }); s.timer = focus(s);
  assert.throws(() => C.removeCourse(s, 'course-db'), /sesi aktif/); assert.equal(s.topics.length, 2); assert.equal(s.courses.length, 1);
});
test('analytics separates finished sessions, sample data, barriers, and interruptions', () => {
  const s = fixture(); C.completeFocus(s, focus(s), NOW); s.sessions.push({ ...s.sessions[0], id: 'sample', sample: true });
  s.distractions.push({ id: 'barrier-one', category: 'phone', date: TODAY, note: '', topicId: null, timerId: null, createdAt: NOW });
  s.interruptions.push({ id: 'interrupted', date: TODAY, topicId: null, title: 'Sesi', reason: 'Reset', elapsedSeconds: 40, createdAt: NOW });
  const report = C.analytics(s, TODAY, TODAY); assert.equal(report.minutes, 25); assert.equal(report.sessions, 1); assert.equal(report.barriers.phone, 1); assert.equal(report.interruptions, 1); C.validateState(s);
});
test('backup validation rejects missing session references and duplicated pending reviews', () => {
  const s = fixture(); C.completeFocus(s, focus(s), NOW); s.checkpoints[0].sessionId = 'missing'; assert.throws(() => C.validateState(s), /Sesi checkpoint/);
  const b = fixture(); b.reviews.push({ id: 'review-a', topicId: 'topic-sql', due: TODAY, stage: 0, status: 'pending', note: '', createdAt: NOW, completedAt: null }); b.reviews.push({ ...b.reviews[0], id: 'review-b' }); assert.throws(() => C.validateState(b), /duplikat/);
});
