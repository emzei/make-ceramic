---
triggers: [spec-coverage.sh, "테스트 미인용", checkpoint, 중간 체크포인트]
status: verified
scope: this-repo (execute-plan 체크포인트 규율 전반)
date: 2026-07-23
---
## 중간 체크포인트의 spec-coverage --tests는 미구현 Task의 ID만큼 항상 실패한다

**지시문**: plan.md의 중간 체크포인트(마지막 Checkpoint 이전)에서 `scripts/spec-coverage.sh <feature> --tests`를 돌릴 때, "테스트 미인용"으로 나온 ID가 아직 실행하지 않은 later Task들이 담당하기로 배정된 ID와 정확히 일치하면 이는 실패가 아니라 예상된 진행 상태다. 체크포인트를 막지 말고 그대로 다음 Task로 진행한다. 오직 plan.md의 **최종 Checkpoint**에서만 전체 통과를 요구한다.
**에피소드**: Task 1~3 체크포인트에서 이 스크립트가 INV-2, S1, S1-1, S1-2, S6, S6-1, S6-2, S7, S7-1~3, S8, S8-1을 미인용으로 보고했다. 이 ID들은 plan.md상 Task 4~8이 담당하도록 배정되어 있어 아직 코드가 없다 — 스크립트는 spec.md의 전체 ID 집합을 대상으로 검사하므로 feature 전체가 끝나기 전까지는 중간 체크포인트에서 구조적으로 통과할 수 없다. plan.md는 이 스크립트를 모든 체크포인트에 동일하게 나열해 두어서, 실행 전에는 "중간에도 항상 통과해야 하는 게이트"처럼 보일 수 있다.
**증거**: Task 1~3 완료 시점 커버리지 출력 (commit 1749219 직후), 남은 미인용 ID가 Task 4~8 배정 ID와 정확히 일치.

---

---
triggers: [vi.useFakeTimers, act, renderHook, useEffect, setTimeout, "batching", "advanceTimersByTime"]
status: verified
scope: this-repo (vitest 4.x, @testing-library/react 16.x, React 19)
date: 2026-07-23
---
## act() 안에서 상태 변경 함수 호출과 advanceTimersByTime을 같이 실행하면 effect가 늦게 예약된다

**지시문**: `renderHook`으로 만든 훅이 "상태 변경 → useEffect가 그 상태를 보고 setTimeout 예약" 패턴일 때, 테스트에서 상태를 바꾸는 호출(`result.current.someSetter(...)`)과 `vi.advanceTimersByTime(...)`을 **반드시 서로 다른 `act()` 블록**으로 분리한다. 같은 `act()` 안에 두면 상태 변경이 아직 커밋·리렌더되지 않아 effect가 새 setTimeout을 예약하기 전에 시간이 먼저 흘러버리고, 이후 예약된 timeout은 "이미 흐른 만큼 더 미래"에 걸려 한 사이클 밀린다.
**에피소드**: `use-pottery-game.test.ts`의 "마지막 라운드 종료 후 자동 전환 없음" 테스트에서 `handleRoundEnd`와 `advanceTimersByTime(RESULT_DISPLAY_MS)`를 하나의 `act()`에 넣었더니 라운드가 2번만 전환되고 3라운드에 도달하지 못했다(`completedScores`도 중복 계산됨). 두 호출을 별도 `act()`로 나누자 정상화됐다.
**증거**: 커밋 1749219, `hooks/use-pottery-game.test.ts` "마지막 라운드 종료 후에는 자동 전환이 일어나지 않는다" 통과.

