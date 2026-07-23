import type { RankingEntry } from "@/types/pottery";

export async function getTopRanking(): Promise<RankingEntry[]> {
  const res = await fetch("/api/ranking");
  if (!res.ok) throw new Error(`랭킹을 불러오지 못했습니다: ${res.status}`);
  return (await res.json()) as RankingEntry[];
}
