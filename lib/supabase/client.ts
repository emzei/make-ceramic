import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { WebSocket as NodeWebSocket } from "ws";

let cached: SupabaseClient | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// supabase-js는 우리가 realtime을 전혀 쓰지 않아도 생성 시점에 항상 RealtimeClient를
// 만들며 전역 WebSocket을 요구한다. Node 22 미만에는 전역 WebSocket이 없어 그대로
// createClient()가 즉시 예외를 던지므로, ws 패키지를 폴리필로 채워준다.
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = NodeWebSocket;
}

export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false },
  });
  return cached;
}
