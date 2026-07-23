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

---

---
triggers: [waitFor, "vi.useFakeTimers", "Test timed out in 5000ms", "@testing-library/react", hang, timeout]
status: verified
scope: this-repo (vitest 4.x, @testing-library/react 16.x)
date: 2026-07-23
---
## vi.useFakeTimers() 활성화 중에는 @testing-library의 waitFor/findBy*가 통째로 멈춘다

**지시문**: 테스트에 `vi.useFakeTimers()`가 걸려 있는 동안에는 `waitFor`, `findByRole` 등 내부적으로 폴링하는 testing-library API를 쓰지 않는다. 폴링이 실제 `setTimeout`에 의존하는데 그 타이머 자체가 fake라서 절대 다시 실행되지 않고, 결과적으로 vitest의 `testTimeout`(기본 5000ms)까지 그대로 걸려 테스트가 타임아웃난다. 조건이 이미 동기적으로 참이면 `waitFor` 없이 바로 `expect(screen.getBy...)`로 단언하고, mock된 Promise의 `.then()` 콜백처럼 마이크로태스크 한 틱만 흘려보내면 되는 경우에는 `await act(async () => { await Promise.resolve(); })`로 대체한다.
**에피소드**: `pottery-app.test.tsx`에서 `beforeEach`에 `vi.useFakeTimers()`를 걸어둔 채 `await waitFor(() => expect(screen.getByRole("button", { name: "시작하기" })).toBeInTheDocument())`를 호출했더니, 버튼은 이미 첫 렌더에 동기적으로 존재하는데도 두 테스트 모두 정확히 5000ms에서 타임아웃났다. `waitFor`를 제거하고 동기 `expect`로 바꾸자(그리고 `submitScore` mock 결과를 반영해야 하는 자리는 `act(async () => { await Promise.resolve(); })`로) 즉시 통과했다.
**증거**: `components/pottery/pottery-app.test.tsx` "[S1-2]", "[S8-1]" 케이스, waitFor 제거 전후 실행 결과 비교 (제거 전 2/2 타임아웃 실패 → 제거 후 2/2 통과, 1.76s).

---

---
triggers: [playwright, e2e, "fullyParallel", "data/ranking.json", "shared file", race, "toHaveCount"]
status: verified
scope: this-repo (Playwright 1.52.x, 로컬 파일 기반 공유 상태를 다루는 모든 E2E)
date: 2026-07-23
---
## 서버 파일을 공유하는 E2E 테스트는 fullyParallel 기본값 때문에 서로 오염된다

**지시문**: E2E 테스트 여러 개가 같은 서버 프로세스가 관리하는 공유 상태(이 프로젝트에서는 `data/ranking.json` 같은 로컬 파일)를 읽거나 쓴다면, `playwright.config.ts`의 `fullyParallel: true` 기본값 아래서는 서로 다른 워커가 동시에 그 상태를 건드려 레이스가 난다. 이런 테스트들은 `test.describe.configure({ mode: "serial" })`로 묶어 같은 파일을 다루는 테스트끼리 순차 실행되게 한다. 전역 설정을 바꾸지 말고 파일 단위로 국소적으로 처리한다.
**에피소드**: `e2e/pottery.spec.ts`의 "골든 패스"(랭킹을 빈 배열로 초기화 후 자기 점수를 top5에 등록)와 "S7-2"(5개의 만점 더미 기록을 시딩 후 자신은 top5에 못 들어야 함) 테스트가 병렬 워커에서 동시에 같은 `data/ranking.json`을 시딩·기록하면서 서로의 상태를 덮어써, S7-2가 `own-ranking-row`를 0개 기대했는데 1개가 나와 실패했다. `test.describe.configure({ mode: "serial" })`를 파일 상단에 추가해 두 테스트를 순차 실행시키자 3/3 통과했다.
**증거**: `e2e/pottery.spec.ts`, 직렬화 적용 전 1 failed / 2 passed → 적용 후 3 passed (12.1s).

