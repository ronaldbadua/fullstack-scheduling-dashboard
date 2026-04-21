const { SHIFT_TYPES } = require("../../shared/schema");

function dateDow(iso) {
  return new Date(`${iso}T12:00:00`).getDay();
}

function dayBand(iso) {
  const dow = dateDow(iso);
  return dow <= 3 ? "sunWed" : "wedSat";
}

function isWeekend(iso) {
  const dow = dateDow(iso);
  return dow === 0 || dow === 6;
}

function isVacation(associate) {
  return !associate || associate.shiftType === "Vacation" || !associate.active;
}

function canAssign(associate, poolRule, iso, role) {
  if (!associate || !poolRule || poolRule.skip || isVacation(associate)) {
    return false;
  }

  if (role === "partTime") {
    return associate.shiftType === "Part Time" && isWeekend(iso) && poolRule.partTime;
  }

  if (associate.shiftType === "Part Time") {
    // Part-time can only be scheduled on weekends via part-time eligibility.
    return isWeekend(iso) && poolRule.partTime;
  }

  const band = dayBand(iso);
  return band === "sunWed" ? poolRule.sunWed : poolRule.wedSat;
}

function ensureShiftType(value) {
  if (!SHIFT_TYPES.includes(value)) {
    throw new Error(`Invalid shift type '${value}'`);
  }
}

module.exports = {
  canAssign,
  ensureShiftType,
  isWeekend,
  dayBand
};
