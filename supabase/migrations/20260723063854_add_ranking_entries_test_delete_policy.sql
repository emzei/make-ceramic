-- lib/ranking/store.test.ts는 beforeEach에서 ranking_entries_test를 anon 키로 truncate한다.
-- 원래 마이그레이션은 append-only 설계를 의도적으로 반영해 select/insert 정책만 두었는데,
-- 그 결과 anon 역할에 delete 권한이 아예 없어 RLS가 delete를 조용히 0건으로 처리했고
-- (에러 없이 실패), 테스트 간 데이터가 계속 누적되는 문제가 있었다. 테스트 전용
-- ranking_entries_test에 한해서만 delete를 허용한다 (운영 테이블 ranking_entries는 그대로
-- append-only 유지).
create policy "ranking_entries_test_delete_all" on public.ranking_entries_test
  for delete to anon using (true);
