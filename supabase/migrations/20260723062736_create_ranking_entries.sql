-- Append-only 공유 랭킹 저장소 (S7, INV-2). 모든 제출은 무조건 insert되고,
-- top-5는 항상 읽는 시점에 registered_at/score로 계산된다 (writer 쪽 read-modify-write
-- 없이 동시성 문제를 없애기 위한 설계 — lib/ranking/store.ts 참고).
create table if not exists public.ranking_entries (
  id bigint generated always as identity primary key,
  nickname text not null,
  score integer not null,
  registered_at bigint not null, -- epoch ms, types/pottery.ts의 RankingEntry.registeredAt과 동일 타입
  created_at timestamptz not null default now(),
  constraint ranking_entries_nickname_length check (char_length(nickname) between 1 and 40),
  constraint ranking_entries_score_range check (score between 0 and 300)
);

-- "WHERE registered_at >= periodStart" 범위 스캔을 위한 인덱스
create index if not exists ranking_entries_registered_at_idx
  on public.ranking_entries (registered_at);

alter table public.ranking_entries enable row level security;

-- 로그인 없는 공개 랭킹판이라 select/insert 모두 anon에 허용.
-- update/delete 정책은 의도적으로 만들지 않아 DB 레벨에서 append-only가 강제된다.
create policy "ranking_entries_select_all" on public.ranking_entries
  for select to anon using (true);
create policy "ranking_entries_insert_all" on public.ranking_entries
  for insert to anon with check (true);

-- 단위 테스트 전용 미러 테이블. lib/ranking/store.test.ts에서만 사용하며,
-- 앱 코드는 이 테이블을 참조하지 않는다 (DEFAULT_RANKING_TABLE 참고).
create table if not exists public.ranking_entries_test (like public.ranking_entries including all);

alter table public.ranking_entries_test enable row level security;

create policy "ranking_entries_test_select_all" on public.ranking_entries_test
  for select to anon using (true);
create policy "ranking_entries_test_insert_all" on public.ranking_entries_test
  for insert to anon with check (true);
