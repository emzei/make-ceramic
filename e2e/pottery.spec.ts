import { expect, test, type Page } from "@playwright/test";
import { getSupabaseClient } from "@/lib/supabase/client";
import { DEFAULT_RANKING_TABLE } from "@/lib/ranking/store";

const ROUND_DURATION_MS = 7000;
const RESULT_DISPLAY_MS = 7000;

test.use({ hasTouch: true });
// 두 테스트 모두 서버가 공유하는 ranking_entries 테이블을 직접 읽고 쓰므로, 병렬 실행 시
// 서로의 기록이 뒤섞인다. 같은 테이블을 다루는 테스트끼리는 반드시 순차 실행한다.
test.describe.configure({ mode: "serial" });

async function seedRanking(entries: Array<{ nickname: string; score: number; registeredAt: number }>) {
  const client = getSupabaseClient();
  const { error: deleteError } = await client.from(DEFAULT_RANKING_TABLE).delete().gte("id", 0);
  if (deleteError) throw deleteError;
  if (entries.length === 0) return;

  const { error: insertError } = await client
    .from(DEFAULT_RANKING_TABLE)
    .insert(entries.map((e) => ({ nickname: e.nickname, score: e.score, registered_at: e.registeredAt })));
  if (insertError) throw insertError;
}

async function carveAtRelative(page: Page, xRatio: number, yRatio: number) {
  const canvas = page.getByTestId("clay-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("clay-canvas bounding box not found");
  const x = box.x + box.width * xRatio;
  const y = box.y + box.height * yRatio;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.up();
}

async function touchCarveAtRelative(page: Page, xRatio: number, yRatio: number) {
  const canvas = page.getByTestId("clay-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("clay-canvas bounding box not found");
  const x = box.x + box.width * xRatio;
  const y = box.y + box.height * yRatio;
  await page.touchscreen.tap(x, y);
}

async function finishRound(page: Page) {
  await page.clock.runFor(ROUND_DURATION_MS + 200);
}

async function advanceToNextRound(page: Page) {
  await page.clock.runFor(RESULT_DISPLAY_MS + 100);
}

test("골든 패스: 메인 -> 3라운드 -> 결과 -> 공유 랭킹 -> 다시 하기 (S1~S8, INV-1~INV-3)", async ({
  page,
  browser,
}) => {
  await seedRanking([]);

  await page.goto("/");
  await page.clock.install();

  // S1: 메인 화면 + 빈 랭킹 상태
  await expect(page.getByRole("button", { name: "시작하기" })).toBeVisible();
  await expect(page.getByText("아직 등록된 기록이 없습니다")).toBeVisible();

  // S1-2: 시작하기 -> 1라운드
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByTestId("clay-canvas")).toBeVisible();
  await expect(page.getByText("1 / 3 라운드")).toBeVisible();

  // S2: 목표+반죽 실루엣, 7초 타이머
  await expect(page.getByTestId("target-silhouette")).toBeVisible();
  await expect(page.getByTestId("clay-silhouette")).toBeVisible();
  await expect(page.getByTestId("round-timer")).toHaveText("0:07");

  // S3-1: 마우스로 깎으면 반죽 실루엣이 즉시 바뀐다
  const beforeMouseCarve = await page.getByTestId("clay-silhouette").getAttribute("d");
  await carveAtRelative(page, 0.3, 0.5);
  const afterMouseCarve = await page.getByTestId("clay-silhouette").getAttribute("d");
  expect(afterMouseCarve).not.toEqual(beforeMouseCarve);

  // INV-1: 터치로도 동일하게 깎인다
  const beforeTouchCarve = afterMouseCarve;
  await touchCarveAtRelative(page, 0.7, 0.3);
  const afterTouchCarve = await page.getByTestId("clay-silhouette").getAttribute("d");
  expect(afterTouchCarve).not.toEqual(beforeTouchCarve);

  // INV-3: 목표 실루엣은 깎는 동안에도 그대로 겹쳐 표시된다
  await expect(page.getByTestId("target-silhouette")).toBeVisible();

  // S4: 시간 종료 -> 자동 채점, S5: 자동으로 다음 라운드
  await finishRound(page);
  await expect(page.getByTestId("round-timer")).toHaveText("0:00");
  const round1Score = await page.getByTestId("round-score-badge").textContent();
  expect(Number(round1Score)).toBeGreaterThanOrEqual(0);
  expect(Number(round1Score)).toBeLessThanOrEqual(100);

  await advanceToNextRound(page);
  await expect(page.getByText("2 / 3 라운드")).toBeVisible();

  // S4-3: 과도하게 깎아 거의 사라지게 만들어도 정상 채점된다
  for (let y = 0.05; y < 1; y += 0.1) {
    await carveAtRelative(page, 0.5, y);
  }
  await finishRound(page);
  await expect(page.getByTestId("round-timer")).toHaveText("0:00");

  await advanceToNextRound(page);
  await expect(page.getByText("3 / 3 라운드")).toBeVisible();

  // 3라운드 종료 -> S6: 합산 점수 + 자동 닉네임 (일정 시간 후 전환)
  await finishRound(page);
  await advanceToNextRound(page);
  const totalScoreLocator = page.getByTestId("total-score");
  await expect(totalScoreLocator).toBeVisible();
  const totalScoreText = await totalScoreLocator.textContent();
  const totalScore = Number(totalScoreText);
  expect(totalScore).toBeGreaterThanOrEqual(0);
  expect(totalScore).toBeLessThanOrEqual(300);

  // S7-1: 랭킹이 비어 있었으므로 이번 기록이 top5에 반영되어 강조 표시된다
  const ownRow = page.getByTestId("own-ranking-row");
  await expect(ownRow).toBeVisible();
  const nicknameText = await ownRow.locator("span").nth(1).textContent();
  expect(nicknameText).toBeTruthy();

  // INV-2: 다른 브라우저 컨텍스트에서도 동일한 랭킹이 보인다
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await otherPage.goto("/");
  await expect(otherPage.getByText(nicknameText!.trim())).toBeVisible();
  await otherContext.close();

  // S8-1: 다시 하기 -> 1라운드부터 새 게임
  await page.getByRole("button", { name: "다시 하기" }).click();
  await expect(page.getByText("1 / 3 라운드")).toBeVisible();
  await expect(page.getByTestId("clay-canvas")).toBeVisible();
});

test("S7-2: top5보다 낮은 점수는 공유 랭킹에 반영되지 않는다", async ({ page }) => {
  const now = Date.now();
  await seedRanking([
    { nickname: "만점 항아리 1", score: 300, registeredAt: now - 5000 },
    { nickname: "만점 항아리 2", score: 300, registeredAt: now - 4000 },
    { nickname: "만점 항아리 3", score: 300, registeredAt: now - 3000 },
    { nickname: "만점 항아리 4", score: 300, registeredAt: now - 2000 },
    { nickname: "만점 항아리 5", score: 300, registeredAt: now - 1000 },
  ]);

  await page.goto("/");
  await page.clock.install();

  await page.getByRole("button", { name: "시작하기" }).click();

  for (let round = 0; round < 3; round++) {
    // 반죽을 전체 높이에서 중심축까지 깎아 목표와 크게 어긋나게 만든다 (세팅된 300점과 동점될 가능성을 없앤다)
    for (let y = 0.05; y < 1; y += 0.1) {
      await carveAtRelative(page, 0.5, y);
    }
    await finishRound(page);
    await advanceToNextRound(page);
  }

  await expect(page.getByTestId("ranking-list")).toBeVisible();
  await expect(page.getByTestId("own-ranking-row")).toHaveCount(0);
  await expect(page.getByText("만점 항아리 1")).toBeVisible();
});

test("[S5-3] 3라운드 결과에서 '결과 보기' 버튼을 클릭하면 대기 시간과 무관하게 즉시 최종 결과로 전환된다", async ({
  page,
}) => {
  await seedRanking([]);

  await page.goto("/");
  await page.clock.install();

  await page.getByRole("button", { name: "시작하기" }).click();

  for (let round = 0; round < 2; round++) {
    await finishRound(page);
    await advanceToNextRound(page);
  }
  await expect(page.getByText("3 / 3 라운드")).toBeVisible();

  await finishRound(page);
  await expect(page.getByRole("button", { name: "다음 라운드" })).not.toBeVisible();
  await page.getByRole("button", { name: "결과 보기" }).click();

  await expect(page.getByTestId("total-score")).toBeVisible();
});
