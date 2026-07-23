import { DEFAULT_RANKING_PATH, readTop5, submitScore } from "@/lib/ranking/store";
import type { RankingEntry } from "@/types/pottery";

export async function GET() {
  const entries = await readTop5();
  return Response.json(entries);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { nickname: string; score: number };
  const entry: RankingEntry = {
    nickname: body.nickname,
    score: body.score,
    registeredAt: Date.now(),
  };

  const result = await submitScore(DEFAULT_RANKING_PATH, entry);

  return Response.json({
    entries: result.entries,
    madeTop5: result.madeTop5,
    registeredAt: entry.registeredAt,
  });
}
