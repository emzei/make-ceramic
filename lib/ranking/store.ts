import { readFile } from "fs/promises";
import type { RankingEntry } from "@/types/pottery";

export const DEFAULT_RANKING_PATH = "data/ranking.json";

export async function readTop5(filePath: string = DEFAULT_RANKING_PATH): Promise<RankingEntry[]> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as RankingEntry[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}
