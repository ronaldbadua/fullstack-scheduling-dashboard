(() => {
  const SHIFT_TYPES = ["FHD", "BHD", "Part Time", "Vacation"];
  const state = {
    associates: [],
    pooling: {},
    assignments: {},
    backups: {}
  };

  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  async function api(path, options = {}) {
    const res = await fetch(`/api${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "API error");
    }
    return data;
  }

  function localIso(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }

  function monthMatrix(year, monthIndex) {
    const first = new Date(year, monthIndex, 1);
    const pad = (first.getDay() + 6) % 7;
    const days = new Date(year, monthIndex + 1, 0).getDate();
    const total = Math.ceil((pad + days) / 7) * 7;
    const rows = [];
    let idx = 1 - pad;
    for (let r = 0; r < total / 7; r += 1) {
      const row = [];
      for (let c = 0; c < 7; c += 1) {
        const d = new Date(year, monthIndex, idx += 0);
        row.push({ iso: localIso(d), inMonth: d.getMonth() === monthIndex, day: d.getDate() });
        idx += 1;
      }
      rows.push(row);
    }
    return rows;
  }

  function assocById(id) {
    return state.associates.find((a) => a.id === id) || null;
  }

  function dow(iso) {
    return new Date(`${iso}T12:00:00`).getDay();
  }

  function band(iso) {
    return dow(iso) <= 3 ? "sunWed" : "wedSat";
  }

  function isWeekend(iso) {
    const d = dow(iso);
    return d === 0 || d === 6;
  }

  function canAssign(associate, iso, role) {
    if (!associate || !associate.active || associate.shiftType === "Vacation") return false;
    const p = state.pooling[associate.id] || { sunWed: false, wedSat: false, partTime: false, skip: false };
    if (p.skip) return false;
    if (role === "partTime") return isWeekend(iso) && associate.shiftType === "Part Time" && p.partTime;
    if (associate.shiftType === "Part Time") return isWeekend(iso) && p.partTime;
    return band(iso) === "sunWed" ? p.sunWed : p.wedSat;
  }

  function eligible(iso, role) {
    return state.associates.filter((a) => canAssign(a, iso, role));
  }

  function validateStateLocal() {
    Object.entries(state.assignments).forEach(([iso, rec]) => {
      if (rec.mainId && !canAssign(assocById(rec.mainId), iso, "main")) rec.mainId = "";
      if (rec.supportId && (!canAssign(assocById(rec.supportId), iso, "support") || rec.supportId === rec.mainId)) rec.supportId = "";
    });
    Object.entries(state.backups).forEach(([iso, rec]) => {
      if (rec.mainId && !canAssign(assocById(rec.mainId), iso, "main")) rec.mainId = "";
      if (rec.backupId && (!canAssign(assocById(rec.backupId), iso, "support") || rec.backupId === rec.mainId)) rec.backupId = "";
    });
  }

  function options(list, selected) {
    return `<option value="">-</option>${list.map((a) => `<option value="${a.id}"${a.id === selected ? " selected" : ""}>${a.name}</option>`).join("")}`;
  }

  function renderAssociates() {
    const host = document.getElementById("associates-list");
    host.innerHTML = "";
    state.associates.forEach((a) => {
      const row = document.createElement("div");
      row.className = "associate-row";
      row.innerHTML = `
        <input value="${a.name}" data-id="${a.id}" data-field="name" />
        <select data-id="${a.id}" data-field="shiftType">${SHIFT_TYPES.map((t) => `<option${t === a.shiftType ? " selected" : ""}>${t}</option>`).join("")}</select>
        <button data-id="${a.id}" data-action="delete">Delete</button>`;
      host.appendChild(row);
    });

    host.querySelectorAll("input[data-field='name']").forEach((el) => {
      el.addEventListener("change", () => {
        const a = assocById(el.dataset.id);
        if (!a) return;
        a.name = (el.value || "").trim() || a.name;
        syncAndRender("Associate name updated");
      });
    });

    host.querySelectorAll("select[data-field='shiftType']").forEach((el) => {
      el.addEventListener("change", () => {
        const a = assocById(el.dataset.id);
        if (!a) return;
        a.shiftType = el.value;
        const p = state.pooling[a.id] || { sunWed: false, wedSat: false, partTime: false, skip: false };
        p.skip = a.shiftType === "Vacation";
        if (a.shiftType === "FHD") { p.sunWed = true; p.wedSat = false; p.partTime = false; }
        if (a.shiftType === "BHD") { p.sunWed = false; p.wedSat = true; p.partTime = false; }
        if (a.shiftType === "Part Time") { p.sunWed = false; p.wedSat = false; p.partTime = true; }
        state.pooling[a.id] = p;
        syncAndRender("Shift type updated");
      });
    });

    host.querySelectorAll("button[data-action='delete']").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.id;
        state.associates = state.associates.filter((a) => a.id !== id);
        delete state.pooling[id];
        Object.values(state.assignments).forEach((r) => { if (r.mainId === id) r.mainId = ""; if (r.supportId === id) r.supportId = ""; });
        Object.values(state.backups).forEach((r) => { if (r.mainId === id) r.mainId = ""; if (r.backupId === id) r.backupId = ""; });
        syncAndRender("Associate deleted");
      });
    });
  }

  function renderPooling() {
    const body = document.getElementById("pooling-body");
    body.innerHTML = "";
    state.associates.forEach((a) => {
      const p = state.pooling[a.id] || { sunWed: false, wedSat: false, partTime: false, skip: false };
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${a.name}<br><small>${a.shiftType}</small></td><td><input type="checkbox" data-id="${a.id}" data-k="sunWed" ${p.sunWed ? "checked" : ""}></td><td><input type="checkbox" data-id="${a.id}" data-k="wedSat" ${p.wedSat ? "checked" : ""}></td><td><input type="checkbox" data-id="${a.id}" data-k="partTime" ${p.partTime ? "checked" : ""}></td><td><input type="checkbox" data-id="${a.id}" data-k="skip" ${p.skip ? "checked" : ""}></td>`;
      body.appendChild(tr);
    });

    body.querySelectorAll("input[type='checkbox']").forEach((el) => {
      el.addEventListener("change", () => {
        const id = el.dataset.id;
        const key = el.dataset.k;
        state.pooling[id] = state.pooling[id] || { sunWed: false, wedSat: false, partTime: false, skip: false };
        state.pooling[id][key] = el.checked;
        syncAndRender();
      });
    });
  }

  function renderSchedule() {
    const [y, m] = document.getElementById("month").value.split("-").map(Number);
    const host = document.getElementById("calendar");
    host.innerHTML = "";

    monthMatrix(y, m - 1).forEach((row) => {
      const week = document.createElement("div");
      week.className = "week";
      row.forEach((cell) => {
        if (!state.assignments[cell.iso]) state.assignments[cell.iso] = { mainId: "", supportId: "", categoryMain: "FHD", categorySupport: "BHD" };
        const rec = state.assignments[cell.iso];
        const mains = eligible(cell.iso, "main");
        const supports = eligible(cell.iso, "support").filter((a) => a.id !== rec.mainId);
        const card = document.createElement("article");
        card.className = "day" + (cell.inMonth ? "" : " muted");
        card.innerHTML = `<div class="num">${cell.day}</div>
          <div class="slot"><label>Main</label><select data-iso="${cell.iso}" data-role="main">${options(mains, rec.mainId)}</select></div>
          <div class="slot"><label>Support</label><select data-iso="${cell.iso}" data-role="support">${options(supports, rec.supportId)}</select></div>
          `;
        week.appendChild(card);
      });
      host.appendChild(week);
    });

    host.querySelectorAll("select").forEach((el) => {
      el.addEventListener("change", () => {
        const iso = el.dataset.iso;
        const role = el.dataset.role;
        const rec = state.assignments[iso];
        if (role === "main") rec.mainId = el.value;
        if (role === "support") rec.supportId = el.value;
        validateStateLocal();
        syncAndRender();
      });
    });
  }

  function renderBackups() {
    const [y, m] = document.getElementById("month").value.split("-").map(Number);
    const body = document.getElementById("backup-body");
    body.innerHTML = "";
    monthMatrix(y, m - 1).flat().filter((d) => d.inMonth).forEach((d) => {
      if (!state.backups[d.iso]) state.backups[d.iso] = { mainId: "", backupId: "" };
      if (!state.assignments[d.iso]) state.assignments[d.iso] = { mainId: "", supportId: "", categoryMain: "FHD", categorySupport: "BHD" };
      if (!state.backups[d.iso].mainId) state.backups[d.iso].mainId = state.assignments[d.iso].mainId || "";
      const rec = state.backups[d.iso];
      const mains = eligible(d.iso, "main");
      const backups = eligible(d.iso, "support").filter((a) => a.id !== rec.mainId);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${d.iso}</td><td><select data-iso="${d.iso}" data-role="main">${options(mains, rec.mainId)}</select></td><td><select data-iso="${d.iso}" data-role="backup">${options(backups, rec.backupId)}</select></td>`;
      body.appendChild(tr);
    });

    body.querySelectorAll("select").forEach((el) => {
      el.addEventListener("change", () => {
        const iso = el.dataset.iso;
        const role = el.dataset.role;
        const rec = state.backups[iso];
        if (role === "main") rec.mainId = el.value;
        if (role === "backup") rec.backupId = el.value;
        validateStateLocal();
        syncAndRender();
      });
    });
  }

  async function syncAndRender(msg) {
    try {
      validateStateLocal();
      const persisted = await api("/state", { method: "PUT", body: JSON.stringify(state) });
      Object.assign(state, persisted);
      renderAll();
      if (msg) toast(msg);
    } catch (e) {
      toast(`Error: ${e.message}`);
      const latest = await api("/state");
      Object.assign(state, latest);
      renderAll();
    }
  }

  function renderAll() {
    renderAssociates();
    renderPooling();
    renderSchedule();
    renderBackups();
  }

  async function bootstrap() {
    const now = new Date();
    document.getElementById("month").value = now.toISOString().slice(0, 7);

    const server = await api("/state");
    Object.assign(state, server);
    renderAll();

    document.querySelectorAll(".tab").forEach((t) => {
      t.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
        document.querySelectorAll(".panel").forEach((x) => x.classList.remove("active"));
        t.classList.add("active");
        document.getElementById(`panel-${t.dataset.tab}`).classList.add("active");
      });
    });

    document.getElementById("month").addEventListener("change", () => renderAll());

    document.getElementById("add-associate").addEventListener("click", () => {
      const name = document.getElementById("new-name").value.trim();
      const shiftType = document.getElementById("new-shift").value;
      if (!name) return toast("Enter name first.");
      const id = Math.random().toString(36).slice(2, 10);
      state.associates.push({ id, name, shiftType, active: true });
      state.pooling[id] = {
        sunWed: shiftType === "FHD",
        wedSat: shiftType === "BHD",
        partTime: shiftType === "Part Time",
        skip: shiftType === "Vacation"
      };
      document.getElementById("new-name").value = "";
      syncAndRender("Associate added");
    });

    document.getElementById("autofill").addEventListener("click", async () => {
      const month = document.getElementById("month").value;
      if (!month) return toast("Select a month first.");
      try {
        const assignedInMonth = Object.entries(state.assignments).some(([iso, rec]) =>
          iso.startsWith(month) && !!(rec.mainId || rec.supportId)
        );
        let overwrite = false;
        if (assignedInMonth) {
          overwrite = window.confirm("A schedule already exists for this month. Overwrite it?");
          if (!overwrite) return;
        }
        const next = await api("/schedule/auto-assign", {
          method: "POST",
          body: JSON.stringify({ month, overwrite })
        });
        Object.assign(state, next);
        renderAll();
        toast("Monthly schedule generated successfully.");
      } catch (e) {
        toast(`Auto-assign failed: ${e.message}`);
      }
    });
  }

  bootstrap().catch((e) => toast(`Startup error: ${e.message}`));
})();
