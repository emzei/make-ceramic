import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitScore } from "@/services/ranking-client";
import { ResultScreen } from "./result-screen";

vi.mock("@/services/ranking-client", () => ({
  submitScore: vi.fn(),
}));

const mockedSubmitScore = vi.mocked(submitScore);

describe("ResultScreen", () => {
  beforeEach(() => {
    mockedSubmitScore.mockReset();
  });

  it("최종 점수와 닉네임을 표시한다", async () => {
    mockedSubmitScore.mockResolvedValue({
      entries: [],
      madeTop5: false,
      registeredAt: 1,
    });

    render(<ResultScreen totalScore={231} nickname="찌그러진 항아리" onPlayAgain={vi.fn()} />);

    expect(screen.getByText("231")).toBeInTheDocument();
    expect(screen.getByText("찌그러진 항아리")).toBeInTheDocument();
  });

  it("[S7-1] top5 진입 시 본인 기록이 랭킹 리스트에서 강조 표시된다", async () => {
    mockedSubmitScore.mockResolvedValue({
      entries: [
        { nickname: "매끈한 단지", score: 258, registeredAt: 100 },
        { nickname: "찌그러진 항아리", score: 231, registeredAt: 300 },
      ],
      madeTop5: true,
      registeredAt: 300,
    });

    render(<ResultScreen totalScore={231} nickname="찌그러진 항아리" onPlayAgain={vi.fn()} />);

    await waitFor(() => expect(screen.getByTestId("own-ranking-row")).toBeInTheDocument());
    expect(screen.getByTestId("own-ranking-row")).toHaveTextContent("찌그러진 항아리");
  });

  it("[S7-2] top5 미진입 시 기존 랭킹은 보이되 본인 기록은 강조 표시되지 않는다", async () => {
    mockedSubmitScore.mockResolvedValue({
      entries: [
        { nickname: "매끈한 단지", score: 258, registeredAt: 100 },
        { nickname: "우아한 그릇", score: 244, registeredAt: 200 },
      ],
      madeTop5: false,
      registeredAt: 999,
    });

    render(<ResultScreen totalScore={50} nickname="소박한 물방울" onPlayAgain={vi.fn()} />);

    await waitFor(() => expect(screen.getByTestId("ranking-list")).toBeInTheDocument());
    expect(screen.queryByTestId("own-ranking-row")).not.toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("'다시 하기' 클릭 시 onPlayAgain이 호출된다", async () => {
    mockedSubmitScore.mockResolvedValue({ entries: [], madeTop5: false, registeredAt: 1 });
    const onPlayAgain = vi.fn();
    const user = userEvent.setup();

    render(<ResultScreen totalScore={100} nickname="닉네임" onPlayAgain={onPlayAgain} />);
    await user.click(screen.getByRole("button", { name: "다시 하기" }));

    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });
});
