"use client";

import { useCallback, useEffect, useRef } from "react";
import { ROUND_DURATION_MS } from "@/config/pottery";
import { useClayCarving, type CarveInput } from "@/hooks/use-clay-carving";
import type { RadiusProfile } from "@/types/pottery";

const VIEW_WIDTH = 200;
const VIEW_HEIGHT = 300;
const CENTER_X = VIEW_WIDTH / 2;
const TOP_Y = 20;
const BOTTOM_Y = 290;
const TIMER_TICK_MS = 100;

function profileToPath(profile: RadiusProfile): string {
  const step = (BOTTOM_Y - TOP_Y) / (profile.length - 1);
  const rightSide = profile.map((r, i) => `${CENTER_X + r},${TOP_Y + i * step}`);
  const leftSide = profile
    .map((r, i) => `${CENTER_X - r},${TOP_Y + i * step}`)
    .reverse();
  return `M${rightSide.join(" L")} L${leftSide.join(" L")} Z`;
}

function pointerEventToCarveInput(clientX: number, clientY: number, rect: DOMRect): CarveInput {
  const svgX = rect.width === 0 ? CENTER_X : ((clientX - rect.left) / rect.width) * VIEW_WIDTH;
  const svgY = rect.height === 0 ? 0 : ((clientY - rect.top) / rect.height) * VIEW_HEIGHT;
  const heightFraction = Math.min(1, Math.max(0, svgY / VIEW_HEIGHT));
  const distanceFromCenter = Math.abs(svgX - CENTER_X);
  return { heightFraction, distanceFromCenter };
}

function formatTime(msLeft: number): string {
  const totalSeconds = Math.max(0, Math.ceil(msLeft / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export interface RoundScreenProps {
  targetProfile: RadiusProfile;
  roundIndex: number;
  totalRounds: number;
  roundScore: number | null;
  onRoundEnd: (finalProfile: RadiusProfile) => void;
}

export function RoundScreen({ targetProfile, roundIndex, totalRounds, roundScore, onRoundEnd }: RoundScreenProps) {
  const carving = useClayCarving();
  const svgRef = useRef<SVGSVGElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const hasEndedRef = useRef(false);
  const onRoundEndRef = useRef(onRoundEnd);
  onRoundEndRef.current = onRoundEnd;
  const profileRef = useRef(carving.profile);
  profileRef.current = carving.profile;

  const msLeftRef = useRef(ROUND_DURATION_MS);

  useEffect(() => {
    hasEndedRef.current = false;
    msLeftRef.current = ROUND_DURATION_MS;
    if (timerRef.current) timerRef.current.textContent = formatTime(msLeftRef.current);

    const interval = setInterval(() => {
      msLeftRef.current = Math.max(0, msLeftRef.current - TIMER_TICK_MS);
      if (timerRef.current) timerRef.current.textContent = formatTime(msLeftRef.current);
      if (msLeftRef.current <= 0 && !hasEndedRef.current) {
        hasEndedRef.current = true;
        carving.lock();
        clearInterval(interval);
        onRoundEndRef.current(profileRef.current);
      }
    }, TIMER_TICK_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex]);

  const carveFromEvent = useCallback(
    (clientX: number, clientY: number): CarveInput | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      return pointerEventToCarveInput(clientX, clientY, svg.getBoundingClientRect());
    },
    []
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const input = carveFromEvent(e.clientX, e.clientY);
    if (input) carving.handlePointerDown(input);
  };
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const input = carveFromEvent(e.clientX, e.clientY);
    if (input) carving.handlePointerMove(input);
  };
  const handlePointerUp = () => carving.handlePointerUp();

  const isResult = roundScore !== null;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div
        className="relative flex items-center justify-center rounded-lg border bg-card"
        style={{ height: 320, opacity: isResult ? 0.7 : 1 }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="h-full w-40 touch-none"
          data-testid="clay-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <path
            data-testid="target-silhouette"
            d={profileToPath(targetProfile)}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
          <path
            data-testid="clay-silhouette"
            d={profileToPath(carving.profile)}
            fill="var(--muted)"
            stroke="currentColor"
            strokeWidth={2}
          />
        </svg>
      </div>

      <div className="flex flex-row items-center gap-4">
        <span ref={timerRef} data-testid="round-timer" className="text-3xl font-bold tabular-nums">
          {formatTime(ROUND_DURATION_MS)}
        </span>
        <span className="text-sm text-muted-foreground">
          {roundIndex} / {totalRounds} 라운드
        </span>
        {isResult && (
          <div className="flex flex-col items-center gap-1 rounded-lg border p-4">
            <span className="text-xs text-muted-foreground">라운드 점수</span>
            <span data-testid="round-score-badge" className="text-5xl font-bold">
              {roundScore}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
