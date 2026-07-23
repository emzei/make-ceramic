import type { RankingEntry } from "@/types/pottery";

export async function getTopRanking(): Promise<RankingEntry[]> {
  const res = await fetch("/api/ranking");
  if (!res.ok) throw new Error(`랭킹을 불러오지 못했습니다: ${res.status}`);
  return (await res.json()) as RankingEntry[];
}

export interface SubmitScoreResponse {
  entries: RankingEntry[];
  madeTop5: boolean;
  nickname: string;
  registeredAt: number;
}

export async function submitScore(nickname: string, score: number): Promise<SubmitScoreResponse> {
  const res = await fetch("/api/ranking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, score }),
  });
  if (!res.ok) throw new Error(`랭킹 등록에 실패했습니다: ${res.status}`);
  return (await res.json()) as SubmitScoreResponse;
}
