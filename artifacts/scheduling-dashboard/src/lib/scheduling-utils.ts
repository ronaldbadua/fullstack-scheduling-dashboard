import { Associate, PoolRule } from "@workspace/api-client-react";
import { parseISO, getDay } from "date-fns";

export function isAssociateEligibleForDate(
  associate: Associate,
  poolRule: PoolRule | undefined,
  dateStr: string // YYYY-MM-DD
): boolean {
  if (!associate.active) return false;
  if (associate.shiftType === "Vacation") return false;
  if (poolRule?.skip) return false;

  const date = parseISO(dateStr);
  const dayOfWeek = getDay(date); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // Sun-Wed band = 0, 1, 2, 3
  const isSunWedBand = dayOfWeek >= 0 && dayOfWeek <= 3;
  // Wed-Sat band = 3, 4, 5, 6
  // Wait, problem says: "Days 0-3 = sunWed band; days 4-6 = wedSat band"
  // Let's use the exact rules from the prompt:
  // "Days 0-3 = "sunWed" band; days 4-6 = "wedSat" band"
  const isPromptSunWedBand = dayOfWeek >= 0 && dayOfWeek <= 3;
  const isPromptWedSatBand = dayOfWeek >= 4 && dayOfWeek <= 6;

  if (associate.shiftType === "Part Time") {
    // Part-time associates can only be assigned on weekends (day 0 or 6) and only if poolRule.partTime is true
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return isWeekend && (poolRule?.partTime ?? false);
  }

  if (associate.shiftType === "FHD") {
    // FHD associates: eligible when poolRule.sunWed is true and date is in sunWed band
    return (poolRule?.sunWed ?? false) && isPromptSunWedBand;
  }

  if (associate.shiftType === "BHD") {
    // BHD associates: eligible when poolRule.wedSat is true and date is in wedSat band
    return (poolRule?.wedSat ?? false) && isPromptWedSatBand;
  }

  return false;
}
