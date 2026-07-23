import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DIFFICULTY_PRESETS } from "@/config/pottery";
import { usePotteryGame } from "@/hooks/use-pottery-game";
import { RoundScreen } from "./round-screen";

const targetProfile = DIFFICULTY_PRESETS[1][0].profile;

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

describe("RoundScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockCanvasRect();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("[S2-1] 목표 실루엣과 반죽 실루엣이 함께 렌더된다", () => {
    render(
      <RoundScreen targetProfile={targetProfile} roundIndex={1} totalRounds={3} roundScore={null} onRoundEnd={vi.fn()} />
    );

    expect(screen.getByTestId("target-silhouette")).toHaveAttribute("d", expect.stringMatching(/^M/));
    expect(screen.getByTestId("clay-silhouette")).toHaveAttribute("d", expect.stringMatching(/^M/));
  });

  it("[S2-2] 15초 카운트다운이 즉시 감소를 시작한다", () => {
    render(
      <RoundScreen targetProfile={targetProfile} roundIndex={1} totalRounds={3} roundScore={null} onRoundEnd={vi.fn()} />
    );

    expect(screen.getByTestId("round-timer")).toHaveTextContent("0:15");

    fireEvent.pointerDown(screen.getByTestId("clay-canvas"), { clientX: 80, clientY: 150, pointerType: "mouse" });
    fireEvent.pointerUp(screen.getByTestId("clay-canvas"));

    vi.advanceTimersByTime(1000);

    expect(screen.getByTestId("round-timer")).toHaveTextContent("0:14");
  });

  it("[S3-1] [INV-3] 포인터가 닿은 높이의 반죽 반지름이 즉시 줄어들고, 목표 실루엣은 그대로 유지된다", () => {
    render(
      <RoundScreen targetProfile={targetProfile} roundIndex={1} totalRounds={3} roundScore={null} onRoundEnd={vi.fn()} />
    );

    const targetBefore = screen.getByTestId("target-silhouette").getAttribute("d");
    const clayBefore = screen.getByTestId("clay-silhouette").getAttribute("d");

    fireEvent.pointerDown(screen.getByTestId("clay-canvas"), { clientX: 80, clientY: 150, pointerType: "mouse" });

    const clayAfter = screen.getByTestId("clay-silhouette").getAttribute("d");
    const targetAfter = screen.getByTestId("target-silhouette").getAttribute("d");

    expect(clayAfter).not.toEqual(clayBefore);
    expect(targetAfter).toEqual(targetBefore);
  });

  it("[INV-1] 마우스와 터치 포인터가 동일 좌표에서 동일하게 반죽을 깎는다", () => {
    const { unmount } = render(
      <RoundScreen targetProfile={targetProfile} roundIndex={1} totalRounds={3} roundScore={null} onRoundEnd={vi.fn()} />
    );
    fireEvent.pointerDown(screen.getByTestId("clay-canvas"), { clientX: 90, clientY: 100, pointerType: "mouse" });
    const mouseResult = screen.getByTestId("clay-silhouette").getAttribute("d");
    unmount();

    render(
      <RoundScreen targetProfile={targetProfile} roundIndex={1} totalRounds={3} roundScore={null} onRoundEnd={vi.fn()} />
    );
    fireEvent.pointerDown(screen.getByTestId("clay-canvas"), { clientX: 90, clientY: 100, pointerType: "touch" });
    const touchResult = screen.getByTestId("clay-silhouette").getAttribute("d");

    expect(touchResult).toEqual(mouseResult);
  });

  it("[S4-1] 시간 종료 이후 포인터 조작이 반죽 모양에 반영되지 않는다", () => {
    const onRoundEnd = vi.fn();
    render(
      <RoundScreen targetProfile={targetProfile} roundIndex={1} totalRounds={3} roundScore={null} onRoundEnd={onRoundEnd} />
    );

    vi.advanceTimersByTime(15000);
    expect(onRoundEnd).toHaveBeenCalledTimes(1);

    const clayAfterEnd = screen.getByTestId("clay-silhouette").getAttribute("d");
    fireEvent.pointerDown(screen.getByTestId("clay-canvas"), { clientX: 80, clientY: 150, pointerType: "mouse" });
    expect(screen.getByTestId("clay-silhouette").getAttribute("d")).toEqual(clayAfterEnd);
  });

  it("roundScore가 주어지면 점수 배지를 표시한다", () => {
    render(
      <RoundScreen targetProfile={targetProfile} roundIndex={2} totalRounds={3} roundScore={82} onRoundEnd={vi.fn()} />
    );

    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("[S4-2] use-pottery-game이 계산한 점수가 화면에 실제로 표시된다", () => {
    function Wrapper() {
      const game = usePotteryGame();
      return (
        <RoundScreen
          targetProfile={game.currentTarget.profile}
          roundIndex={game.roundIndex}
          totalRounds={game.totalRounds}
          roundScore={game.roundScore}
          onRoundEnd={game.handleRoundEnd}
        />
      );
    }

    render(<Wrapper />);
    fireEvent.pointerDown(screen.getByTestId("clay-canvas"), { clientX: 80, clientY: 150, pointerType: "mouse" });

    act(() => {
      vi.advanceTimersByTime(15000);
    });

    const badgeText = screen.queryByText(/^\d+$/);
    expect(badgeText).not.toBeNull();
    expect(Number(badgeText?.textContent)).toBeGreaterThanOrEqual(0);
    expect(Number(badgeText?.textContent)).toBeLessThanOrEqual(100);
  });
});
