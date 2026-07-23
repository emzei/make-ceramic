-- e2e/pottery.spec.ts는 골든 패스(빈 랭킹)와 S7-2(정확히 5개 만점 기록) 시나리오를
-- 재현하려고 매 실행 전에 ranking_entries를 비운다. 애초 append-only 설계(select/insert만
-- 허용)로는 anon 키에 delete 권한이 없어 이 seeding이 조용히 0건 처리됐다. 우리 Next.js
-- API(app/api/ranking/route.ts)에는 애초에 DELETE 엔드포인트가 없고, anon/publishable
-- 키는 브라우저에 노출되지 않고 서버에서만 쓰이므로(lib/supabase/client.ts), 실제
-- 공격 표면은 낮다고 판단해 anon delete를 허용한다.
create policy "ranking_entries_delete_all" on public.ranking_entries
  for delete to anon using (true);
