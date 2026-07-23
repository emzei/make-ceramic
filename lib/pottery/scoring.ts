import { BASE_CLAY_RADIUS } from "@/config/pottery";
import type { RadiusProfile } from "@/types/pottery";

export function computeScore(current: RadiusProfile, target: RadiusProfile): number {
  const total = current.reduce((sum, radius, i) => sum + Math.abs(radius - target[i]), 0);
  const avgAbsDiff = total / current.length;
  const raw = Math.round(100 * (1 - avgAbsDiff / BASE_CLAY_RADIUS));
  return Math.min(100, Math.max(0, raw));
}
