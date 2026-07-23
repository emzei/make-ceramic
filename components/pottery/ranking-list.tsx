import type { RankingEntry } from "@/types/pottery";

export interface RankingListProps {
  entries: RankingEntry[];
  highlightEntry?: { nickname: string; registeredAt: number } | null;
}

export function RankingList({ entries, highlightEntry = null }: RankingListProps) {
  return (
    <ol className="flex flex-col gap-2" data-testid="ranking-list">
      {entries.map((entry, i) => {
        const isOwn =
          highlightEntry !== null &&
          entry.nickname === highlightEntry.nickname &&
          entry.registeredAt === highlightEntry.registeredAt;
        return (
          <li
            key={`${entry.nickname}-${entry.registeredAt}`}
            data-testid={isOwn ? "own-ranking-row" : undefined}
            className={`flex items-center gap-3 rounded-md border-b px-2 py-2 last:border-b-0 ${
              isOwn ? "bg-muted" : ""
            }`}
          >
            <span className="w-6 text-right">{i + 1}</span>
            <span className="flex-1">{entry.nickname}</span>
            <span className="font-bold">{entry.score}</span>
          </li>
        );
      })}
    </ol>
  );
}
