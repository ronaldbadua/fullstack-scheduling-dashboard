const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const DATA_FILE = path.resolve(process.cwd(), "backend", "data", "state.json");

function makeSeed() {
  const associates = [];
  const push = (name, shiftType) => ({ id: Math.random().toString(36).slice(2, 10), name, shiftType, active: true });
  associates.push(push("part time 1", "Part Time"));
  associates.push(push("part time 2", "Part Time"));
  for (let i = 1; i <= 6; i += 1) associates.push(push(`SW-${i}`, "FHD"));
  for (let i = 1; i <= 6; i += 1) associates.push(push(`WS-${i}`, "BHD"));

  const pooling = {};
  associates.forEach((a) => {
    pooling[a.id] = {
      sunWed: a.shiftType === "FHD",
      wedSat: a.shiftType === "BHD",
      partTime: a.shiftType === "Part Time",
      skip: a.shiftType === "Vacation"
    };
  });

  return { associates, pooling, assignments: {}, backups: {} };
}

function readDisk() {
  if (!fs.existsSync(DATA_FILE)) {
    return makeSeed();
  }
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(raw);
}

function writeDisk(state) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch (_err) {
    // Serverless environments can be read-only; keep in-memory state only.
  }
}

function createMemoryRepository() {
  let state = readDisk();
  return {
    mode: "memory",
    async getState() { return state; },
    async setState(next) { state = next; writeDisk(state); return state; }
  };
}

function createSupabaseRepository() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = createClient(url, key, { auth: { persistSession: false } });

  async function getAll(table) {
    const { data, error } = await client.from(table).select("*");
    if (error) throw error;
    return data;
  }

  async function getState() {
    const [associates, poolingRows, assignmentRows, backupRows] = await Promise.all([
      getAll("associates"),
      getAll("pooling_rules"),
      getAll("schedule_days"),
      getAll("backup_assignments")
    ]);

    const pooling = {};
    poolingRows.forEach((row) => {
      pooling[row.associate_id] = {
        sunWed: row.sun_wed,
        wedSat: row.wed_sat,
        partTime: row.part_time,
        skip: row.skip
      };
    });

    const assignments = {};
    assignmentRows.forEach((row) => {
      assignments[row.schedule_date] = {
        mainId: row.main_associate_id || "",
        supportId: row.support_associate_id || "",
        categoryMain: row.main_category || "FHD",
        categorySupport: row.support_category || "BHD"
      };
    });

    const backups = {};
    backupRows.forEach((row) => {
      backups[row.schedule_date] = {
        mainId: row.main_associate_id || "",
        backupId: row.backup_associate_id || ""
      };
    });

    return { associates, pooling, assignments, backups };
  }

  async function setState(next) {
    // Clear and replace strategy for deterministic sync in small dashboard app.
    const tables = ["pooling_rules", "schedule_days", "backup_assignments", "associates"];
    for (const t of tables) {
      const { error } = await client.from(t).delete().neq("id", "");
      if (error && error.code !== "PGRST116") throw error;
    }

    if (next.associates.length) {
      const { error } = await client.from("associates").insert(next.associates.map((a) => ({
        id: a.id,
        name: a.name,
        shift_type: a.shiftType,
        active: a.active
      })));
      if (error) throw error;
    }

    const poolingRows = Object.entries(next.pooling).map(([associateId, rule]) => ({
      associate_id: associateId,
      sun_wed: !!rule.sunWed,
      wed_sat: !!rule.wedSat,
      part_time: !!rule.partTime,
      skip: !!rule.skip
    }));
    if (poolingRows.length) {
      const { error } = await client.from("pooling_rules").insert(poolingRows);
      if (error) throw error;
    }

    const scheduleRows = Object.entries(next.assignments).map(([scheduleDate, rec]) => ({
      schedule_date: scheduleDate,
      main_associate_id: rec.mainId || null,
      support_associate_id: rec.supportId || null,
      main_category: rec.categoryMain || "FHD",
      support_category: rec.categorySupport || "BHD"
    }));
    if (scheduleRows.length) {
      const { error } = await client.from("schedule_days").insert(scheduleRows);
      if (error) throw error;
    }

    const backupRows = Object.entries(next.backups).map(([scheduleDate, rec]) => ({
      schedule_date: scheduleDate,
      main_associate_id: rec.mainId || null,
      backup_associate_id: rec.backupId || null
    }));
    if (backupRows.length) {
      const { error } = await client.from("backup_assignments").insert(backupRows);
      if (error) throw error;
    }

    return next;
  }

  return { mode: "supabase", getState, setState };
}

function createRepository() {
  const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return hasSupabase ? createSupabaseRepository() : createMemoryRepository();
}

module.exports = { createRepository };
