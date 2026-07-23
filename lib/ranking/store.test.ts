import { beforeEach, describe, expect, it } from "vitest";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RankingEntry } from "@/types/pottery";
import { currentRankingPeriodStart, readTop5, submitScore } from "./store";

// ranking_entries_test 테이블은 이 파일에서만 사용한다 (route.test.ts는 store 모듈을
// 통째로 mock). 다른 테스트 파일이 이 테이블을 함께 쓰기 시작하면 beforeEach의 truncate가
// 서로의 상태를 지울 수 있으니 주의.
const TEST_TABLE = "ranking_entries_test";

// 기존 테스트의 registeredAt fixture(0~수백)가 실제 Date.now() 기준 주간 초기화 필터에
// 걸러지지 않도록, 같은(epoch 초반) 주 안의 고정 시각을 기준 시각으로 사용한다.
const NOW = 100_000;

async function seed(entries: RankingEntry[]) {
  if (entries.length === 0) return;
  const { error } = await getSupabaseClient()
    .from(TEST_TABLE)
    .insert(entries.map((e) => ({ nickname: e.nickname, score: e.score, registered_at: e.registeredAt })));
  if (error) throw error;
}

describe("ranking store", () => {
  beforeEach(async () => {
    const { error } = await getSupabaseClient().from(TEST_TABLE).delete().gte("id", 0);
    if (error) throw error;
  });

  it("랭킹이 비어 있으면 빈 배열을 반환한다", async () => {
    const result = await readTop5(TEST_TABLE, NOW);
    expect(result).toEqual([]);
  });

  it("저장된 top5 목록을 그대로 읽어온다", async () => {
    const entries: RankingEntry[] = [
      { nickname: "찌그러진 항아리", score: 231, registeredAt: 1000 },
      { nickname: "매끈한 단지", score: 200, registeredAt: 900 },
    ];
    await seed(entries);

    const result = await readTop5(TEST_TABLE, NOW);
    expect(result).toEqual(entries);
  });

  it("[INV-2] 동일한 테이블을 가리키는 두 개의 독립 호출은 같은 결과를 반환한다", async () => {
    const entries: RankingEntry[] = [{ nickname: "우아한 그릇", score: 244, registeredAt: 500 }];
    await seed(entries);

    const [a, b] = await Promise.all([readTop5(TEST_TABLE, NOW), readTop5(TEST_TABLE, NOW)]);
    expect(a).toEqual(b);
    expect(a).toEqual(entries);
  });

  describe("submitScore", () => {
    it("[S7-1] top5 안에 들면 즉시 반영되어 이후 조회에도 보인다", async () => {
      const existing: RankingEntry[] = [
        { nickname: "매끈한 단지", score: 258, registeredAt: 100 },
        { nickname: "우아한 그릇", score: 244, registeredAt: 200 },
      ];
      await seed(existing);

      const entry: RankingEntry = { nickname: "찌그러진 항아리", score: 231, registeredAt: 300 };
      const result = await submitScore(TEST_TABLE, entry, NOW);

      expect(result.madeTop5).toBe(true);
      expect(result.entries).toContainEqual(entry);

      const afterRead = await readTop5(TEST_TABLE, NOW);
      expect(afterRead).toContainEqual(entry);
    });

    it("[S7-2] top5에 들지 못하면 조회 결과(top5)에는 나타나지 않는다", async () => {
      const existing: RankingEntry[] = [
        { nickname: "1", score: 100, registeredAt: 1 },
        { nickname: "2", score: 99, registeredAt: 2 },
        { nickname: "3", score: 98, registeredAt: 3 },
        { nickname: "4", score: 97, registeredAt: 4 },
        { nickname: "5", score: 96, registeredAt: 5 },
      ];
      await seed(existing);

      const entry: RankingEntry = { nickname: "미달", score: 50, registeredAt: 6 };
      const result = await submitScore(TEST_TABLE, entry, NOW);

      expect(result.madeTop5).toBe(false);
      expect(result.entries).toEqual(existing);

      const afterRead = await readTop5(TEST_TABLE, NOW);
      expect(afterRead).toEqual(existing);
      expect(afterRead).not.toContainEqual(entry);
    });

    it("[S7-3] 동점이면 먼저 등록된 기록이 더 상위 순위를 유지한다", async () => {
      const existing: RankingEntry[] = [{ nickname: "먼저 등록", score: 200, registeredAt: 100 }];
      await seed(existing);

      const entry: RankingEntry = { nickname: "나중 등록", score: 200, registeredAt: 200 };
      const result = await submitScore(TEST_TABLE, entry, NOW);

      expect(result.entries[0]).toEqual(existing[0]);
      expect(result.entries[1]).toEqual(entry);
    });

    it("이미 존재하는 닉네임이면 뒤에 숫자를 붙여 구분한다", async () => {
      const existing: RankingEntry[] = [{ nickname: "매끈한 항아리", score: 258, registeredAt: 100 }];
      await seed(existing);

      const entry: RankingEntry = { nickname: "매끈한 항아리", score: 231, registeredAt: 300 };
      const result = await submitScore(TEST_TABLE, entry, NOW);

      expect(result.entry.nickname).toBe("매끈한 항아리 2");
      expect(result.entries).toContainEqual({ ...entry, nickname: "매끈한 항아리 2" });
    });

    it("숫자 붙인 이름까지 이미 존재하면 다음 숫자로 넘어간다", async () => {
      const existing: RankingEntry[] = [
        { nickname: "매끈한 항아리", score: 258, registeredAt: 100 },
        { nickname: "매끈한 항아리 2", score: 244, registeredAt: 200 },
      ];
      await seed(existing);

      const entry: RankingEntry = { nickname: "매끈한 항아리", score: 231, registeredAt: 300 };
      const result = await submitScore(TEST_TABLE, entry, NOW);

      expect(result.entry.nickname).toBe("매끈한 항아리 3");
    });

    it("겹치는 닉네임이 없으면 그대로 유지한다", async () => {
      const existing: RankingEntry[] = [{ nickname: "매끈한 항아리", score: 258, registeredAt: 100 }];
      await seed(existing);

      const entry: RankingEntry = { nickname: "우아한 그릇", score: 231, registeredAt: 300 };
      const result = await submitScore(TEST_TABLE, entry, NOW);

      expect(result.entry.nickname).toBe("우아한 그릇");
    });

    it("[INV-2] 동시에 여러 건이 제출되어도 유실되지 않는다", async () => {
      const submissions: RankingEntry[] = Array.from({ length: 8 }, (_, i) => ({
        nickname: `p${i}`,
        score: i * 10,
        registeredAt: i,
      }));

      await Promise.all(submissions.map((entry) => submitScore(TEST_TABLE, entry, NOW)));

      const finalRanking = await readTop5(TEST_TABLE, NOW);
      const expectedTop5 = submissions
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      expect(finalRanking).toEqual(expectedTop5);
    });

    it("이전 주에 등록된 기록만 있으면 이번 주 새 제출은 자리를 다투지 않고 즉시 top5에 든다", async () => {
      // 2026-01-05(월) 00:00 KST 이전 주(이전 월요일 이전)에 가득 채워진 5개 기록
      const lastWeekMonday = Date.UTC(2025, 11, 28, 15, 0, 0); // 2025-12-29(월) 00:00 KST
      const existing: RankingEntry[] = Array.from({ length: 5 }, (_, i) => ({
        nickname: `지난주${i}`,
        score: 300,
        registeredAt: lastWeekMonday + i,
      }));
      await seed(existing);

      const thisWeekWednesday = Date.UTC(2026, 0, 7, 1, 0, 0); // 2026-01-07 10:00 KST
      const entry: RankingEntry = { nickname: "이번주1", score: 1, registeredAt: thisWeekWednesday };
      const result = await submitScore(TEST_TABLE, entry, thisWeekWednesday);

      expect(result.madeTop5).toBe(true);
      expect(result.entries).toEqual([entry]);
    });

    it("이번 주 초기화 이후 조회하면 지난 주 기록은 보이지 않는다", async () => {
      const lastWeekMonday = Date.UTC(2025, 11, 29, 15, 0, 0);
      const existing: RankingEntry[] = [{ nickname: "지난주 우승자", score: 300, registeredAt: lastWeekMonday }];
      await seed(existing);

      const thisWeekWednesday = Date.UTC(2026, 0, 7, 1, 0, 0);
      const result = await readTop5(TEST_TABLE, thisWeekWednesday);

      expect(result).toEqual([]);
    });
  });

  describe("currentRankingPeriodStart", () => {
    it("KST 기준 이번 주 월요일 00:00을 UTC 타임스탬프로 반환한다", () => {
      const wednesdayKst = Date.UTC(2026, 0, 7, 1, 0, 0); // 2026-01-07 10:00 KST
      const expectedMonday = Date.UTC(2026, 0, 4, 15, 0, 0); // 2026-01-05 00:00 KST

      expect(currentRankingPeriodStart(wednesdayKst)).toBe(expectedMonday);
    });

    it("월요일 00:00 KST 정각은 이미 그 주의 시작으로 취급한다", () => {
      const mondayMidnightKst = Date.UTC(2026, 0, 4, 15, 0, 0); // 2026-01-05 00:00 KST

      expect(currentRankingPeriodStart(mondayMidnightKst)).toBe(mondayMidnightKst);
    });

    it("일요일 23:59 KST는 아직 전 주로 취급한다", () => {
      const sundayLateKst = Date.UTC(2026, 0, 11, 14, 59, 0); // 2026-01-11 23:59 KST
      const expectedMonday = Date.UTC(2026, 0, 4, 15, 0, 0); // 여전히 2026-01-05 00:00 KST

      expect(currentRankingPeriodStart(sundayLateKst)).toBe(expectedMonday);
    });
  });
});
