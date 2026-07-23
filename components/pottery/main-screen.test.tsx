import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTopRanking } from "@/services/ranking-client";
import { MainScreen } from "./main-screen";

vi.mock("@/services/ranking-client", () => ({
  getTopRanking: vi.fn(),
}));

const mockedGetTopRanking = vi.mocked(getTopRanking);

describe("MainScreen", () => {
  beforeEach(() => {
    mockedGetTopRanking.mockReset();
  });

  it("[S1-1] top-5 랭킹이 있으면 목록으로 표시한다", async () => {
    mockedGetTopRanking.mockResolvedValue([
      { nickname: "균형잡힌 화병", score: 271, registeredAt: 1 },
      { nickname: "매끈한 단지", score: 258, registeredAt: 2 },
    ]);

    render(<MainScreen onStart={vi.fn()} />);

    expect(screen.getByRole("button", { name: "시작하기" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("ranking-list")).toBeInTheDocument());
    expect(screen.getByText("균형잡힌 화병")).toBeInTheDocument();
    expect(screen.getByText("271")).toBeInTheDocument();
  });

  it("[S1-1] 랭킹이 비어 있으면 빈 상태 문구를 표시한다", async () => {
    mockedGetTopRanking.mockResolvedValue([]);

    render(<MainScreen onStart={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("아직 등록된 기록이 없습니다")).toBeInTheDocument());
  });

  it("'시작하기' 클릭 시 onStart가 호출된다", async () => {
    mockedGetTopRanking.mockResolvedValue([]);
    const onStart = vi.fn();
    const user = userEvent.setup();

    render(<MainScreen onStart={onStart} />);
    await user.click(screen.getByRole("button", { name: "시작하기" }));

    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
