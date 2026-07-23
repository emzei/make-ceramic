import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DIFFICULTY_PRESETS, RADIUS_SAMPLES, RESULT_DISPLAY_MS } from "@/config/pottery";
import { computeScore } from "@/lib/pottery/scoring";
import { usePotteryGame } from "./use-pottery-game";

describe("usePotteryGame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("[S4-2] 라운드 종료 시 반죽과 목표 실루엣 차이를 기반으로 0~100 정수 점수를 계산한다", () => {
    const { result } = renderHook(() => usePotteryGame());
    const target = result.current.currentTarget.profile;
    const carved = target.map((r) => Math.max(0, r - 5));

    act(() => {
      result.current.handleRoundEnd(carved);
    });

    expect(result.current.roundScore).toBe(computeScore(carved, target));
    expect(result.current.roundScore).toBeGreaterThanOrEqual(0);
    expect(result.current.roundScore).toBeLessThanOrEqual(100);
    expect(Number.isInteger(result.current.roundScore)).toBe(true);
  });

  it("[S4-3] 반죽이 완전히 사라져도 별도 실패 분기 없이 점수가 계산된다", () => {
    const { result } = renderHook(() => usePotteryGame());
    const zeroed = new Array(RADIUS_SAMPLES).fill(0);

    act(() => {
      result.current.handleRoundEnd(zeroed);
    });

    expect(result.current.roundScore).not.toBeNull();
    expect(result.current.roundScore).toBeGreaterThanOrEqual(0);
    expect(result.current.roundScore).toBeLessThanOrEqual(100);
  });

  it("[S5-1] 점수 표시 후 일정 시간이 지나면 사용자 조작 없이 다음 라운드로 자동 전환된다", () => {
    const { result } = renderHook(() => usePotteryGame());
    const target = result.current.currentTarget.profile;

    act(() => {
      result.current.handleRoundEnd(target);
    });
    expect(result.current.roundIndex).toBe(1);
    expect(result.current.roundScore).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(RESULT_DISPLAY_MS);
    });

    expect(result.current.roundIndex).toBe(2);
    expect(result.current.roundScore).toBeNull();
  });

  it("[S5-2] 다음 라운드의 목표 실루엣은 해당 난이도 티어 내에서 무작위로 선택된다", () => {
    const { result } = renderHook(() => usePotteryGame());
    const target = result.current.currentTarget.profile;

    vi.spyOn(Math, "random").mockReturnValue(0);
    act(() => {
      result.current.handleRoundEnd(target);
    });
    act(() => {
      vi.advanceTimersByTime(RESULT_DISPLAY_MS);
    });
    expect(result.current.currentTarget).toBe(DIFFICULTY_PRESETS[2][0]);

    vi.spyOn(Math, "random").mockReturnValue(0.99);
    act(() => {
      result.current.handleRoundEnd(result.current.currentTarget.profile);
    });
    act(() => {
      vi.advanceTimersByTime(RESULT_DISPLAY_MS);
    });
    expect(result.current.currentTarget).toBe(
      DIFFICULTY_PRESETS[3][DIFFICULTY_PRESETS[3].length - 1]
    );
  });

  it("마지막 라운드 종료 후에는 자동 전환이 일어나지 않는다", () => {
    const { result } = renderHook(() => usePotteryGame());

    act(() => {
      result.current.handleRoundEnd(result.current.currentTarget.profile);
    });
    act(() => {
      vi.advanceTimersByTime(RESULT_DISPLAY_MS);
    });
    expect(result.current.roundIndex).toBe(2);

    act(() => {
      result.current.handleRoundEnd(result.current.currentTarget.profile);
    });
    act(() => {
      vi.advanceTimersByTime(RESULT_DISPLAY_MS);
    });
    expect(result.current.roundIndex).toBe(3);

    act(() => {
      result.current.handleRoundEnd(result.current.currentTarget.profile);
    });
    act(() => {
      vi.advanceTimersByTime(RESULT_DISPLAY_MS * 2);
    });

    expect(result.current.roundIndex).toBe(3);
    expect(result.current.roundScore).not.toBeNull();
    expect(result.current.completedScores).toHaveLength(3);
  });
});
