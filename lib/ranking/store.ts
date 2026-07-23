import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { RankingEntry } from "@/types/pottery";

export const DEFAULT_RANKING_PATH = "data/ranking.json";
const MAX_ENTRIES = 5;

// 같은 파일을 대상으로 한 submitScore 호출을 프로세스 내에서 직렬화한다.
// 파일 락 없이 read-modify-write를 하면 동시 요청이 서로의 쓰기를 덮어써 정상 진입한
// 기록이 유실될 수 있다 (같은 Node 프로세스가 처리하는 단일 인스턴스 배포 범위 한정).
const writeQueues = new Map<string, Promise<unknown>>();

function runExclusive<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(key) ?? Promise.resolve();
  const result = previous.then(task, task);
  writeQueues.set(
    key,
    result.catch(() => undefined)
  );
  return result;
}

export async function readTop5(filePath: string = DEFAULT_RANKING_PATH): Promise<RankingEntry[]> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  try {
    return JSON.parse(raw) as RankingEntry[];
  } catch {
    return [];
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
  return runExclusive(filePath, async () => {
    const current = await readTop5(filePath);
    const top5 = sortRanking([...current, entry]).slice(0, MAX_ENTRIES);
    const madeTop5 = top5.includes(entry);

    if (madeTop5) {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify(top5));
    }

    return { entries: top5, madeTop5 };
  });
}
