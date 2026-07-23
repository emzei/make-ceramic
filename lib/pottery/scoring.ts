import { BASE_CLAY_RADIUS } from "@/config/pottery";
import type { RadiusProfile } from "@/types/pottery";

const PENALTY_EXPONENT = 1.4;

export function computeScore(current: RadiusProfile, target: RadiusProfile): number {
  const total = current.reduce((sum, radius, i) => sum + Math.abs(radius - target[i]), 0);
  const avgAbsDiff = total / current.length;
  const normalizedDiff = Math.min(1, Math.max(0, avgAbsDiff / BASE_CLAY_RADIUS));
  const raw = Math.round(100 * Math.pow(1 - normalizedDiff, PENALTY_EXPONENT));
  return Math.min(100, Math.max(0, raw));
}
