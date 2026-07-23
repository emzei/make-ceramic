"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DIFFICULTY_PRESETS, RESULT_DISPLAY_MS, TOTAL_ROUNDS } from "@/config/pottery";
import { generateNickname } from "@/lib/pottery/nickname";
import { computeScore } from "@/lib/pottery/scoring";
import type { DifficultyTier, RadiusProfile, TargetPreset } from "@/types/pottery";

function pickRandomPreset(tier: DifficultyTier): TargetPreset {
  const candidates = DIFFICULTY_PRESETS[tier];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export interface UsePotteryGameResult {
  roundIndex: number;
  totalRounds: number;
  currentTarget: TargetPreset;
  roundScore: number | null;
  completedScores: number[];
  totalScore: number | null;
  nickname: string | null;
  handleRoundEnd: (finalProfile: RadiusProfile) => void;
  skipToNextRound: () => void;
}

export function usePotteryGame(): UsePotteryGameResult {
  const [roundIndex, setRoundIndex] = useState(1);
  const [currentTarget, setCurrentTarget] = useState<TargetPreset>(() => pickRandomPreset(1));
  const [roundScore, setRoundScore] = useState<number | null>(null);
  const [completedScores, setCompletedScores] = useState<number[]>([]);
  const [isFinalRoundResolved, setIsFinalRoundResolved] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);
  const currentTargetRef = useRef(currentTarget);
  currentTargetRef.current = currentTarget;
  // S5-3: "다음 라운드" 버튼이 대기 시간과 무관하게 같은 전환을 즉시 실행할 수 있도록,
  // 예약된 setTimeout과 동일한 전환 로직을 ref에 담아 둔다. 조건이 안 맞을 때는 no-op으로
  // 되돌려서 라운드가 바뀐 뒤 stale closure가 잘못 호출되는 일이 없게 한다.
  const advanceRef = useRef<() => void>(() => {});

  const handleRoundEnd = useCallback((finalProfile: RadiusProfile) => {
    const score = computeScore(finalProfile, currentTargetRef.current.profile);
    setRoundScore(score);
    setCompletedScores((prev) => [...prev, score]);
  }, []);

  const isGameOver = roundIndex >= TOTAL_ROUNDS && roundScore !== null && isFinalRoundResolved;
  const totalScore = isGameOver ? completedScores.reduce((sum, s) => sum + s, 0) : null;

  useEffect(() => {
    if (roundScore === null) {
      advanceRef.current = () => {};
      return;
    }

    if (roundIndex >= TOTAL_ROUNDS) {
      const resolve = () => setIsFinalRoundResolved(true);
      advanceRef.current = resolve;
      const timeout = setTimeout(resolve, RESULT_DISPLAY_MS);
      return () => clearTimeout(timeout);
    }

    const advance = () => {
      const nextRoundIndex = roundIndex + 1;
      setRoundIndex(nextRoundIndex);
      setCurrentTarget(pickRandomPreset(nextRoundIndex as DifficultyTier));
      setRoundScore(null);
    };
    advanceRef.current = advance;

    const timeout = setTimeout(advance, RESULT_DISPLAY_MS);
    return () => clearTimeout(timeout);
  }, [roundScore, roundIndex]);

  const skipToNextRound = useCallback(() => {
    advanceRef.current();
  }, []);

  useEffect(() => {
    if (totalScore === null || nickname !== null) return;
    setNickname(generateNickname(totalScore, currentTargetRef.current.noun));
  }, [totalScore, nickname]);

  return {
    roundIndex,
    totalRounds: TOTAL_ROUNDS,
    currentTarget,
    roundScore,
    completedScores,
    totalScore,
    nickname,
    handleRoundEnd,
    skipToNextRound,
  };
}
