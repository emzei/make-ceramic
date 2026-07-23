import { afterEach, describe, expect, it, vi } from "vitest";
import { generateNickname } from "./nickname";

describe("generateNickname", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("[S6-2] 명사는 전달받은 마지막 라운드 프리셋의 noun을 그대로 사용한다", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const nickname = generateNickname(150, "항아리");
    expect(nickname.endsWith("항아리")).toBe(true);
  });

  it("[S6-2] 형용사+명사 형태로 조합된다", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const nickname = generateNickname(50, "컵");
    expect(nickname.split(" ")).toHaveLength(2);
    expect(nickname).toBe("삐뚤어진 컵");
  });

  it("총점 구간에 따라 다른 형용사 후보 풀에서 선택한다", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const low = generateNickname(10, "그릇");
    const mid = generateNickname(150, "그릇");
    const high = generateNickname(280, "그릇");

    expect(low).toBe("삐뚤어진 그릇");
    expect(mid).toBe("소박한 그릇");
    expect(high).toBe("우아한 그릇");
  });
});
