const express = require("express");
const { z } = require("zod");
const { SHIFT_TYPES } = require("../../shared/schema");
const { canAssign } = require("../lib/rules");

function createApiRouter(repository) {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, storage: repository.mode });
  });

  router.get("/state", async (_req, res, next) => {
    try {
      const state = await repository.getState();
      res.json(state);
    } catch (err) { next(err); }
  });

  router.put("/state", async (req, res, next) => {
    try {
      const parsed = StateSchema.parse(req.body);
      const validated = validateState(parsed);
      const saved = await repository.setState(validated);
      res.json(saved);
    } catch (err) { next(err); }
  });

  router.post("/schedule/auto-assign", async (req, res, next) => {
    try {
      const body = AutoAssignSchema.parse(req.body ?? {});
      const state = await repository.getState();
      const nextState = buildAutoAssignedMonth(state, body.month, body.overwrite);
      const validated = validateState(nextState);
      const saved = await repository.setState(validated);
      res.json(saved);
    } catch (err) { next(err); }
  });

  router.use((err, _req, res, _next) => {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.issues });
    }
    return res.status(500).json({ error: err.message || "Unknown server error" });
  });

  return router;
}

const AssociateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shiftType: z.enum(SHIFT_TYPES),
  active: z.boolean()
});

const PoolRuleSchema = z.object({
  sunWed: z.boolean(),
  wedSat: z.boolean(),
  partTime: z.boolean(),
  skip: z.boolean()
});

const AssignmentSchema = z.object({
  mainId: z.string(),
  supportId: z.string(),
  categoryMain: z.enum(SHIFT_TYPES),
  categorySupport: z.enum(SHIFT_TYPES)
});

const BackupSchema = z.object({
  mainId: z.string(),
  backupId: z.string()
});

const StateSchema = z.object({
  associates: z.array(AssociateSchema),
  pooling: z.record(z.string(), PoolRuleSchema),
  assignments: z.record(z.string(), AssignmentSchema),
  backups: z.record(z.string(), BackupSchema)
});

const AutoAssignSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  overwrite: z.boolean().default(false)
});

function getAssociateMap(state) {
  const map = new Map();
  state.associates.forEach((a) => map.set(a.id, a));
  return map;
}

function validateState(state) {
  const assoc = getAssociateMap(state);

  Object.entries(state.assignments).forEach(([date, rec]) => {
    const main = assoc.get(rec.mainId);
    const sup = assoc.get(rec.supportId);
    const mainPool = state.pooling[rec.mainId] || null;
    const supPool = state.pooling[rec.supportId] || null;

    if (rec.mainId && !canAssign(main, mainPool, date, "main")) {
      throw new Error(`Invalid main assignment on ${date}`);
    }
    if (rec.supportId && !canAssign(sup, supPool, date, "support")) {
      throw new Error(`Invalid support assignment on ${date}`);
    }
    if (rec.mainId && rec.supportId && rec.mainId === rec.supportId) {
      throw new Error(`Main and support cannot match on ${date}`);
    }
  });

  Object.entries(state.backups).forEach(([date, rec]) => {
    if (!rec.backupId) return;
    const main = assoc.get(rec.mainId);
    const backup = assoc.get(rec.backupId);
    const mainPool = state.pooling[rec.mainId] || null;
    const backupPool = state.pooling[rec.backupId] || null;

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

  return state;
}

function buildAutoAssignedMonth(state, month, overwrite) {
  const [y, m] = month.split("-").map(Number);
  const monthIndex = m - 1;
  const daysInMonth = new Date(y, m, 0).getDate();
  const dateList = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
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

  const next = {
    associates: [...state.associates],
    pooling: { ...state.pooling },
    assignments: { ...state.assignments },
    backups: { ...state.backups }
  };

  const countsMain = {};
  const countsSupport = {};
  const countsBackup = {};
  next.associates.forEach((a) => {
    countsMain[a.id] = 0;
    countsSupport[a.id] = 0;
    countsBackup[a.id] = 0;
  });

  dateList.forEach((iso) => {
    if (overwrite || !next.assignments[iso]) {
      next.assignments[iso] = { mainId: "", supportId: "", categoryMain: "FHD", categorySupport: "BHD" };
    }
    if (overwrite || !next.backups[iso]) {
      next.backups[iso] = { mainId: "", backupId: "" };
    }
  });

  // Fair random picker: lowest assignment count first, random tie-break.
  const pickFair = (eligibleIds, counts) => {
    if (!eligibleIds.length) return "";
    const min = Math.min(...eligibleIds.map((id) => counts[id] ?? 0));
    const pool = eligibleIds.filter((id) => (counts[id] ?? 0) === min);
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx] || "";
  };

  dateList.forEach((iso) => {
    const mainEligible = next.associates
      .filter((a) => canAssign(a, next.pooling[a.id] || null, iso, "main"))
      .map((a) => a.id);

    const mainId = pickFair(mainEligible, countsMain);
    if (mainId) countsMain[mainId] += 1;

    const supportEligible = next.associates
      .filter((a) => a.id !== mainId && canAssign(a, next.pooling[a.id] || null, iso, "support"))
      .map((a) => a.id);
    const supportId = pickFair(supportEligible, countsSupport);
    if (supportId) countsSupport[supportId] += 1;

    const backupEligible = next.associates
      .filter((a) => a.id !== mainId && a.id !== supportId && canAssign(a, next.pooling[a.id] || null, iso, "support"))
      .map((a) => a.id);
    const backupId = pickFair(backupEligible, countsBackup);
    if (backupId) countsBackup[backupId] += 1;

    next.assignments[iso] = {
      mainId,
      supportId,
      categoryMain: "FHD",
      categorySupport: "BHD"
    };
    next.backups[iso] = {
      mainId,
      backupId
    };
  });

  return next;
}

module.exports = { createApiRouter, validateState };
