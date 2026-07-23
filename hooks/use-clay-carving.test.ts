import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BASE_CLAY_RADIUS } from "@/config/pottery";
import { useClayCarving } from "./use-clay-carving";

describe("useClayCarving", () => {
  it("[S3-1] 포인터 다운 위치의 반지름이 즉시 줄어든다", () => {
    const { result } = renderHook(() => useClayCarving());
    const heightFraction = 0.5;
    const index = Math.round(heightFraction * (result.current.profile.length - 1));

    act(() => {
      result.current.handlePointerDown({ heightFraction, distanceFromCenter: 10 });
    });

    expect(result.current.profile[index]).toBe(10);
    expect(result.current.profile[index]).toBeLessThan(BASE_CLAY_RADIUS);
  });

  it("깎기는 반지름을 줄이기만 하고 늘리지 않는다", () => {
    const { result } = renderHook(() => useClayCarving());

    act(() => {
      result.current.handlePointerDown({ heightFraction: 0.2, distanceFromCenter: 5 });
    });
    act(() => {
      result.current.handlePointerMove({ heightFraction: 0.2, distanceFromCenter: 40 });
    });

    const index = Math.round(0.2 * (result.current.profile.length - 1));
    expect(result.current.profile[index]).toBe(5);
  });

  it("포인터 업 이후 이동은 반영되지 않는다", () => {
    const { result } = renderHook(() => useClayCarving());

    act(() => {
      result.current.handlePointerDown({ heightFraction: 0.3, distanceFromCenter: 20 });
      result.current.handlePointerUp();
    });
    const before = result.current.profile.slice();

    act(() => {
      result.current.handlePointerMove({ heightFraction: 0.3, distanceFromCenter: 1 });
    });

    expect(result.current.profile).toEqual(before);
  });

  it("[S4-1] lock 이후에는 포인터 조작이 반영되지 않는다", () => {
    const { result } = renderHook(() => useClayCarving());

    act(() => {
      result.current.lock();
    });
    const before = result.current.profile.slice();

    act(() => {
      result.current.handlePointerDown({ heightFraction: 0.5, distanceFromCenter: 0 });
    });

    expect(result.current.profile).toEqual(before);
  });
});
