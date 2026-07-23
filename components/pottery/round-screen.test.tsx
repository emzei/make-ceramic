import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DIFFICULTY_PRESETS, RESULT_DISPLAY_MS, ROUND_DURATION_MS } from "@/config/pottery";
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
      <RoundScreen targetProfile={targetProfile} roundIndex={1} totalRounds={3} roundScore={null} completedScores={[]} onRoundEnd={vi.fn()} onSkipToNextRound={vi.fn()} />
    );

    expect(screen.getByTestId("target-silhouette")).toHaveAttribute("d", expect.stringMatching(/^M/));
    expect(screen.getByTestId("clay-silhouette")).toHaveAttribute("d", expect.stringMatching(/^M/));
  });

  it("[S2-2] 7초 카운트다운이 즉시 감소를 시작한다", () => {
    render(
      <RoundScreen targetProfile={targetProfile} roundIndex={1} totalRounds={3} roundScore={null} completedScores={[]} onRoundEnd={vi.fn()} onSkipToNextRound={vi.fn()} />
    );

    expect(screen.getByTestId("round-timer")).toHaveTextContent("0:07");

    fireEvent.pointerDown(screen.getByTestId("clay-canvas"), { clientX: 80, clientY: 150, pointerType: "mouse" });
    fireEvent.pointerUp(screen.getByTestId("clay-canvas"));

    vi.advanceTimersByTime(1000);

    expect(screen.getByTestId("round-timer")).toHaveTextContent("0:06");
  });

  it("[S3-1] [INV-3] 포인터가 닿은 높이의 반죽 반지름이 즉시 줄어들고, 목표 실루엣은 그대로 유지된다", () => {
    render(
      <RoundScreen targetProfile={targetProfile} roundIndex={1} totalRounds={3} roundScore={null} completedScores={[]} onRoundEnd={vi.fn()} onSkipToNextRound={vi.fn()} />
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
      <RoundScreen targetProfile={targetProfile} roundIndex={1} totalRounds={3} roundScore={null} completedScores={[]} onRoundEnd={vi.fn()} onSkipToNextRound={vi.fn()} />
    );
    fireEvent.pointerDown(screen.getByTestId("clay-canvas"), { clientX: 90, clientY: 100, pointerType: "mouse" });
    const mouseResult = screen.getByTestId("clay-silhouette").getAttribute("d");
    unmount();

    render(
      <RoundScreen targetProfile={targetProfile} roundIndex={1} totalRounds={3} roundScore={null} completedScores={[]} onRoundEnd={vi.fn()} onSkipToNextRound={vi.fn()} />
    );
    fireEvent.pointerDown(screen.getByTestId("clay-canvas"), { clientX: 90, clientY: 100, pointerType: "touch" });
    const touchResult = screen.getByTestId("clay-silhouette").getAttribute("d");

    expect(touchResult).toEqual(mouseResult);
  });

  it("[S4-1] 시간 종료 이후 포인터 조작이 반죽 모양에 반영되지 않는다", () => {
    const onRoundEnd = vi.fn();
    render(
      <RoundScreen
        targetProfile={targetProfile}
        roundIndex={1}
        totalRounds={3}
        roundScore={null}
        completedScores={[]}
        onRoundEnd={onRoundEnd}
        onSkipToNextRound={vi.fn()}
      />
    );

    vi.advanceTimersByTime(ROUND_DURATION_MS);
    expect(onRoundEnd).toHaveBeenCalledTimes(1);

    const clayAfterEnd = screen.getByTestId("clay-silhouette").getAttribute("d");
    fireEvent.pointerDown(screen.getByTestId("clay-canvas"), { clientX: 80, clientY: 150, pointerType: "mouse" });
    expect(screen.getByTestId("clay-silhouette").getAttribute("d")).toEqual(clayAfterEnd);
  });

  it("반죽의 맨 위 끝(index 0)까지 실제로 깎인다 (TOP_Y/BOTTOM_Y 경계 버그 회귀 테스트)", () => {
    render(
      <RoundScreen targetProfile={targetProfile} roundIndex={1} totalRounds={3} roundScore={null} completedScores={[]} onRoundEnd={vi.fn()} onSkipToNextRound={vi.fn()} />
    );

    const topClientY = (20 * 320) / 340;
    const centerClientX = (100 * 160) / 200;
    fireEvent.pointerDown(screen.getByTestId("clay-canvas"), {
      clientX: centerClientX,
      clientY: topClientY,
      pointerType: "mouse",
    });

    expect(screen.getByTestId("clay-silhouette").getAttribute("d")).toMatch(/^M100,20 /);
  });

  it("반죽의 맨 아래 끝(마지막 index)까지 실제로 깎인다 (TOP_Y/BOTTOM_Y 경계 버그 회귀 테스트)", () => {
    render(
      <RoundScreen targetProfile={targetProfile} roundIndex={1} totalRounds={3} roundScore={null} completedScores={[]} onRoundEnd={vi.fn()} onSkipToNextRound={vi.fn()} />
    );

    const bottomClientY = (290 * 320) / 340;
    const centerClientX = (100 * 160) / 200;
    fireEvent.pointerDown(screen.getByTestId("clay-canvas"), {
      clientX: centerClientX,
      clientY: bottomClientY,
      pointerType: "mouse",
    });

    expect(screen.getByTestId("clay-silhouette").getAttribute("d")).toContain("100,290");
  });

  it("포인터를 누르고 있는 동안 위치 인디케이터가 표시되고, 떼면 사라진다", () => {
    render(
      <RoundScreen targetProfile={targetProfile} roundIndex={1} totalRounds={3} roundScore={null} completedScores={[]} onRoundEnd={vi.fn()} onSkipToNextRound={vi.fn()} />
    );

    const indicator = screen.getByTestId("pointer-indicator");
    expect(indicator.style.opacity).toBe("0");

    fireEvent.pointerDown(screen.getByTestId("clay-canvas"), { clientX: 80, clientY: 150, pointerType: "mouse" });
    expect(indicator.style.opacity).toBe("1");

    fireEvent.pointerUp(screen.getByTestId("clay-canvas"));
    expect(indicator.style.opacity).toBe("0");
  });

  it("목표 실루엣은 반죽 위에 그려져(DOM 순서) 대비되는 색으로 항상 보인다 (INV-3 가시성 버그 수정)", () => {
    render(
      <RoundScreen targetProfile={targetProfile} roundIndex={1} totalRounds={3} roundScore={null} completedScores={[]} onRoundEnd={vi.fn()} onSkipToNextRound={vi.fn()} />
    );

    const clay = screen.getByTestId("clay-silhouette");
    const target = screen.getByTestId("target-silhouette");

    expect(clay.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(target).toHaveAttribute("stroke", "var(--primary)");
  });

  it("[S5-3] 마지막 라운드가 아니면 '다음 라운드' 스킵 버튼이 표시되고 클릭 시 콜백이 호출된다", () => {
    const onSkipToNextRound = vi.fn();
    render(
      <RoundScreen
        targetProfile={targetProfile}
        roundIndex={1}
        totalRounds={3}
        roundScore={82}
        completedScores={[]}
        onRoundEnd={vi.fn()}
        onSkipToNextRound={onSkipToNextRound}
      />
    );

    const button = screen.getByRole("button", { name: "다음 라운드" });
    fireEvent.click(button);
    expect(onSkipToNextRound).toHaveBeenCalledTimes(1);
  });

  it("[S5-3] 마지막 라운드에서는 '다음 라운드' 대신 '결과 보기' 버튼이 표시되고 클릭 시 콜백이 호출된다", () => {
    const onSkipToNextRound = vi.fn();
    render(
      <RoundScreen
        targetProfile={targetProfile}
        roundIndex={3}
        totalRounds={3}
        roundScore={82}
        completedScores={[90, 85]}
        onRoundEnd={vi.fn()}
        onSkipToNextRound={onSkipToNextRound}
      />
    );

    expect(screen.queryByRole("button", { name: "다음 라운드" })).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: "결과 보기" });
    fireEvent.click(button);
    expect(onSkipToNextRound).toHaveBeenCalledTimes(1);
  });

  it("[S5-4] 자동 전환까지 남은 시간이 초 단위 카운트다운으로 표시되고 매초 감소한다", () => {
    render(
      <RoundScreen
        targetProfile={targetProfile}
        roundIndex={1}
        totalRounds={3}
        roundScore={82}
        completedScores={[]}
        onRoundEnd={vi.fn()}
        onSkipToNextRound={vi.fn()}
      />
    );

    const initialSeconds = Math.ceil(RESULT_DISPLAY_MS / 1000);
    const countdown = screen.getByTestId("auto-advance-countdown");
    expect(countdown).toHaveTextContent(`${initialSeconds}초 뒤 자동 전환`);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(countdown).toHaveTextContent(`${initialSeconds - 1}초 뒤 자동 전환`);
  });

  it("[S5-4] 마지막 라운드에서도 자동 전환 카운트다운이 표시된다", () => {
    render(
      <RoundScreen
        targetProfile={targetProfile}
        roundIndex={3}
        totalRounds={3}
        roundScore={82}
        completedScores={[90, 85]}
        onRoundEnd={vi.fn()}
        onSkipToNextRound={vi.fn()}
      />
    );

    expect(screen.queryByTestId("auto-advance-countdown")).toBeInTheDocument();
  });

  it('[S2-3] 완료된 라운드는 점수가, 아직 완료되지 않은 라운드는 "-"가 표시된다', () => {
    render(
      <RoundScreen
        targetProfile={targetProfile}
        roundIndex={2}
        totalRounds={3}
        roundScore={null}
        completedScores={[77]}
        onRoundEnd={vi.fn()}
        onSkipToNextRound={vi.fn()}
      />
    );

    expect(screen.getByText("1라운드")).toBeInTheDocument();
    expect(screen.getByText("77")).toBeInTheDocument();
    expect(screen.getAllByText("-")).toHaveLength(2);
  });

  it("roundScore가 주어지면 점수 배지를 표시한다", () => {
    render(
      <RoundScreen targetProfile={targetProfile} roundIndex={2} totalRounds={3} roundScore={82} completedScores={[90]} onRoundEnd={vi.fn()} onSkipToNextRound={vi.fn()} />
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
          completedScores={game.completedScores}
          onRoundEnd={game.handleRoundEnd}
          onSkipToNextRound={game.skipToNextRound}
        />
      );
    }

    render(<Wrapper />);
    fireEvent.pointerDown(screen.getByTestId("clay-canvas"), { clientX: 80, clientY: 150, pointerType: "mouse" });

    act(() => {
      vi.advanceTimersByTime(ROUND_DURATION_MS);
    });

    const badgeText = screen.getByTestId("round-score-badge").textContent;
    expect(badgeText).not.toBeNull();
    expect(Number(badgeText)).toBeGreaterThanOrEqual(0);
    expect(Number(badgeText)).toBeLessThanOrEqual(100);
  });
});
