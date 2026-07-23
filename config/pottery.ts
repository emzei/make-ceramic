import type { DifficultyTier, RadiusProfile, TargetPreset } from "@/types/pottery";

export const RADIUS_SAMPLES = 40;
export const BASE_CLAY_RADIUS = 90;
export const ROUND_DURATION_MS = 7000;
export const RESULT_DISPLAY_MS = 7000;
export const TOTAL_ROUNDS = 3;
export const MAX_TOTAL_SCORE = TOTAL_ROUNDS * 100;
export const MAX_NICKNAME_LENGTH = 40;

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

// 3라운드(최고 난이도) 전용: 기본 윤곽선 위에 잔물결을 얹어 꺾임 횟수를 늘린다.
// rippleCycles가 클수록 굴곡이 촘촘해지고, rippleAmplitude가 클수록 꺾임이 날카로워진다.
function buildRippledProfile(
  controlPoints: ControlPoint[],
  rippleAmplitude: number,
  rippleCycles: number
): RadiusProfile {
  const base = buildProfile(controlPoints);
  return base.map((radius, i) => {
    const t = i / (RADIUS_SAMPLES - 1);
    const ripple = rippleAmplitude * Math.sin(t * rippleCycles * Math.PI * 2);
    const rippled = Math.max(4, Math.min(BASE_CLAY_RADIUS - 2, radius + ripple));
    return Math.round(rippled * 100) / 100;
  });
}

export const DIFFICULTY_PRESETS: Record<DifficultyTier, TargetPreset[]> = {
  1: [
    {
      id: "cup",
      difficultyTier: 1,
      noun: "컵",
      profile: buildProfile([
        [0, 38],
        [0.15, 40],
        [1, 34],
      ]),
    },
    {
      id: "plate",
      difficultyTier: 1,
      noun: "접시",
      profile: buildProfile([
        [0, 42],
        [0.5, 30],
        [1, 40],
      ]),
    },
    {
      id: "mug",
      difficultyTier: 1,
      noun: "머그컵",
      profile: buildProfile([
        [0, 34],
        [0.2, 38],
        [1, 30],
      ]),
    },
    {
      id: "bowl",
      difficultyTier: 1,
      noun: "사발",
      profile: buildProfile([
        [0, 42],
        [0.3, 28],
        [0.7, 28],
        [1, 40],
      ]),
    },
    {
      id: "sauce-dish",
      difficultyTier: 1,
      noun: "종지",
      profile: buildProfile([
        [0, 38],
        [0.35, 24],
        [0.65, 24],
        [1, 36],
      ]),
    },
    {
      id: "tumbler",
      difficultyTier: 1,
      noun: "텀블러",
      profile: buildProfile([
        [0, 28],
        [0.15, 36],
        [0.8, 36],
        [1, 24],
      ]),
    },
    {
      id: "shot-cup",
      difficultyTier: 1,
      noun: "잔",
      profile: buildProfile([
        [0, 30],
        [0.15, 38],
        [0.4, 26],
        [0.7, 38],
        [1, 28],
      ]),
    },
    {
      id: "planter",
      difficultyTier: 1,
      noun: "화분",
      profile: buildProfile([
        [0, 32],
        [0.2, 44],
        [0.45, 26],
        [0.7, 42],
        [1, 30],
      ]),
    },
    {
      id: "saucer-stand",
      difficultyTier: 1,
      noun: "받침",
      profile: buildProfile([
        [0, 38],
        [0.15, 44],
        [0.35, 26],
        [0.55, 44],
        [0.75, 24],
        [1, 36],
      ]),
    },
    {
      id: "deep-bowl",
      difficultyTier: 1,
      noun: "볼",
      profile: buildProfile([
        [0, 42],
        [0.12, 46],
        [0.3, 24],
        [0.48, 46],
        [0.66, 22],
        [0.84, 44],
        [1, 30],
      ]),
    },
  ],
  2: [
    {
      id: "jar",
      difficultyTier: 2,
      noun: "단지",
      profile: buildProfile([
        [0, 24],
        [0.1, 46],
        [0.22, 48],
        [0.35, 18],
        [0.5, 50],
        [0.65, 22],
        [0.8, 44],
        [1, 30],
      ]),
    },
    {
      id: "vase",
      difficultyTier: 2,
      noun: "그릇",
      profile: buildProfile([
        [0, 20],
        [0.15, 40],
        [0.3, 16],
        [0.45, 42],
        [0.6, 14],
        [0.75, 38],
        [0.9, 46],
        [1, 26],
      ]),
    },
    {
      id: "teapot",
      difficultyTier: 2,
      noun: "주전자",
      profile: buildProfile([
        [0, 22],
        [0.12, 42],
        [0.25, 20],
        [0.4, 44],
        [0.55, 20],
        [0.7, 40],
        [0.85, 26],
        [1, 34],
      ]),
    },
    {
      id: "gourd-dipper",
      difficultyTier: 2,
      noun: "표주박",
      profile: buildProfile([
        [0, 26],
        [0.15, 44],
        [0.3, 20],
        [0.45, 40],
        [0.6, 18],
        [0.75, 42],
        [0.9, 24],
        [1, 30],
      ]),
    },
    {
      id: "gourd-bottle",
      difficultyTier: 2,
      noun: "호리병",
      profile: buildProfile([
        [0, 18],
        [0.1, 42],
        [0.22, 16],
        [0.34, 46],
        [0.46, 18],
        [0.58, 42],
        [0.7, 20],
        [0.85, 38],
        [1, 26],
      ]),
    },
    {
      id: "large-bowl",
      difficultyTier: 2,
      noun: "대접",
      profile: buildProfile([
        [0, 30],
        [0.12, 48],
        [0.24, 26],
        [0.38, 50],
        [0.5, 24],
        [0.64, 46],
        [0.78, 28],
        [0.9, 40],
        [1, 32],
      ]),
    },
    {
      id: "water-bottle",
      difficultyTier: 2,
      noun: "물병",
      profile: buildProfile([
        [0, 16],
        [0.08, 20],
        [0.2, 44],
        [0.32, 18],
        [0.44, 46],
        [0.56, 20],
        [0.68, 42],
        [0.8, 22],
        [0.92, 36],
        [1, 24],
      ]),
    },
    {
      id: "earthenware-jar",
      difficultyTier: 2,
      noun: "옹기",
      profile: buildProfile([
        [0, 20],
        [0.1, 46],
        [0.22, 48],
        [0.34, 16],
        [0.46, 48],
        [0.58, 18],
        [0.7, 44],
        [0.82, 22],
        [0.94, 38],
        [1, 28],
      ]),
    },
    {
      id: "basin",
      difficultyTier: 2,
      noun: "자배기",
      profile: buildProfile([
        [0, 28],
        [0.08, 32],
        [0.18, 48],
        [0.28, 14],
        [0.38, 48],
        [0.48, 16],
        [0.58, 46],
        [0.68, 18],
        [0.78, 42],
        [0.88, 22],
        [1, 34],
      ]),
    },
    {
      id: "small-gourd-bottle",
      difficultyTier: 2,
      noun: "조롱박병",
      profile: buildProfile([
        [0, 14],
        [0.06, 18],
        [0.14, 44],
        [0.22, 12],
        [0.3, 48],
        [0.38, 14],
        [0.46, 46],
        [0.54, 16],
        [0.62, 44],
        [0.72, 18],
        [0.84, 40],
        [1, 24],
      ]),
    },
  ],
  3: [
    {
      id: "amphora",
      difficultyTier: 3,
      noun: "항아리",
      profile: buildRippledProfile(
        [
          [0, 14],
          [0.08, 44],
          [0.18, 48],
          [0.3, 12],
          [0.42, 50],
          [0.55, 16],
          [0.68, 46],
          [0.8, 20],
          [0.92, 40],
          [1, 24],
        ],
        6,
        7
      ),
    },
    {
      id: "bottle",
      difficultyTier: 3,
      noun: "화병",
      profile: buildRippledProfile(
        [
          [0, 8],
          [0.06, 12],
          [0.15, 46],
          [0.28, 50],
          [0.4, 10],
          [0.52, 48],
          [0.64, 14],
          [0.76, 44],
          [0.88, 18],
          [1, 30],
        ],
        6,
        8
      ),
    },
    {
      id: "maebyeong",
      difficultyTier: 3,
      noun: "매병",
      profile: buildRippledProfile(
        [
          [0, 10],
          [0.06, 14],
          [0.16, 46],
          [0.28, 50],
          [0.4, 12],
          [0.52, 48],
          [0.64, 16],
          [0.76, 44],
          [0.86, 20],
          [0.94, 34],
          [1, 26],
        ],
        6,
        9
      ),
    },
    {
      id: "double-gourd-bottle",
      difficultyTier: 3,
      noun: "이중표주박병",
      profile: buildRippledProfile(
        [
          [0, 8],
          [0.05, 12],
          [0.13, 44],
          [0.22, 10],
          [0.3, 46],
          [0.38, 12],
          [0.46, 44],
          [0.54, 14],
          [0.62, 42],
          [0.72, 18],
          [0.85, 32],
          [1, 22],
        ],
        6,
        8
      ),
    },
    {
      id: "hourglass-jar",
      difficultyTier: 3,
      noun: "장고항아리",
      profile: buildRippledProfile(
        [
          [0, 30],
          [0.1, 36],
          [0.2, 12],
          [0.3, 44],
          [0.4, 48],
          [0.5, 10],
          [0.6, 48],
          [0.7, 44],
          [0.8, 12],
          [0.9, 40],
          [0.96, 26],
          [1, 20],
        ],
        6,
        7
      ),
    },
    {
      id: "egg-bottle",
      difficultyTier: 3,
      noun: "계란형병",
      profile: buildRippledProfile(
        [
          [0, 12],
          [0.08, 16],
          [0.2, 48],
          [0.32, 50],
          [0.44, 46],
          [0.52, 14],
          [0.6, 46],
          [0.68, 50],
          [0.76, 44],
          [0.84, 16],
          [0.92, 30],
          [1, 22],
        ],
        6,
        9
      ),
    },
    {
      id: "long-neck-bottle",
      difficultyTier: 3,
      noun: "목긴병",
      profile: buildRippledProfile(
        [
          [0, 6],
          [0.05, 8],
          [0.12, 10],
          [0.22, 44],
          [0.32, 48],
          [0.42, 12],
          [0.52, 46],
          [0.62, 14],
          [0.7, 44],
          [0.78, 16],
          [0.86, 40],
          [0.94, 24],
          [1, 18],
        ],
        6,
        8
      ),
    },
    {
      id: "pleated-jar",
      difficultyTier: 3,
      noun: "주름항아리",
      profile: buildRippledProfile(
        [
          [0, 24],
          [0.08, 34],
          [0.16, 20],
          [0.24, 34],
          [0.32, 20],
          [0.4, 34],
          [0.48, 20],
          [0.56, 34],
          [0.64, 20],
          [0.72, 34],
          [0.8, 20],
          [0.88, 34],
          [0.94, 26],
          [1, 22],
        ],
        5,
        10
      ),
    },
    {
      id: "trumpet-bottle",
      difficultyTier: 3,
      noun: "나팔병",
      profile: buildRippledProfile(
        [
          [0, 10],
          [0.06, 14],
          [0.16, 42],
          [0.26, 12],
          [0.36, 44],
          [0.46, 14],
          [0.56, 42],
          [0.64, 16],
          [0.72, 38],
          [0.8, 18],
          [0.88, 32],
          [0.94, 42],
          [1, 50],
        ],
        6,
        9
      ),
    },
    {
      id: "swirl-jar",
      difficultyTier: 3,
      noun: "소용돌이항아리",
      profile: buildRippledProfile(
        [
          [0, 8],
          [0.05, 12],
          [0.12, 44],
          [0.2, 6],
          [0.28, 48],
          [0.36, 10],
          [0.44, 46],
          [0.52, 12],
          [0.6, 44],
          [0.68, 14],
          [0.76, 40],
          [0.84, 16],
          [0.9, 34],
          [0.95, 20],
          [1, 26],
        ],
        6,
        10
      ),
    },
  ],
};
