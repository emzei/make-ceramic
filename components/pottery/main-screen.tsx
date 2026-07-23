"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTopRanking } from "@/services/ranking-client";
import type { RankingEntry } from "@/types/pottery";
import { RankingList } from "./ranking-list";

export interface MainScreenProps {
  onStart: () => void;
}

export function MainScreen({ onStart }: MainScreenProps) {
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTopRanking()
      .then((entries) => {
        if (!cancelled) setRanking(entries);
      })
      .catch((err) => {
        console.error("랭킹을 불러오지 못했습니다", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 md:flex-row md:gap-10">
      <div className="flex flex-col items-center gap-4 md:w-1/2 md:items-start">
        <h1 className="text-2xl font-bold">도자기 물레 깎기</h1>
        <p className="text-sm text-muted-foreground">3라운드 · 라운드당 7초</p>
        <Button size="lg" onClick={onStart}>
          시작하기
        </Button>
      </div>

      <Card className="md:w-1/2">
        <CardHeader>
          <CardTitle>전체 랭킹 TOP 5</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ranking === null ? null : ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 등록된 기록이 없습니다</p>
          ) : (
            <RankingList entries={ranking} />
          )}
          <p className="text-xs text-muted-foreground">랭킹은 매주 월요일 00:00에 초기화됩니다</p>
        </CardContent>
      </Card>
    </div>
  );
}
