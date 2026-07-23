# 도자기 물레 깎기 게임 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 반죽/목표 형상 표현 | `RadiusProfile = number[]` (고정 길이 40, 높이별 반지름 샘플) | 물레 성형은 회전 대칭이므로 실루엣을 "높이별 반지름" 1차원 배열로 표현하면 렌더링·깎기·채점이 모두 배열 연산으로 단순화된다 (idea.md의 2D 실루엣 결정을 데이터 모델로 구체화) |
| 렌더링 방식 | SVG (`<path>`로 반지름 배열을 좌우 대칭 폴리라인 변환) | wireframe.html이 이미 SVG path로 화면을 구성했고, Vitest+jsdom+Testing Library로 `path`의 `d` 속성을 직접 단언할 수 있어 canvas 대비 테스트 경계가 낮다 |
| "회전" 표현 | 실루엣 자체는 변하지 않으므로 장식적 애니메이션(예: 표면 텍스처 라인의 회전)만 적용 | 회전 대칭 입체를 옆에서 본 실루엣은 축 회전과 무관하게 동일한 외곽선을 유지한다. 회전은 시각적 사실감을 위한 장식이며 반지름 데이터에 영향을 주지 않는다 — 이 경계를 명시해 두지 않으면 구현 중 불필요한 3D 로직이 들어갈 위험이 있다 |
| 포인터/터치 입력 통합 | Pointer Events API(`pointerdown`/`pointermove`/`pointerup`, `event.pointerType` 무시하고 좌표만 사용) | 마우스와 터치를 하나의 이벤트 모델로 처리하면 INV-1(입력 장치 차별 없음)이 설계 자체로 보장된다. 별도 `touchstart`/`mousedown` 분기가 필요 없다 |
| 깎기 반영 범위 | 포인터 높이에서 가장 가까운 인덱스 ±1 (총 3개 샘플)에 `min(현재 반지름, 포인터의 중심축까지 수평 거리)` 적용, 0 미만 clamp | 정확히 1개 인덱스만 반영하면 드래그 시 실루엣이 계단처럼 끊겨 보인다. 최소한의 이웃 반영으로 자연스러운 곡선을 유지하면서도 로직은 단순하게 유지 |
| 채점 공식 | `score = round(100 * (1 - avgAbsDiff / BASE_CLAY_RADIUS))`, `avgAbsDiff`는 두 반지름 배열의 인덱스별 절대차 평균, 0~100으로 clamp | 목표와의 형태 차이를 반지름 단위로 정규화해 "완전히 깎아 사라진" 극단(S4-3)도 발산 없이 0~100 범위 안에서 자연스럽게 낮은 점수로 수렴한다 |
| 공유 랭킹 저장소 | 서버 전용 로컬 JSON 파일 (`data/ranking.json`, `.gitignore` 추가) + Next.js Route Handler | spec 제외 항목에 따라 매니지드 DB 도입은 배포 임박 시점으로 미룸. localStorage는 브라우저별로 격리되어 INV-2(모든 플레이어가 동일한 top-5를 봄)를 만족할 수 없으므로 반드시 서버 파일이어야 한다 |
| 랭킹 저장소 파일 경로 주입 | `lib/ranking/store.ts`가 파일 경로를 파라미터로 받고 기본값만 실제 경로 | 테스트가 실제 `data/ranking.json`을 건드리지 않고 임시 파일로 격리 검증할 수 있어야 한다 (mock 대신 실제 파일 I/O로 가장 낮은 경계에서 증명) |
| 앱 진입점 | 기존 `app/page.tsx`(현재 placeholder `ComponentExample`)를 이 게임으로 교체 | spec의 "메인 화면"은 앱 최상위 진입점을 의미하고, 현재 프로젝트에 다른 목적의 페이지가 없어 별도 라우트를 새로 만들 이유가 없다 |
| 닉네임 생성 | 마지막 라운드 목표 프리셋의 `noun` 필드 + 최종 총점 구간별 형용사 후보 중 무작위 선택 | "완성된 실루엣 형태를 바탕으로"(S6-2)를 프리셋에 미리 부여한 명사로 반영하고, 점수 구간으로 형용사를 골라 완성도를 대략 표현한다. 매핑 세부는 이후 쉽게 조정 가능한 낮은 비용 결정이라 자체 판단 |

## 인프라 리소스

| 리소스 | 유형 | 선언 위치 | 생성 Task |
|---|---|---|---|
| `data/ranking.json` | 로컬 파일 저장 (임시, 배포 전 교체 대상) | `lib/ranking/store.ts` | Task 4 |
| `.gitignore`에 `data/` 추가 | 저장소 설정 | `.gitignore` | Task 4 |

## 데이터 모델

### RadiusProfile
- `number[]` (길이 고정 `RADIUS_SAMPLES = 40`, 각 값 0 이상 `BASE_CLAY_RADIUS` 이하)

### TargetPreset
- id (string)
- difficultyTier (1 | 2 | 3)
- noun (string, 예: "항아리" — 닉네임 생성에 사용)
- profile → RadiusProfile

### RankingEntry
- nickname (string)
- score (number, 0~300 정수)
- registeredAt (number, epoch ms — 동점 시 선순위 판정용)

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| next-best-practices | Task 2, 3, 4, 5, 6, 7, 8 | 클라이언트/서버 컴포넌트 경계, Route Handler 작성 규칙 |
| vercel-react-best-practices | Task 2, 3 | 포인터 이동·1초 타이머 등 고빈도 갱신에서 불필요한 리렌더 방지 (`rerender-use-ref-transient-values`, `rerender-move-effect-to-event` 등) |
| shadcn (+ `.claude/rules/shadcn-guard.md`) | Task 5, 7, 8 | Button/Card 사용 시 variant/semantic token 우선, `components/ui/*` 직접 수정 금지 |
| web-design-guidelines | Task 8 | 전체 화면 흐름 조립 후 접근성·상호작용 가이드라인 점검 |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `types/pottery.ts` | New → Modify | Task 1, 4 |
| `config/pottery.ts` | New | Task 1 |
| `lib/pottery/scoring.ts` | New | Task 1 |
| `hooks/use-clay-carving.ts` | New | Task 2 |
| `components/pottery/round-screen.tsx` | New → Modify | Task 2, 3 |
| `hooks/use-pottery-game.ts` | New → Modify | Task 3, 6 |
| `lib/ranking/store.ts` | New → Modify | Task 4, 7 |
| `app/api/ranking/route.ts` | New → Modify | Task 4, 7 |
| `.gitignore` | Modify | Task 4 |
| `services/ranking-client.ts` | New → Modify | Task 5, 7 |
| `components/pottery/main-screen.tsx` | New | Task 5 |
| `lib/pottery/nickname.ts` | New | Task 6 |
| `components/pottery/result-screen.tsx` | New | Task 7 |
| `components/pottery/pottery-app.tsx` | New | Task 8 |
| `app/page.tsx` | Modify | Task 8 |
| `app/layout.tsx` | Modify (title 등 leftover 정리) | Task 8 |
| `e2e/pottery.spec.ts` | New | Task 8 |

## Tasks

### [완료] Task 1: 채점 로직 + 목표 실루엣 데이터

- **담당 판정 기준**: INV-4
- **크기**: M (4 파일)
- **의존성**: None
- **참조**:
  - CLAUDE.md Architecture (types → config → lib 순서)
  - 아키텍처 결정 표의 "채점 공식", "반죽/목표 형상 표현"
- **구현 대상**:
  - `types/pottery.ts` (RadiusProfile, TargetPreset 타입)
  - `config/pottery.ts` (RADIUS_SAMPLES, BASE_CLAY_RADIUS=45, ROUND_DURATION_MS=15000, RESULT_DISPLAY_MS=2000, 난이도 3티어 × 목표 프리셋 최소 2개씩)
  - `lib/pottery/scoring.ts` (두 RadiusProfile 비교 → 0~100 정수 점수)
  - `lib/pottery/scoring.test.ts`
- **검증**:
  - `bun run test -- scoring` — 테스트 케이스에 `[INV-4]`를 인용해 "모든 난이도 티어 프리셋의 최대 반지름 ≤ BASE_CLAY_RADIUS"를 단언
  - `bun run typecheck`

---

### [완료] Task 2: 라운드 진행 화면 — 목표+반죽 표시, 포인터/터치 깎기, 시간 종료 시 잠금

- **담당 판정 기준**: S2-1, S2-2, S3-1, S4-1, INV-1, INV-3
- **크기**: M (4 파일)
- **의존성**: Task 1 (RadiusProfile 타입, ROUND_DURATION_MS·BASE_CLAY_RADIUS 상수)
- **참조**:
  - vercel-react-best-practices 키워드: `rerender-use-ref-transient-values` (포인터 이동마다 과도한 리렌더 방지)
  - `artifacts/pottery-game/wireframe.html`의 `#screen-round-active`
  - 아키텍처 결정 표의 "포인터/터치 입력 통합", "깎기 반영 범위"
- **구현 대상**:
  - `hooks/use-clay-carving.ts` (포인터 좌표 → RadiusProfile 갱신, 잠금 플래그)
  - `hooks/use-clay-carving.test.ts`
  - `components/pottery/round-screen.tsx` (목표 실루엣 오버레이 + 반죽 SVG + 15초 카운트다운, 만료 시 `onRoundEnd(finalProfile)` 콜백 1회 호출 후 조작 무시. `roundScore: number | null` prop을 받아 `null`이면 진행 중 화면을, 값이 있으면 wireframe `#screen-round-result`/`#screen-round-overcarved`처럼 흐려진 실루엣 + 점수 배지를 렌더 — 실제 값 주입은 Task 3)
  - `components/pottery/round-screen.test.tsx`
- **검증**:
  - `bun run test -- round-screen|use-clay-carving` — `[S2-1]`, `[S2-2]`, `[S3-1]`, `[S4-1]`, `[INV-1]`, `[INV-3]` 인용. INV-1은 동일 좌표에 `pointerType: 'mouse'`와 `'touch'`로 각각 fireEvent해 동일 결과인지 비교
  - `bun run typecheck`

---

### [완료] Task 3: 라운드 결과 계산 + 자동 다음 라운드 오케스트레이터

- **담당 판정 기준**: S4-2, S4-3, S5-1, S5-2
- **크기**: M (3 파일)
- **의존성**: Task 1 (scoring 함수), Task 2 (RoundScreen의 `onRoundEnd` 계약 및 `roundScore` prop)
- **참조**:
  - `config/pottery.ts`의 `DIFFICULTY_PRESETS`, `RESULT_DISPLAY_MS`
- **구현 대상**:
  - `hooks/use-pottery-game.ts` (라운드 인덱스, 티어별 무작위 목표 선택, `onRoundEnd` 수신 시 scoring 호출 → 점수 저장 → `RESULT_DISPLAY_MS` 후 다음 라운드로 자동 전환. 과도하게 깎여 반지름이 0에 수렴해도 별도 실패 분기 없이 그대로 채점)
  - `hooks/use-pottery-game.test.ts` (fake timers)
  - `components/pottery/round-screen.test.tsx` (Modify: `use-pottery-game`이 계산한 점수를 `roundScore` prop으로 주입한 RoundScreen을 렌더해 점수 배지 텍스트가 실제로 화면에 표시되는지 단언 — S4-2의 "화면에 표시된다"를 컴포넌트 수준에서 증명)
- **검증**:
  - `bun run test -- use-pottery-game|round-screen` — `[S4-2]`, `[S4-3]`, `[S5-1]`, `[S5-2]` 인용
  - `bun run typecheck`

---

### Checkpoint: Task 1~3 이후
- [x] 모든 테스트 통과: `bun run test`
- [x] 빌드 성공: `bun run build`
- [x] 커버리지 검사 통과: `scripts/spec-coverage.sh pottery-game --tests`
- [x] 단일 라운드가 초기화 → 깎기 → 시간 종료(fake timer) → 채점 → 다음 라운드 자동 전환까지 `use-pottery-game` 통합 테스트로 동작 확인

---

### [완료] Task 4: 공유 랭킹 저장소 + 조회 API

- **담당 판정 기준**: INV-2
- **크기**: M (5 파일, `.gitignore` 한 줄 추가 포함)
- **의존성**: Task 1 (`types/pottery.ts`에 RankingEntry 추가)
- **참조**:
  - next-best-practices 키워드: Route Handler 작성 규칙
  - 아키텍처 결정 표의 "공유 랭킹 저장소", "랭킹 저장소 파일 경로 주입"
- **구현 대상**:
  - `types/pottery.ts` (Modify: RankingEntry 타입 추가)
  - `lib/ranking/store.ts` (파일 경로를 인자로 받는 `readTop5(filePath)`; 쓰기는 Task 7에서 추가)
  - `lib/ranking/store.test.ts` (임시 파일 경로로 실제 파일 I/O 검증)
  - `app/api/ranking/route.ts` (`GET` — top5 반환)
  - `.gitignore` (Modify: `data/` 추가)
- **검증**:
  - `bun run test -- ranking` — `[INV-2]` 인용: 동일 파일을 가리키는 두 개의 독립 호출이 같은 결과를 반환함을 단언 (브라우저/탭 독립성 대신 저장소 계층에서 공유성 증명)
  - `bun run typecheck`

---

### [완료] Task 5: 메인 화면 UI

- **담당 판정 기준**: S1-1
- **크기**: M (3 파일)
- **의존성**: Task 4 (`GET /api/ranking`)
- **참조**:
  - shadcn 키워드: Button, Card, semantic token (`.claude/rules/shadcn-guard.md` 준수)
  - `artifacts/pottery-game/wireframe.html`의 `#screen-main`, `#screen-main-empty`
- **구현 대상**:
  - `services/ranking-client.ts` (`getTopRanking()` — `/api/ranking` fetch 래퍼)
  - `components/pottery/main-screen.tsx` ("시작하기" 버튼 + top-5 미리보기, 빈 상태 문구)
  - `components/pottery/main-screen.test.tsx`
- **검증**:
  - `bun run test -- main-screen` — `[S1-1]` 인용: 랭킹 있음/빈 상태 두 케이스 모두 검증 (`services/ranking-client`는 `vi.mock`으로 대체 — 저장소 자체는 Task 4가 이미 낮은 경계에서 증명)
  - `bun run typecheck`

---

### Checkpoint: Task 4~5 이후
- [x] 모든 테스트 통과: `bun run test`
- [x] 빌드 성공: `bun run build`
- [x] 커버리지 검사 통과: `scripts/spec-coverage.sh pottery-game --tests`
- [x] 메인 화면이 `/api/ranking` 실제 응답을 받아 top-5(또는 빈 상태)를 표시함을 확인

---

### [완료] Task 6: 최종 점수 합산 + 자동 닉네임

- **담당 판정 기준**: S6-1, S6-2
- **크기**: S (3 파일)
- **의존성**: Task 3 (라운드별 점수 배열), Task 1 (`DIFFICULTY_PRESETS`의 `noun`)
- **참조**:
  - 아키텍처 결정 표의 "닉네임 생성"
- **구현 대상**:
  - `hooks/use-pottery-game.ts` (Modify: 3라운드 종료 시 `totalScore` 계산 + `lib/pottery/nickname.ts` 호출 결과 노출)
  - `lib/pottery/nickname.ts` (마지막 라운드 프리셋의 `noun` + 총점 구간별 형용사 무작위 조합)
  - `lib/pottery/nickname.test.ts`
- **검증**:
  - `bun run test -- nickname|use-pottery-game` — `[S6-1]`, `[S6-2]` 인용
  - `bun run typecheck`

---

### [완료] Task 7: 랭킹 등록(POST, 동점 처리) + 최종 결과 화면

- **담당 판정 기준**: S7-1, S7-2, S7-3
- **크기**: M (5 파일)
- **의존성**: Task 4 (`lib/ranking/store.ts`, `app/api/ranking/route.ts`), Task 6 (totalScore, 닉네임)
- **참조**:
  - shadcn 키워드: Button, Card
  - `artifacts/pottery-game/wireframe.html`의 `#screen-result-ranked`, `#screen-result-unranked`
- **구현 대상**:
  - `lib/ranking/store.ts` (Modify: `submitScore(filePath, entry)` — top5 여부 판정, 동점 시 먼저 등록된 기록이 상위 유지)
  - `lib/ranking/store.test.ts` (Modify: 동점·미달 케이스 추가)
  - `app/api/ranking/route.ts` (Modify: `POST` 추가)
  - `services/ranking-client.ts` (Modify: `submitScore()` 추가)
  - `components/pottery/result-screen.tsx` (최종 점수 + 닉네임 + top5 표시, wireframe `.w-highlight`처럼 본인 기록이 top5에 있으면 강조 표시, top5 미진입 시 랭킹 리스트에 자기 기록 미표시. "다시 하기" 버튼은 표시만, 클릭 동작은 Task 8)
- **검증**:
  - `bun run test -- ranking-store|result-screen` — `[S7-1]`, `[S7-2]`, `[S7-3]` 인용 (동점 시 등록 순서 보존 케이스 포함)
  - `bun run typecheck`

---

### Checkpoint: Task 6~7 이후
- [x] 모든 테스트 통과: `bun run test`
- [x] 빌드 성공: `bun run build`
- [x] 커버리지 검사 통과: `scripts/spec-coverage.sh pottery-game --tests`
- [x] 최종 점수 합산 → 닉네임 생성 → 랭킹 등록/미등록 분기까지 동작 확인

---

### [완료] Task 8: 전체 화면 흐름 연결 + E2E

- **담당 판정 기준**: S1-2, S8-1
- **크기**: M (5 파일)
- **의존성**: Task 5 (MainScreen), Task 2·3 (RoundScreen + game 오케스트레이터), Task 7 (ResultScreen)
- **참조**:
  - shadcn 키워드: 없음 (조립만)
  - web-design-guidelines
- **구현 대상**:
  - `components/pottery/pottery-app.tsx` (main → round → result 최상위 phase 상태 머신; "시작하기"/"다시 하기" 클릭이 phase를 전환)
  - `components/pottery/pottery-app.test.tsx`
  - `app/page.tsx` (Modify: `ComponentExample` → `PotteryApp`)
  - `app/layout.tsx` (Modify: title/description을 게임에 맞게 정리 — leftover "Kanban Todo" 제거)
  - `e2e/pottery.spec.ts` (spec.md End-to-end 검증 절차 전체를 Playwright로 재현)
- **검증**:
  - `bun run test -- pottery-app` — `[S1-2]`, `[S8-1]` 인용
  - `bun run test:e2e` — spec.md 1~8단계를 그대로 따라가며 `[S1]`~`[S8]`, `[INV-1]`~`[INV-4]` 인용 (랭킹 공유는 두 개의 브라우저 컨텍스트로 확인)
  - `bun run typecheck`

---

### 최종 Checkpoint
- [x] spec.md의 **End-to-end 검증** 절차를 실행하고, 통과한 판정 기준의 체크박스를 spec.md에서 켠다 (체크는 실행 증거로만 켠다)
- [x] `scripts/spec-coverage.sh pottery-game --tests --wireframe` 통과

## 미결정 항목

없음
