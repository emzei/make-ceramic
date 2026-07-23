import type { DifficultyTier, RadiusProfile, TargetPreset } from "@/types/pottery";

export const RADIUS_SAMPLES = 40;
export const BASE_CLAY_RADIUS = 45;
export const ROUND_DURATION_MS = 15000;
export const RESULT_DISPLAY_MS = 2000;
export const TOTAL_ROUNDS = 3;

type ControlPoint = [heightFraction: number, radius: number];

function buildProfile(controlPoints: ControlPoint[]): RadiusProfile {
  const profile: number[] = [];
  for (let i = 0; i < RADIUS_SAMPLES; i++) {
    const t = i / (RADIUS_SAMPLES - 1);
    let lo = controlPoints[0];
    let hi = controlPoints[controlPoints.length - 1];
    for (let j = 0; j < controlPoints.length - 1; j++) {
      if (t >= controlPoints[j][0] && t <= controlPoints[j + 1][0]) {
        lo = controlPoints[j];
        hi = controlPoints[j + 1];
        break;
      }
    }
    const span = hi[0] - lo[0];
    const localT = span === 0 ? 0 : (t - lo[0]) / span;
    const radius = lo[1] + (hi[1] - lo[1]) * localT;
    profile.push(Math.round(radius * 100) / 100);
  }
  return profile;
}

export const DIFFICULTY_PRESETS: Record<DifficultyTier, TargetPreset[]> = {
  1: [
    {
      id: "cup",
      difficultyTier: 1,
      noun: "소박한 컵",
      profile: buildProfile([
        [0, 38],
        [0.15, 40],
        [1, 34],
      ]),
    },
    {
      id: "plate",
      difficultyTier: 1,
      noun: "삐뚤어진 접시",
      profile: buildProfile([
        [0, 42],
        [0.5, 30],
        [1, 40],
      ]),
    },
  ],
  2: [
    {
      id: "jar",
      difficultyTier: 2,
      noun: "매끈한 단지",
      profile: buildProfile([
        [0, 30],
        [0.3, 40],
        [0.7, 38],
        [1, 24],
      ]),
    },
    {
      id: "vase",
      difficultyTier: 2,
      noun: "우아한 그릇",
      profile: buildProfile([
        [0, 26],
        [0.25, 36],
        [0.6, 22],
        [1, 32],
      ]),
    },
  ],
  3: [
    {
      id: "amphora",
      difficultyTier: 3,
      noun: "찌그러진 항아리",
      profile: buildProfile([
        [0, 20],
        [0.2, 34],
        [0.45, 18],
        [0.7, 30],
        [1, 26],
      ]),
    },
    {
      id: "bottle",
      difficultyTier: 3,
      noun: "균형잡힌 화병",
      profile: buildProfile([
        [0, 12],
        [0.1, 16],
        [0.35, 40],
        [0.55, 20],
        [0.8, 28],
        [1, 20],
      ]),
    },
  ],
};
