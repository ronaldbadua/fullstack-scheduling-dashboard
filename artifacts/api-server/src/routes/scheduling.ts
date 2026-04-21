import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";
import {
  GetStateResponse,
  SetStateBody,
  SetStateResponse,
  AutoAssignBody,
  AutoAssignResponse,
  GetSummaryQueryParams,
  GetSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── In-memory state with disk persistence ────────────────────────────────────

const DATA_DIR = path.resolve(process.cwd(), "backend_data");
const DATA_FILE = path.join(DATA_DIR, "state.json");

const SHIFT_TYPES = ["FHD", "BHD", "Part Time", "Vacation"] as const;
type ShiftType = (typeof SHIFT_TYPES)[number];

interface Associate {
  id: string;
  name: string;
  shiftType: ShiftType;
  active: boolean;
}

interface PoolRule {
  sunWed: boolean;
  wedSat: boolean;
  partTime: boolean;
  skip: boolean;
}

interface Assignment {
  mainId: string;
  supportId: string;
  categoryMain: string;
  categorySupport: string;
}

interface Backup {
  mainId: string;
  backupId: string;
}

interface SchedulingState {
  associates: Associate[];
  pooling: Record<string, PoolRule>;
  assignments: Record<string, Assignment>;
  backups: Record<string, Backup>;
}

function makeSeed(): SchedulingState {
  const associates: Associate[] = [];
  const push = (name: string, shiftType: ShiftType): Associate => ({
    id: Math.random().toString(36).slice(2, 10),
    name,
    shiftType,
    active: true,
  });
  associates.push(push("PT-1", "Part Time"));
  associates.push(push("PT-2", "Part Time"));
  for (let i = 1; i <= 4; i++) associates.push(push(`SW-${i}`, "FHD"));
  for (let i = 1; i <= 4; i++) associates.push(push(`WS-${i}`, "BHD"));

  const pooling: Record<string, PoolRule> = {};
  associates.forEach((a) => {
    pooling[a.id] = {
      sunWed: a.shiftType === "FHD",
      wedSat: a.shiftType === "BHD",
      partTime: a.shiftType === "Part Time",
      skip: a.shiftType === "Vacation",
    };
  });

  return { associates, pooling, assignments: {}, backups: {} };
}

function readState(): SchedulingState {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      return JSON.parse(raw) as SchedulingState;
    }
  } catch {
    // fallback to seed
  }
  return makeSeed();
}

function writeState(state: SchedulingState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch {
    // read-only env fallback
  }
}

let memState: SchedulingState = readState();

// ── Helpers ──────────────────────────────────────────────────────────────────

function dateDow(iso: string): number {
  return new Date(`${iso}T12:00:00`).getDay();
}

function dayBand(iso: string): "sunWed" | "wedSat" {
  const dow = dateDow(iso);
  return dow <= 3 ? "sunWed" : "wedSat";
}

function isWeekend(iso: string): boolean {
  const dow = dateDow(iso);
  return dow === 0 || dow === 6;
}

function canAssign(
  associate: Associate | undefined,
  poolRule: PoolRule | undefined,
  iso: string,
  role: "main" | "support"
): boolean {
  if (!associate || !poolRule || poolRule.skip || !associate.active || associate.shiftType === "Vacation") {
    return false;
  }

  if (associate.shiftType === "Part Time") {
    return isWeekend(iso) && poolRule.partTime;
  }

  const band = dayBand(iso);
  return band === "sunWed" ? poolRule.sunWed : poolRule.wedSat;
}

function validateState(state: SchedulingState): void {
  const assocMap = new Map<string, Associate>(state.associates.map((a) => [a.id, a]));

  Object.entries(state.assignments).forEach(([date, rec]) => {
    const main = assocMap.get(rec.mainId);
    const support = assocMap.get(rec.supportId);
    const mainPool = state.pooling[rec.mainId];
    const supPool = state.pooling[rec.supportId];

    if (rec.mainId && !canAssign(main, mainPool, date, "main")) {
      throw new Error(`Invalid main assignment on ${date}`);
    }
    if (rec.supportId && !canAssign(support, supPool, date, "support")) {
      throw new Error(`Invalid support assignment on ${date}`);
    }
    if (rec.mainId && rec.supportId && rec.mainId === rec.supportId) {
      throw new Error(`Main and support cannot match on ${date}`);
    }
  });

  Object.entries(state.backups).forEach(([date, rec]) => {
    if (!rec.backupId) return;
    const main = assocMap.get(rec.mainId);
    const backup = assocMap.get(rec.backupId);
    const mainPool = state.pooling[rec.mainId];
    const backupPool = state.pooling[rec.backupId];

    if (rec.mainId && !canAssign(main, mainPool, date, "main")) {
      throw new Error(`Invalid backup-main pairing on ${date}`);
    }
    if (!canAssign(backup, backupPool, date, "support")) {
      throw new Error(`Invalid backup associate on ${date}`);
    }
    if (rec.mainId && rec.mainId === rec.backupId) {
      throw new Error(`Backup cannot be same as main on ${date}`);
    }
  });
}

function buildAutoAssignedMonth(
  state: SchedulingState,
  month: string,
  overwrite: boolean
): SchedulingState {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const dateList: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    dateList.push(iso);
  }

  const existingForMonth = dateList.some((iso) => {
    const rec = state.assignments[iso];
    return !!(rec && (rec.mainId || rec.supportId));
  });
  if (existingForMonth && !overwrite) {
    throw new Error("Schedule already exists for this month. Re-run with overwrite=true.");
  }

  const next: SchedulingState = {
    associates: [...state.associates],
    pooling: { ...state.pooling },
    assignments: { ...state.assignments },
    backups: { ...state.backups },
  };

  const countsMain: Record<string, number> = {};
  const countsSupport: Record<string, number> = {};
  const countsBackup: Record<string, number> = {};
  next.associates.forEach((a) => {
    countsMain[a.id] = 0;
    countsSupport[a.id] = 0;
    countsBackup[a.id] = 0;
  });

  const pickFair = (eligibleIds: string[], counts: Record<string, number>): string => {
    if (!eligibleIds.length) return "";
    const min = Math.min(...eligibleIds.map((id) => counts[id] ?? 0));
    const pool = eligibleIds.filter((id) => (counts[id] ?? 0) === min);
    return pool[Math.floor(Math.random() * pool.length)] || "";
  };

  dateList.forEach((iso) => {
    const mainEligible = next.associates
      .filter((a) => canAssign(a, next.pooling[a.id], iso, "main"))
      .map((a) => a.id);
    const mainId = pickFair(mainEligible, countsMain);
    if (mainId) countsMain[mainId] = (countsMain[mainId] ?? 0) + 1;

    const supportEligible = next.associates
      .filter((a) => a.id !== mainId && canAssign(a, next.pooling[a.id], iso, "support"))
      .map((a) => a.id);
    const supportId = pickFair(supportEligible, countsSupport);
    if (supportId) countsSupport[supportId] = (countsSupport[supportId] ?? 0) + 1;

    const backupEligible = next.associates
      .filter((a) => a.id !== mainId && a.id !== supportId && canAssign(a, next.pooling[a.id], iso, "support"))
      .map((a) => a.id);
    const backupId = pickFair(backupEligible, countsBackup);
    if (backupId) countsBackup[backupId] = (countsBackup[backupId] ?? 0) + 1;

    next.assignments[iso] = {
      mainId,
      supportId,
      categoryMain: "FHD",
      categorySupport: "BHD",
    };
    next.backups[iso] = { mainId, backupId };
  });

  return next;
}

// ── Routes ───────────────────────────────────────────────────────────────────

router.get("/state", async (_req, res): Promise<void> => {
  const data = GetStateResponse.parse(memState);
  res.json(data);
});

router.put("/state", async (req, res): Promise<void> => {
  const parsed = SetStateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    validateState(parsed.data as SchedulingState);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  memState = parsed.data as SchedulingState;
  writeState(memState);
  res.json(SetStateResponse.parse(memState));
});

router.post("/schedule/auto-assign", async (req, res): Promise<void> => {
  const parsed = AutoAssignBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const next = buildAutoAssignedMonth(
      memState,
      parsed.data.month,
      parsed.data.overwrite ?? false
    ) as SchedulingState;
    validateState(next);
    memState = next;
    writeState(memState);
    res.json(AutoAssignResponse.parse(memState));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/summary", async (req, res): Promise<void> => {
  const qp = GetSummaryQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const { month } = qp.data;
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const dateList: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dateList.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  const countsMain: Record<string, number> = {};
  const countsSupport: Record<string, number> = {};
  const countsBackup: Record<string, number> = {};
  memState.associates.forEach((a) => {
    countsMain[a.id] = 0;
    countsSupport[a.id] = 0;
    countsBackup[a.id] = 0;
  });

  let assignedDays = 0;
  dateList.forEach((iso) => {
    const rec = memState.assignments[iso];
    if (rec && (rec.mainId || rec.supportId)) {
      assignedDays++;
      if (rec.mainId) countsMain[rec.mainId] = (countsMain[rec.mainId] ?? 0) + 1;
      if (rec.supportId) countsSupport[rec.supportId] = (countsSupport[rec.supportId] ?? 0) + 1;
    }
    const bk = memState.backups[iso];
    if (bk?.backupId) {
      countsBackup[bk.backupId] = (countsBackup[bk.backupId] ?? 0) + 1;
    }
  });

  const summary = GetSummaryResponse.parse({
    month,
    totalDays: daysInMonth,
    assignedDays,
    unassignedDays: daysInMonth - assignedDays,
    associates: memState.associates.map((a) => ({
      id: a.id,
      name: a.name,
      shiftType: a.shiftType,
      mainCount: countsMain[a.id] ?? 0,
      supportCount: countsSupport[a.id] ?? 0,
      backupCount: countsBackup[a.id] ?? 0,
    })),
  });

  res.json(summary);
});

export default router;
