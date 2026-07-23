import { describe, expect, it } from "vitest";
import { computeScore } from "./scoring";
import { BASE_CLAY_RADIUS, DIFFICULTY_PRESETS, RADIUS_SAMPLES } from "@/config/pottery";

describe("scoring", () => {
  it("[INV-4] 모든 난이도 티어 프리셋의 최대 반지름은 BASE_CLAY_RADIUS 이하다", () => {
    const allPresets = Object.values(DIFFICULTY_PRESETS).flat();
    for (const preset of allPresets) {
      expect(preset.profile).toHaveLength(RADIUS_SAMPLES);
      const maxRadius = Math.max(...preset.profile);
      expect(maxRadius).toBeLessThanOrEqual(BASE_CLAY_RADIUS);
    }
  });

  it("동일한 두 실루엣은 100점을 받는다", () => {
    const profile = DIFFICULTY_PRESETS[1][0].profile;
    expect(computeScore(profile, profile)).toBe(100);
  });

  it("완전히 사라진 반죽(전부 0)도 발산 없이 0~100 범위로 채점된다", () => {
    const target = DIFFICULTY_PRESETS[3][0].profile;
    const zeroed = new Array(RADIUS_SAMPLES).fill(0);
    const score = computeScore(zeroed, target);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("차이가 클수록 점수가 낮다", () => {
    const target = DIFFICULTY_PRESETS[2][0].profile;
    const closeMatch = target.map((r) => r - 1);
    const farMatch = target.map((r) => Math.max(0, r - 20));
    expect(computeScore(closeMatch, target)).toBeGreaterThan(computeScore(farMatch, target));
  });
});
