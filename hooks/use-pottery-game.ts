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
}

export function usePotteryGame(): UsePotteryGameResult {
  const [roundIndex, setRoundIndex] = useState(1);
  const [currentTarget, setCurrentTarget] = useState<TargetPreset>(() => pickRandomPreset(1));
  const [roundScore, setRoundScore] = useState<number | null>(null);
  const [completedScores, setCompletedScores] = useState<number[]>([]);
  const [nickname, setNickname] = useState<string | null>(null);
  const currentTargetRef = useRef(currentTarget);
  currentTargetRef.current = currentTarget;

  const handleRoundEnd = useCallback((finalProfile: RadiusProfile) => {
    const score = computeScore(finalProfile, currentTargetRef.current.profile);
    setRoundScore(score);
    setCompletedScores((prev) => [...prev, score]);
  }, []);

  const isGameOver = roundIndex >= TOTAL_ROUNDS && roundScore !== null;
  const totalScore = isGameOver ? completedScores.reduce((sum, s) => sum + s, 0) : null;

  useEffect(() => {
    if (roundScore === null || roundIndex >= TOTAL_ROUNDS) return;

    const timeout = setTimeout(() => {
      const nextRoundIndex = roundIndex + 1;
      setRoundIndex(nextRoundIndex);
      setCurrentTarget(pickRandomPreset(nextRoundIndex as DifficultyTier));
      setRoundScore(null);
    }, RESULT_DISPLAY_MS);

    return () => clearTimeout(timeout);
  }, [roundScore, roundIndex]);

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
  };
}
