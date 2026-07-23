import { getSupabaseClient } from "@/lib/supabase/client";
import type { RankingEntry } from "@/types/pottery";

export const DEFAULT_RANKING_TABLE = "ranking_entries";
const MAX_ENTRIES = 5;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 랭킹은 매주 월요일 00:00(KST, UTC+9)에 초기화된다. 서버가 어떤 타임존에서 돌든 항상
// 한국 표준시 기준으로 판정하기 위해, epoch ms에 KST 오프셋을 더한 뒤 UTC 필드로
// KST 달력 값(연/월/일/요일)을 읽어내는 방식(day shifting)을 쓴다.
export function currentRankingPeriodStart(now: number): number {
  const shifted = new Date(now + KST_OFFSET_MS);
  const daysSinceMonday = (shifted.getUTCDay() + 6) % 7;
  const shiftedMidnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return shiftedMidnight - daysSinceMonday * DAY_MS - KST_OFFSET_MS;
}

interface RankingRow {
  nickname: string;
  score: number;
  registered_at: number;
}

function toEntry(row: RankingRow): RankingEntry {
  return { nickname: row.nickname, score: row.score, registeredAt: row.registered_at };
}

export async function readTop5(
  table: string = DEFAULT_RANKING_TABLE,
  now: number = Date.now()
): Promise<RankingEntry[]> {
  const periodStart = currentRankingPeriodStart(now);
  const { data, error } = await getSupabaseClient()
    .from(table)
    .select("nickname, score, registered_at")
    .gte("registered_at", periodStart)
    .order("score", { ascending: false })
    .order("registered_at", { ascending: true })
    .limit(MAX_ENTRIES);

  if (error) throw error;
  return ((data as RankingRow[] | null) ?? []).map(toEntry);
}

// 랭킹에 이미 같은 닉네임이 있으면 "이름 2", "이름 3"... 처럼 뒤에 숫자를 붙여
// 구분 가능한 이름으로 만든다. 닉네임은 형용사+명사 조합을 무작위로 골라 생성되므로
// 같은 조합이 우연히 겹칠 수 있다.
function dedupeNickname(nickname: string, existing: ReadonlySet<string>): string {
  if (!existing.has(nickname)) return nickname;

  let suffix = 2;
  let candidate = `${nickname} ${suffix}`;
  while (existing.has(candidate)) {
    suffix += 1;
    candidate = `${nickname} ${suffix}`;
  }
  return candidate;
}

export interface SubmitScoreResult {
  entries: RankingEntry[];
  madeTop5: boolean;
  entry: RankingEntry;
}

export async function submitScore(
  table: string,
  entry: RankingEntry,
  now: number = Date.now()
): Promise<SubmitScoreResult> {
  const current = await readTop5(table, now);
  const existingNicknames = new Set(current.map((e) => e.nickname));
  const resolvedEntry: RankingEntry = {
    ...entry,
    nickname: dedupeNickname(entry.nickname, existingNicknames),
  };

  // top5는 항상 조회 시점에 registered_at/score로 계산되므로(readTop5), 여기서는
  // 조건 없이 insert한다 — 과거 파일 기반 구현의 read-modify-write 및 그걸 보호하던
  // in-process mutex가 통째로 필요 없어진다. (동시에 같은 닉네임이 제출되면 두 요청 모두
  // "충돌 없음"으로 보고 같은 접미사를 붙일 수 있는 레이스가 이론상 남지만, 기존 mutex도
  // 여러 서버 인스턴스 간에는 이를 막지 못했으므로 이번 변경으로 새로 생기는 문제는 아니다.)
  const { error } = await getSupabaseClient()
    .from(table)
    .insert({
      nickname: resolvedEntry.nickname,
      score: resolvedEntry.score,
      registered_at: resolvedEntry.registeredAt,
    });
  if (error) throw error;

  const entries = await readTop5(table, now);
  const madeTop5 = entries.some(
    (e) => e.nickname === resolvedEntry.nickname && e.registeredAt === resolvedEntry.registeredAt
  );

  return { entries, madeTop5, entry: resolvedEntry };
}
