"use client";

import { useCallback, useRef, useState } from "react";
import { BASE_CLAY_RADIUS, RADIUS_SAMPLES } from "@/config/pottery";
import type { RadiusProfile } from "@/types/pottery";

export interface CarveInput {
  heightFraction: number;
  distanceFromCenter: number;
}

export interface UseClayCarvingResult {
  profile: RadiusProfile;
  handlePointerDown: (input: CarveInput) => void;
  handlePointerMove: (input: CarveInput) => void;
  handlePointerUp: () => void;
  lock: () => void;
}

function carveProfile(profile: RadiusProfile, { heightFraction, distanceFromCenter }: CarveInput): RadiusProfile {
  const centerIndex = Math.round(heightFraction * (RADIUS_SAMPLES - 1));
  const clampedDistance = Math.max(0, Math.min(BASE_CLAY_RADIUS, distanceFromCenter));
  const next = profile.slice();
  let changed = false;
  for (const index of [centerIndex - 1, centerIndex, centerIndex + 1]) {
    if (index < 0 || index >= RADIUS_SAMPLES) continue;
    const carved = Math.min(next[index], clampedDistance);
    if (carved !== next[index]) {
      next[index] = carved;
      changed = true;
    }
  }
  return changed ? next : profile;
}

export function useClayCarving(): UseClayCarvingResult {
  const [profile, setProfile] = useState<RadiusProfile>(() => new Array(RADIUS_SAMPLES).fill(BASE_CLAY_RADIUS));
  const lockedRef = useRef(false);
  const isPointerDownRef = useRef(false);

  const applyCarve = useCallback((input: CarveInput) => {
    if (lockedRef.current) return;
    setProfile((prev) => carveProfile(prev, input));
  }, []);

  const handlePointerDown = useCallback(
    (input: CarveInput) => {
      isPointerDownRef.current = true;
      applyCarve(input);
    },
    [applyCarve]
  );

  const handlePointerMove = useCallback(
    (input: CarveInput) => {
      if (!isPointerDownRef.current) return;
      applyCarve(input);
    },
    [applyCarve]
  );

  const handlePointerUp = useCallback(() => {
    isPointerDownRef.current = false;
  }, []);

  const lock = useCallback(() => {
    lockedRef.current = true;
  }, []);

  return { profile, handlePointerDown, handlePointerMove, handlePointerUp, lock };
}
