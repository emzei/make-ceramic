"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitScore } from "@/services/ranking-client";
import type { RankingEntry } from "@/types/pottery";

export interface ResultScreenProps {
  totalScore: number;
  nickname: string;
  onPlayAgain: () => void;
}

export function ResultScreen({ totalScore, nickname, onPlayAgain }: ResultScreenProps) {
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);
  const [ownRegisteredAt, setOwnRegisteredAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    submitScore(nickname, totalScore).then((result) => {
      if (!cancelled) {
        setRanking(result.entries);
        setOwnRegisteredAt(result.madeTop5 ? result.registeredAt : null);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 md:flex-row md:gap-10">
      <div className="flex flex-col items-center gap-3 md:w-1/2 md:items-start">
        <span className="text-xs text-muted-foreground">최종 점수</span>
        <span data-testid="total-score" className="text-6xl font-bold">
          {totalScore}
        </span>
        <span className="text-lg font-bold">{nickname}</span>
        <Button size="lg" className="mt-4" onClick={onPlayAgain}>
          다시 하기
        </Button>
      </div>

      {ranking && (
        <Card className="md:w-1/2">
          <CardHeader>
            <CardTitle>전체 랭킹 TOP 5</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2" data-testid="ranking-list">
              {ranking.map((entry, i) => {
                const isOwn = entry.nickname === nickname && entry.registeredAt === ownRegisteredAt;
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
