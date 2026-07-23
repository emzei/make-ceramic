import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { RankingEntry } from "@/types/pottery";

export const DEFAULT_RANKING_PATH = "data/ranking.json";
const MAX_ENTRIES = 5;

export async function readTop5(filePath: string = DEFAULT_RANKING_PATH): Promise<RankingEntry[]> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as RankingEntry[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

function sortRanking(entries: RankingEntry[]): RankingEntry[] {
  return entries
    .slice()
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.registeredAt - b.registeredAt));
}

export interface SubmitScoreResult {
  entries: RankingEntry[];
  madeTop5: boolean;
}

export async function submitScore(filePath: string, entry: RankingEntry): Promise<SubmitScoreResult> {
  const current = await readTop5(filePath);
  const top5 = sortRanking([...current, entry]).slice(0, MAX_ENTRIES);
  const madeTop5 = top5.includes(entry);

  if (madeTop5) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(top5));
  }

  return { entries: top5, madeTop5 };
}
