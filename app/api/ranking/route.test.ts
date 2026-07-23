import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_TOTAL_SCORE } from "@/config/pottery";
import { readTop5, submitScore } from "@/lib/ranking/store";
import { GET, POST } from "./route";

vi.mock("@/lib/ranking/store", () => ({
  DEFAULT_RANKING_PATH: "data/ranking.json",
  readTop5: vi.fn(),
  submitScore: vi.fn(),
}));

const mockedReadTop5 = vi.mocked(readTop5);
const mockedSubmitScore = vi.mocked(submitScore);

function postRequest(body: unknown) {
  return new Request("http://localhost/api/ranking", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("GET/POST /api/ranking", () => {
  beforeEach(() => {
    mockedReadTop5.mockReset();
    mockedSubmitScore.mockReset();
  });

  it("GET은 저장소의 top5를 그대로 반환한다", async () => {
    mockedReadTop5.mockResolvedValue([{ nickname: "a", score: 100, registeredAt: 1 }]);

    const res = await GET();

    expect(await res.json()).toEqual([{ nickname: "a", score: 100, registeredAt: 1 }]);
  });

  it("유효한 요청은 submitScore를 호출하고 결과를 반환한다", async () => {
    mockedSubmitScore.mockResolvedValue({ entries: [], madeTop5: true });

    const res = await POST(postRequest({ nickname: "닉네임", score: 231 }));

    expect(res.status).toBe(200);
    expect(mockedSubmitScore).toHaveBeenCalledWith(
      "data/ranking.json",
      expect.objectContaining({ nickname: "닉네임", score: 231 })
    );
  });

  it("score가 최댓값을 넘으면 MAX_TOTAL_SCORE로 clamp한다 (조작된 점수 방지)", async () => {
    mockedSubmitScore.mockResolvedValue({ entries: [], madeTop5: true });

    await POST(postRequest({ nickname: "해커", score: 999999 }));

    expect(mockedSubmitScore).toHaveBeenCalledWith(
      "data/ranking.json",
      expect.objectContaining({ score: MAX_TOTAL_SCORE })
    );
  });

  it("nickname이 없으면 400을 반환하고 submitScore를 호출하지 않는다", async () => {
    const res = await POST(postRequest({ score: 100 }));

    expect(res.status).toBe(400);
    expect(mockedSubmitScore).not.toHaveBeenCalled();
  });

  it("score가 숫자가 아니면 400을 반환한다", async () => {
    const res = await POST(postRequest({ nickname: "닉네임", score: "231" }));

    expect(res.status).toBe(400);
    expect(mockedSubmitScore).not.toHaveBeenCalled();
  });

  it("잘못된 JSON 본문은 400을 반환한다", async () => {
    const res = await POST(postRequest("{invalid json"));

    expect(res.status).toBe(400);
    expect(mockedSubmitScore).not.toHaveBeenCalled();
  });
});
