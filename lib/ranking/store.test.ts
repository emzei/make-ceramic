import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RankingEntry } from "@/types/pottery";
import { readTop5 } from "./store";

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
});
