import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTopRanking, submitScore } from "@/services/ranking-client";
import { ROUND_DURATION_MS, RESULT_DISPLAY_MS } from "@/config/pottery";
import { PotteryApp } from "./pottery-app";

vi.mock("@/services/ranking-client", () => ({
  getTopRanking: vi.fn(),
  submitScore: vi.fn(),
}));

const mockedGetTopRanking = vi.mocked(getTopRanking);
const mockedSubmitScore = vi.mocked(submitScore);

function mockCanvasRect() {
  vi.spyOn(SVGSVGElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 160,
    height: 320,
    top: 0,
    left: 0,
    right: 160,
    bottom: 320,
    x: 0,
    y: 0,
    toJSON() {},
  });
}

async function playThroughRound() {
  await act(async () => {
    vi.advanceTimersByTime(ROUND_DURATION_MS);
  });
}

describe("PotteryApp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockCanvasRect();
    mockedGetTopRanking.mockResolvedValue([]);
    mockedSubmitScore.mockResolvedValue({ entries: [], madeTop5: true, nickname: "닉네임", registeredAt: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("[S1-2] '시작하기' 클릭 시 1라운드 화면으로 전환된다", async () => {
    render(<PotteryApp />);

    expect(screen.getByRole("button", { name: "시작하기" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "시작하기" }));

    expect(screen.getByTestId("clay-canvas")).toBeInTheDocument();
    expect(screen.getByText("1 / 3 라운드")).toBeInTheDocument();
  });

  it("[S8-1] '다시 하기' 클릭 시 1라운드부터 새 게임이 즉시 시작된다", async () => {
    render(<PotteryApp />);

    fireEvent.click(screen.getByRole("button", { name: "시작하기" }));

    for (let round = 1; round <= 3; round++) {
      expect(screen.getByText(`${round} / 3 라운드`)).toBeInTheDocument();
      await playThroughRound();
      await act(async () => {
        vi.advanceTimersByTime(RESULT_DISPLAY_MS);
      });
    }

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: "다시 하기" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 하기" }));

    expect(screen.getByText("1 / 3 라운드")).toBeInTheDocument();
    expect(screen.getByTestId("clay-canvas")).toBeInTheDocument();
  });
});
