"use client";

import { useCallback, useState } from "react";
import { usePotteryGame } from "@/hooks/use-pottery-game";
import { MainScreen } from "./main-screen";
import { ResultScreen } from "./result-screen";
import { RoundScreen } from "./round-screen";

interface GameSessionProps {
  onPlayAgain: () => void;
}

function GameSession({ onPlayAgain }: GameSessionProps) {
  const game = usePotteryGame();

  if (game.totalScore !== null && game.nickname !== null) {
    return <ResultScreen totalScore={game.totalScore} nickname={game.nickname} onPlayAgain={onPlayAgain} />;
  }

  return (
    <RoundScreen
      key={game.roundIndex}
      targetProfile={game.currentTarget.profile}
      roundIndex={game.roundIndex}
      totalRounds={game.totalRounds}
      roundScore={game.roundScore}
      onRoundEnd={game.handleRoundEnd}
    />
  );
}

type Phase = "main" | "game";

export function PotteryApp() {
  const [phase, setPhase] = useState<Phase>("main");
  const [gameKey, setGameKey] = useState(0);

  const handleStart = useCallback(() => {
    setPhase("game");
  }, []);

  const handlePlayAgain = useCallback(() => {
    setGameKey((key) => key + 1);
    setPhase("game");
  }, []);

  if (phase === "main") {
    return <MainScreen onStart={handleStart} />;
  }

  return <GameSession key={gameKey} onPlayAgain={handlePlayAgain} />;
}
