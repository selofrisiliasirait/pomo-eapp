/* Local persistence, MySQL backend via Eel, legacy migration, backups, and cross-tab updates. */
(() => {
  "use strict";
  const Core = window.PomoCore;
  const KEY = "pomo-study-v2";
  const listeners = new Set();
  let storageAvailable = true;
  let loadWarning = "";
  let initial;
  let eelConnected = false;
  let dbInfo = { status: "checking", name: "", version: "", counts: {} };
  let syncTimer = null;
  let isSyncing = false;

  // 1. Baca data awal dari localStorage (sinkron) agar antarmuka tidak kedip/kosong saat dibuka
  try {
    const current = localStorage.getItem(KEY);
    if (current) initial = Core.validateState(JSON.parse(current));
    else {
      const legacy = localStorage.getItem("pomo-design-v1");
      initial = legacy ? Core.migrateLegacy(JSON.parse(legacy)) : Core.emptyState();
      if (legacy && !localStorage.getItem("pomo-study-legacy-backup")) {
        localStorage.setItem("pomo-study-legacy-backup", legacy);
      }
      localStorage.setItem(KEY, JSON.stringify(initial));
    }
  } catch (error) {
    initial = Core.emptyState();
    storageAvailable = false;
    loadWarning = "Data tersimpan tidak dapat dibaca atau penyimpanan diblokir. Data sebelumnya tidak ditimpa. Kamu bisa mengimpor cadangan melalui Data & cadangan.";
  }
  const state = initial;

  function emit() {
    for (const listener of listeners) {
      try {
        listener(state);
      } catch (error) {
        console.error("Pomo render:", error);
      }
    }
  }

  // 2. Sinkronisasi data ke backend MySQL melalui Eel
  async function syncToBackend() {
    if (!window.eel || typeof window.eel.sync_state !== "function") return;
    if (isSyncing) return;
    isSyncing = true;
    try {
      const res = await window.eel.sync_state(state)();
      if (res && res.ok) {
        eelConnected = true;
      } else if (res && !res.ok) {
        console.warn("Sinkronisasi database MySQL gagal:", res.error);
      }
    } catch (err) {
      console.warn("Koneksi backend Eel terputus:", err);
      eelConnected = false;
    } finally {
      isSyncing = false;
      updateStatusBadge();
    }
  }

  function queueSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncToBackend, 200);
  }

  function save() {
    state.updatedAt = Date.now();
    let ok = false;
    if (storageAvailable) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
        ok = true;
      } catch (_) {
        storageAvailable = false;
        loadWarning = "Penyimpanan browser penuh atau diblokir. Ekspor cadangan agar perubahan sesi ini tidak hilang.";
      }
    }
    // Jika backend Python Eel aktif, simpan juga ke MySQL
    queueSync();
    emit();
    return ok;
  }

  function update(callback) {
    const backup = JSON.stringify(state);
    try {
      const result = callback(state);
      save();
      return result;
    } catch (error) {
      Object.assign(state, JSON.parse(backup));
      throw error;
    }
  }

  function replace(data) {
    const checked = Core.validateState(data);
    checked.timer = null;
    Object.assign(state, checked);
    storageAvailable = true;
    loadWarning = "";
    save();
    // Sinkronkan langsung saat impor data cadangan
    if (window.eel && typeof window.eel.sync_state === "function") {
      window.eel.sync_state(state)().catch(() => {});
    }
  }

  function exportData() {
    return {
      application: "pomo-study",
      version: 2,
      exportedAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(state)),
    };
  }

  function parseBackup(value) {
    if (!value || value.application !== "pomo-study" || value.version !== 2) {
      throw new Error("Berkas ini bukan cadangan Pomo versi 2.");
    }
    return Core.validateState(value.data);
  }

  async function complete(timer) {
    const commit = () => {
      if (storageAvailable) {
        try {
          const raw = localStorage.getItem(KEY);
          if (raw) Object.assign(state, Core.validateState(JSON.parse(raw)));
        } catch (_) {}
      }
      if (state.timer?.id !== timer.id) {
        emit();
        return null;
      }
      const endedAt = timer.deadline || Date.now();
      const session = timer.mode === "focus" ? Core.completeFocus(state, timer, endedAt) : null;
      const nextMode = timer.mode === "focus" ? (state.cycle === 0 ? "long" : "short") : "focus";
      state.timer = {
        id: Core.uid("timer"),
        mode: nextMode,
        minutes: state.preferences[nextMode],
        remaining: state.preferences[nextMode] * 60,
        running: false,
        deadline: null,
        startedAt: null,
        title: "Sesi fokus",
        courseName: "",
        topicId: null,
        planId: null,
        reviewId: null,
      };
      save();
      return session;
    };
    return navigator.locks?.request ? navigator.locks.request(`${KEY}-completion`, commit) : commit();
  }

  // 3. Status Badge Helper
  function updateStatusBadge() {
    const label = document.getElementById("data-mode-label");
    const badge = label?.closest(".preview-badge");
    if (!label) return;

    const hasSamples = state.sessions.some((r) => r.sample);
    if (eelConnected) {
      badge?.classList.add("is-mysql");
      label.textContent = hasSamples ? "MySQL Lokal (Riwayat contoh)" : "MySQL Lokal (XAMPP - pomo_db)";
      label.title = `Terhubung ke MySQL di localhost:3306 (Database: ${dbInfo.name || "pomo_db"}, Server: ${dbInfo.version || "MariaDB"})`;
    } else {
      badge?.classList.remove("is-mysql");
      label.textContent = hasSamples ? "Memuat riwayat contoh" : "Tersimpan di perangkat ini";
      label.title = "Penyimpanan browser lokal (localStorage)";
    }
  }

  // 4. Inisialisasi Backend Eel & Sinkronisasi Awal
  async function initBackend() {
    if (!window.eel || typeof window.eel.cek_koneksi !== "function") {
      updateStatusBadge();
      return;
    }

    try {
      const conn = await window.eel.cek_koneksi()();
      if (conn && conn.ok) {
        eelConnected = true;
        dbInfo = conn.data;

        // Muat data dari 9 tabel database
        const loaded = await window.eel.load_all_state()();
        if (loaded && loaded.ok && loaded.data) {
          const remote = loaded.data;
          const remoteHasData = (remote.courses && remote.courses.length > 0) ||
                                (remote.topics && remote.topics.length > 0) ||
                                (remote.sessions && remote.sessions.length > 0);
          const localHasData = state.courses.length > 0 || state.topics.length > 0 || state.sessions.length > 0;

          if (remoteHasData) {
            // Database memiliki data, ambil dan terapkan ke state
            const validated = Core.validateState(remote);
            validated.timer = state.timer; // Pertahankan status timer aktif
            Object.assign(state, validated);
            if (storageAvailable) {
              try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
            }
          } else if (localHasData) {
            // Database masih kosong tapi local storage ada data, unggah ke database
            await window.eel.sync_state(state)();
          }
          emit();
        }
      } else {
        eelConnected = false;
        console.warn("Koneksi MySQL tidak berhasil:", conn?.error);
      }
    } catch (err) {
      eelConnected = false;
      console.warn("Inisialisasi Eel backend dilewati (mode offline):", err);
    } finally {
      updateStatusBadge();
    }
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== KEY || !event.newValue) return;
    try {
      Object.assign(state, Core.validateState(JSON.parse(event.newValue)));
      emit();
    } catch (_) {}
  });

  // Jalankan inisialisasi backend setelah DOM siap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBackend);
  } else {
    setTimeout(initBackend, 0);
  }

  window.PomoStore = {
    state,
    save,
    update,
    replace,
    exportData,
    parseBackup,
    complete,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    get warning() { return loadWarning; },
    get persistent() { return storageAvailable; },
    get dbStatus() {
      return { connected: eelConnected, info: dbInfo };
    },
    checkConnection: initBackend,
  };
})();
