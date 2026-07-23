import { readFileSync } from "fs";
import { defineConfig, devices } from "@playwright/test";

// bun run test:e2e로 실행하면 bun 자신의 프로세스에는 .env.local이 자동 로드되지만,
// playwright test가 그 뒤에 띄우는 worker 프로세스/webServer(다음 next dev)에는 전달되지
// 않는 경우가 있다. lib/ranking/store 테스트(vitest.setup.ts)와 동일하게 여기서도
// 명시적으로 로드해서 seedRanking()과 next dev 양쪽이 확실히 같은 env를 보게 한다.
try {
  const content = readFileSync(".env.local", "utf-8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (!process.env[key.trim()]) process.env[key.trim()] = value.trim();
  }
} catch {
  // .env.local이 없으면 무시 — 필수 env 누락은 lib/supabase/client.ts가 호출 시점에 검증한다.
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
