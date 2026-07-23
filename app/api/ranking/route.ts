import { MAX_NICKNAME_LENGTH, MAX_TOTAL_SCORE } from "@/config/pottery";
import { DEFAULT_RANKING_TABLE, readTop5, submitScore } from "@/lib/ranking/store";
import type { RankingEntry } from "@/types/pottery";

export async function GET() {
  const entries = await readTop5();
  return Response.json(entries);
}

function parseEntryInput(body: unknown): { nickname: string; score: number } | null {
  if (typeof body !== "object" || body === null) return null;
  const { nickname, score } = body as Record<string, unknown>;
  if (typeof nickname !== "string" || nickname.trim().length === 0) return null;
  if (typeof score !== "number" || !Number.isFinite(score)) return null;

  return {
    nickname: nickname.trim().slice(0, MAX_NICKNAME_LENGTH),
    score: Math.min(MAX_TOTAL_SCORE, Math.max(0, Math.round(score))),
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = parseEntryInput(body);
  if (!parsed) {
    return Response.json({ error: "nickname(string)과 score(number)가 필요합니다" }, { status: 400 });
  }

  const entry: RankingEntry = {
    nickname: parsed.nickname,
    score: parsed.score,
    registeredAt: Date.now(),
  };

  const result = await submitScore(DEFAULT_RANKING_TABLE, entry, entry.registeredAt);

  return Response.json({
    entries: result.entries,
    madeTop5: result.madeTop5,
    nickname: result.entry.nickname,
    registeredAt: result.entry.registeredAt,
  });
}
