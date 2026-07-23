import "@testing-library/jest-dom/vitest";
import { readFileSync } from "fs";

// bun은 프로세스 시작 시점(.env, .env.local)에만 env 파일을 자동 로드하고, vitest가
// 이후에 설정하는 NODE_ENV=test 기준의 .env.test는 자동으로 읽지 않는다. lib/ranking
// 테스트가 접속할 Supabase 정보를 여기서 명시적으로 로드한다.
try {
  const content = readFileSync(".env.test", "utf-8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (!process.env[key.trim()]) process.env[key.trim()] = value.trim();
  }
} catch {
  // .env.test가 없으면 무시 — 필수 env 누락은 lib/supabase/client.ts가 호출 시점에 검증한다.
}
