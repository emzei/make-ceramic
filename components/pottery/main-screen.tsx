"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTopRanking } from "@/services/ranking-client";
import type { RankingEntry } from "@/types/pottery";

export interface MainScreenProps {
  onStart: () => void;
}

export function MainScreen({ onStart }: MainScreenProps) {
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTopRanking().then((entries) => {
      if (!cancelled) setRanking(entries);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 md:flex-row md:gap-10">
      <div className="flex flex-col items-center gap-4 md:w-1/2 md:items-start">
        <h1 className="text-2xl font-bold">도자기 물레 깎기</h1>
        <p className="text-sm text-muted-foreground">3라운드 · 라운드당 15초</p>
        <Button size="lg" onClick={onStart}>
          시작하기
        </Button>
      </div>

      <Card className="md:w-1/2">
        <CardHeader>
          <CardTitle>전체 랭킹 TOP 5</CardTitle>
        </CardHeader>
        <CardContent>
          {ranking === null ? null : ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 등록된 기록이 없습니다</p>
          ) : (
            <ol className="flex flex-col gap-2" data-testid="ranking-list">
              {ranking.map((entry, i) => (
                <li
                  key={`${entry.nickname}-${entry.registeredAt}`}
                  className="flex items-center gap-3 border-b py-2 last:border-b-0"
                >
                  <span className="w-6 text-right">{i + 1}</span>
                  <span className="flex-1">{entry.nickname}</span>
                  <span className="font-bold">{entry.score}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
