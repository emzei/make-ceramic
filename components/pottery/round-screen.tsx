"use client";

import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RADIUS_SAMPLES, RESULT_DISPLAY_MS, ROUND_DURATION_MS } from "@/config/pottery";
import { useClayCarving, type CarveInput } from "@/hooks/use-clay-carving";
import type { RadiusProfile } from "@/types/pottery";

const VIEW_WIDTH = 200;
const VIEW_HEIGHT = 340;
const CENTER_X = VIEW_WIDTH / 2;
const TOP_Y = 20;
const BOTTOM_Y = 290;
const DRAW_HEIGHT = BOTTOM_Y - TOP_Y;
const TIMER_TICK_MS = 100;
const CLAY_CLIP_ID = "clay-clip";
const CLAY_GRADIENT_ID = "clay-gradient";

// 물레판(터닝 디스크): 순수 장식 요소. RadiusProfile/채점과 무관하고 포인터 입력을 받지
// 않으며, use-clay-carving.ts의 좌표 변환(TOP_Y/BOTTOM_Y/DRAW_HEIGHT 기반)에는 관여하지 않는다.
const TURNTABLE_CY = BOTTOM_Y + 10;
const TURNTABLE_RX = 85;
const TURNTABLE_RY = 14;
const TURNTABLE_MARKS = [0, 90, 180, 270];

function profileToPath(profile: RadiusProfile): string {
  const step = DRAW_HEIGHT / (profile.length - 1);
  const rightSide = profile.map((r, i) => `${CENTER_X + r},${TOP_Y + i * step}`);
  const leftSide = profile
    .map((r, i) => `${CENTER_X - r},${TOP_Y + i * step}`)
    .reverse();
  return `M${rightSide.join(" L")} L${leftSide.join(" L")} Z`;
}

function pointerEventToCarveInput(clientX: number, clientY: number, rect: DOMRect): CarveInput {
  const svgX = rect.width === 0 ? CENTER_X : ((clientX - rect.left) / rect.width) * VIEW_WIDTH;
  const svgY = rect.height === 0 ? TOP_Y : ((clientY - rect.top) / rect.height) * VIEW_HEIGHT;
  // 실루엣은 뷰박스 전체가 아니라 [TOP_Y, BOTTOM_Y] 구간에만 그려지므로, 그 구간 기준으로
  // 정규화해야 화면에 보이는 반죽 위/아래 끝까지 실제로 깎을 수 있다.
  const heightFraction = Math.min(1, Math.max(0, (svgY - TOP_Y) / DRAW_HEIGHT));
  const distanceFromCenter = Math.abs(svgX - CENTER_X);
  return { heightFraction, distanceFromCenter };
}

function formatTime(msLeft: number): string {
  const totalSeconds = Math.max(0, Math.ceil(msLeft / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatAutoAdvanceCountdown(msLeft: number): string {
  return `${Math.max(0, Math.ceil(msLeft / 1000))}초 뒤 자동 전환`;
}

export interface RoundScreenProps {
  targetProfile: RadiusProfile;
  roundIndex: number;
  totalRounds: number;
  roundScore: number | null;
  completedScores: number[];
  onRoundEnd: (finalProfile: RadiusProfile) => void;
  onSkipToNextRound: () => void;
}

export function RoundScreen({
  targetProfile,
  roundIndex,
  totalRounds,
  roundScore,
  completedScores,
  onRoundEnd,
  onSkipToNextRound,
}: RoundScreenProps) {
  const carving = useClayCarving();
  const svgRef = useRef<SVGSVGElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const autoAdvanceCountdownRef = useRef<HTMLSpanElement>(null);
  const indicatorRef = useRef<SVGLineElement>(null);
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

  // S5-4: 자동으로 다음 화면(다음 라운드 또는, 마지막 라운드라면 최종 결과)으로 넘어가기까지
  // 남은 시간을 초 단위로 보여준다. 마지막 라운드에서도 카운트다운 자체는 표시하되, "다음
  // 라운드" 스킵 버튼만 계속 숨긴다.
  useEffect(() => {
    if (roundScore === null) return;

    let msLeft = RESULT_DISPLAY_MS;
    if (autoAdvanceCountdownRef.current) {
      autoAdvanceCountdownRef.current.textContent = formatAutoAdvanceCountdown(msLeft);
    }

    const interval = setInterval(() => {
      msLeft = Math.max(0, msLeft - 1000);
      if (autoAdvanceCountdownRef.current) {
        autoAdvanceCountdownRef.current.textContent = formatAutoAdvanceCountdown(msLeft);
      }
      if (msLeft <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [roundScore, roundIndex]);

  const carveFromEvent = useCallback((clientX: number, clientY: number): CarveInput | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    return pointerEventToCarveInput(clientX, clientY, svg.getBoundingClientRect());
  }, []);

  // 포인터로 지금 깎고 있는 높이를 시각적으로 알 수 있도록 가로선 인디케이터를 직접 DOM으로
  // 갱신한다 (포인터 이동마다 React state를 갱신하면 불필요한 리렌더가 생기므로 ref로 처리).
  const updateIndicator = useCallback((heightFraction: number | null) => {
    const line = indicatorRef.current;
    if (!line) return;
    if (heightFraction === null) {
      line.style.opacity = "0";
      return;
    }
    const y = TOP_Y + heightFraction * DRAW_HEIGHT;
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.style.opacity = "1";
  }, []);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const input = carveFromEvent(e.clientX, e.clientY);
    if (input) {
      carving.handlePointerDown(input);
      updateIndicator(input.heightFraction);
    }
  };
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const input = carveFromEvent(e.clientX, e.clientY);
    if (input) {
      carving.handlePointerMove(input);
      updateIndicator(input.heightFraction);
    }
  };
  const handlePointerUp = () => {
    carving.handlePointerUp();
    updateIndicator(null);
  };

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
          <defs>
            <clipPath id={CLAY_CLIP_ID}>
              <path d={profileToPath(carving.profile)} />
            </clipPath>
            <linearGradient id={CLAY_GRADIENT_ID} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="var(--border)" />
              <stop offset="45%" stopColor="var(--muted)" />
              <stop offset="55%" stopColor="var(--muted)" />
              <stop offset="100%" stopColor="var(--border)" />
            </linearGradient>
          </defs>

          {/* 물레판: 반죽 아래 순수 장식 요소. 클릭/터치에 반응하지 않고 채점과도 무관하다 */}
          <g data-testid="pottery-wheel" pointerEvents="none">
            <ellipse
              cx={CENTER_X}
              cy={TURNTABLE_CY}
              rx={TURNTABLE_RX}
              ry={TURNTABLE_RY}
              fill="var(--muted)"
              stroke="currentColor"
              strokeWidth={1}
              opacity={0.6}
            />
            <ellipse
              cx={CENTER_X}
              cy={TURNTABLE_CY}
              rx={TURNTABLE_RX * 0.55}
              ry={TURNTABLE_RY * 0.55}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              opacity={0.3}
            />
            <g transform={`translate(${CENTER_X} ${TURNTABLE_CY}) scale(1 ${TURNTABLE_RY / TURNTABLE_RX})`}>
              <g opacity={0.45}>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0"
                  to="360"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
                <line x1={0} y1={0} x2={TURNTABLE_RX * 0.9} y2={0} stroke="currentColor" strokeWidth={2} />
                {TURNTABLE_MARKS.map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  return (
                    <circle
                      key={deg}
                      cx={TURNTABLE_RX * 0.7 * Math.cos(rad)}
                      cy={TURNTABLE_RX * 0.7 * Math.sin(rad)}
                      r={4}
                      fill="currentColor"
                    />
                  );
                })}
              </g>
            </g>
          </g>

          {/* 반죽 실루엣: 좌우 그라데이션으로 곡면 음영을 흉내낸다 */}
          <path
            data-testid="clay-silhouette"
            d={profileToPath(carving.profile)}
            fill={`url(#${CLAY_GRADIENT_ID})`}
            stroke="currentColor"
            strokeWidth={2}
          />

          {/* 위/아래 테두리를 타원으로 그려 원기둥 단면처럼 보이게 한다 */}
          <ellipse
            cx={CENTER_X}
            cy={TOP_Y}
            rx={carving.profile[0]}
            ry={6}
            fill="var(--border)"
            stroke="currentColor"
            strokeWidth={1}
            opacity={0.7}
          />
          <ellipse
            cx={CENTER_X}
            cy={BOTTOM_Y}
            rx={carving.profile[RADIUS_SAMPLES - 1]}
            ry={6}
            fill="var(--border)"
            stroke="currentColor"
            strokeWidth={1}
            opacity={0.7}
          />

          {/* 회전 장식: 실루엣 데이터는 그대로 두고, 표면 하이라이트 띠만 좌->우로 반복 스윕한다 */}
          <g clipPath={`url(#${CLAY_CLIP_ID})`} pointerEvents="none">
            <rect x={-40} y={TOP_Y} width={28} height={DRAW_HEIGHT} fill="white" opacity={0.22}>
              <animateTransform
                attributeName="transform"
                type="translate"
                from="0 0"
                to={`${VIEW_WIDTH + 40} 0`}
                dur="3.2s"
                repeatCount="indefinite"
              />
            </rect>
          </g>

          {/* 목표 실루엣: 반죽 위에 항상 겹쳐서 표시되어야 하므로(INV-3) 반죽보다 나중에,
              대비되는 색으로 그린다 — 그렇지 않으면 반죽의 불투명 채우기에 가려 안 보인다 */}
          <path
            data-testid="target-silhouette"
            d={profileToPath(targetProfile)}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2.5}
            strokeDasharray="6 4"
          />

          {/* 포인터가 지금 닿아 있는 높이 인디케이터 */}
          <line
            ref={indicatorRef}
            data-testid="pointer-indicator"
            x1={0}
            x2={VIEW_WIDTH}
            y1={TOP_Y}
            y2={TOP_Y}
            stroke="var(--destructive)"
            strokeWidth={1}
            strokeDasharray="4 3"
            style={{ opacity: 0 }}
            pointerEvents="none"
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
        {isResult && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onSkipToNextRound}>
              {roundIndex < totalRounds ? "다음 라운드" : "결과 보기"}
            </Button>
            <span
              ref={autoAdvanceCountdownRef}
              data-testid="auto-advance-countdown"
              className="text-xs text-muted-foreground"
            >
              {formatAutoAdvanceCountdown(RESULT_DISPLAY_MS)}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-row gap-2">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
          <div key={round} className="flex flex-col items-center gap-0.5 rounded-md border px-3 py-1">
            <span className="text-[10px] text-muted-foreground">{round}라운드</span>
            <span className="text-sm font-semibold tabular-nums">{completedScores[round - 1] ?? "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
