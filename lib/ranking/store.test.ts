import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RankingEntry } from "@/types/pottery";
import { readTop5, submitScore } from "./store";

describe("ranking store", () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "ranking-test-"));
    filePath = path.join(dir, "ranking.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("파일이 없으면 빈 배열을 반환한다", async () => {
    const result = await readTop5(path.join(dir, "missing.json"));
    expect(result).toEqual([]);
  });

  it("저장된 top5 목록을 그대로 읽어온다", async () => {
    const entries: RankingEntry[] = [
      { nickname: "찌그러진 항아리", score: 231, registeredAt: 1000 },
      { nickname: "매끈한 단지", score: 200, registeredAt: 900 },
    ];
    await writeFile(filePath, JSON.stringify(entries));

    const result = await readTop5(filePath);
    expect(result).toEqual(entries);
  });

  it("[INV-2] 동일한 파일을 가리키는 두 개의 독립 호출은 같은 결과를 반환한다", async () => {
    const entries: RankingEntry[] = [{ nickname: "우아한 그릇", score: 244, registeredAt: 500 }];
    await writeFile(filePath, JSON.stringify(entries));

    const [a, b] = await Promise.all([readTop5(filePath), readTop5(filePath)]);
    expect(a).toEqual(b);
    expect(a).toEqual(entries);
  });

  describe("submitScore", () => {
    it("[S7-1] top5 안에 들면 즉시 반영되어 이후 조회에도 보인다", async () => {
      const existing: RankingEntry[] = [
        { nickname: "매끈한 단지", score: 258, registeredAt: 100 },
        { nickname: "우아한 그릇", score: 244, registeredAt: 200 },
      ];
      await writeFile(filePath, JSON.stringify(existing));

      const entry: RankingEntry = { nickname: "찌그러진 항아리", score: 231, registeredAt: 300 };
      const result = await submitScore(filePath, entry);

      expect(result.madeTop5).toBe(true);
      expect(result.entries).toContainEqual(entry);

      const persisted = JSON.parse(await readFile(filePath, "utf-8"));
      expect(persisted).toContainEqual(entry);
    });

    it("[S7-2] top5에 들지 못하면 랭킹 파일이 변경되지 않는다", async () => {
      const existing: RankingEntry[] = [
        { nickname: "1", score: 100, registeredAt: 1 },
        { nickname: "2", score: 99, registeredAt: 2 },
        { nickname: "3", score: 98, registeredAt: 3 },
        { nickname: "4", score: 97, registeredAt: 4 },
        { nickname: "5", score: 96, registeredAt: 5 },
      ];
      await writeFile(filePath, JSON.stringify(existing));

      const entry: RankingEntry = { nickname: "미달", score: 50, registeredAt: 6 };
      const result = await submitScore(filePath, entry);

      expect(result.madeTop5).toBe(false);
      expect(result.entries).toEqual(existing);

      const persisted = JSON.parse(await readFile(filePath, "utf-8"));
      expect(persisted).toEqual(existing);
    });

    it("[S7-3] 동점이면 먼저 등록된 기록이 더 상위 순위를 유지한다", async () => {
      const existing: RankingEntry[] = [{ nickname: "먼저 등록", score: 200, registeredAt: 100 }];
      await writeFile(filePath, JSON.stringify(existing));

      const entry: RankingEntry = { nickname: "나중 등록", score: 200, registeredAt: 200 };
      const result = await submitScore(filePath, entry);

      expect(result.entries[0]).toEqual(existing[0]);
      expect(result.entries[1]).toEqual(entry);
    });

    it("[INV-2] 동시에 여러 건이 제출되어도 읽기-수정-쓰기 경쟁으로 유실되지 않는다", async () => {
      const submissions: RankingEntry[] = Array.from({ length: 8 }, (_, i) => ({
        nickname: `p${i}`,
        score: i * 10,
        registeredAt: i,
      }));

      await Promise.all(submissions.map((entry) => submitScore(filePath, entry)));

      const finalRanking = await readTop5(filePath);
      const expectedTop5 = submissions
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      expect(finalRanking).toEqual(expectedTop5);
    });
  });
});
