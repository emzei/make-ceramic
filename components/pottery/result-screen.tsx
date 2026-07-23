"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitScore, type SubmitScoreResponse } from "@/services/ranking-client";
import type { RankingEntry } from "@/types/pottery";
import { RankingList } from "./ranking-list";

export interface ResultScreenProps {
  totalScore: number;
  nickname: string;
  onPlayAgain: () => void;
}

export function ResultScreen({ totalScore, nickname, onPlayAgain }: ResultScreenProps) {
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);
  const [ownRegisteredAt, setOwnRegisteredAt] = useState<number | null>(null);
  // 서버가 랭킹 내 닉네임 중복을 피하려고 뒤에 숫자를 붙였을 수 있으므로(예: "매끈한 항아리 2"),
  // 응답으로 돌아온 실제 등록 닉네임을 본인 강조 매칭과 화면 표시에 사용한다.
  const [registeredNickname, setRegisteredNickname] = useState(nickname);
  // Strict Mode에서 effect가 mount -> cleanup -> remount로 두 번 실행돼도 실제 네트워크
  // 요청은 한 번만 나가도록, in-flight Promise 자체를 캐싱해 재사용한다 (불리언 플래그로
  // 막으면 살아남는 두 번째 effect가 자신만의 완료 핸들러를 붙이지 못해 상태가 영영 null로 남는다).
  const submissionRef = useRef<Promise<SubmitScoreResponse> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!submissionRef.current) {
      submissionRef.current = submitScore(nickname, totalScore);
    }

    submissionRef.current
      .then((result) => {
        if (!cancelled) {
          setRanking(result.entries);
          setOwnRegisteredAt(result.madeTop5 ? result.registeredAt : null);
          if (result.madeTop5) setRegisteredNickname(result.nickname);
        }
      })
      .catch((err) => {
        if (!cancelled) console.error("랭킹 등록에 실패했습니다", err);
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
        <span className="text-lg font-bold">{registeredNickname}</span>
        <Button size="lg" className="mt-4" onClick={onPlayAgain}>
          다시 하기
        </Button>
      </div>

      {ranking && (
        <Card className="md:w-1/2">
          <CardHeader>
            <CardTitle>전체 랭킹 TOP 5</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <RankingList
              entries={ranking}
              highlightEntry={
                ownRegisteredAt !== null ? { nickname: registeredNickname, registeredAt: ownRegisteredAt } : null
              }
            />
            <p className="text-xs text-muted-foreground">랭킹은 매주 월요일 00:00에 초기화됩니다</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
