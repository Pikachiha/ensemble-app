-- 既存テーブルを削除（依存関係の逆順）
drop table if exists schedule_scenes cascade;
drop table if exists attendances cascade;
drop table if exists schedules cascade;
drop table if exists scene_casts cascade;
drop table if exists scene_songs cascade;
drop table if exists scenes cascade;
drop table if exists production_members cascade;
drop table if exists productions cascade;
drop table if exists members cascade;
drop table if exists organizations cascade;

-- organizations（団体）
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- members（団員ロスター：団体レベル）
create table members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz default now()
);

-- productions（演目＝プロジェクト単位）
create table productions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  performance_date date,
  notes text,
  created_at timestamptz default now()
);

-- production_members（演目に参加するメンバー）
create table production_members (
  id uuid primary key default gen_random_uuid(),
  production_id uuid references productions(id) on delete cascade not null,
  member_id uuid references members(id) on delete cascade not null,
  unique(production_id, member_id)
);

-- scenes（シーン：演目に紐づく）
create table scenes (
  id uuid primary key default gen_random_uuid(),
  production_id uuid references productions(id) on delete cascade not null,
  name text not null,
  scene_type text,
  uses_mic boolean default false,
  order_index integer default 0,
  created_at timestamptz default now()
);

-- scene_casts（香盤表：シーン × メンバー）
create table scene_casts (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid references scenes(id) on delete cascade not null,
  member_id uuid references members(id) on delete cascade not null,
  role_name text,
  unique(scene_id, member_id)
);

-- schedules（稽古日：演目に紐づく）
create table schedules (
  id uuid primary key default gen_random_uuid(),
  production_id uuid references productions(id) on delete cascade not null,
  date date not null,
  location text,
  notes text,
  created_at timestamptz default now()
);

-- attendances（出欠）
create table attendances (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references schedules(id) on delete cascade not null,
  member_id uuid references members(id) on delete cascade not null,
  status text check (status in ('present', 'absent', 'unknown')) default 'unknown',
  unique(schedule_id, member_id)
);

-- schedule_scenes（その稽古日に練習するシーン）
create table schedule_scenes (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references schedules(id) on delete cascade not null,
  scene_id uuid references scenes(id) on delete cascade not null,
  unique(schedule_id, scene_id)
);

-- RLS有効化
alter table organizations enable row level security;
alter table members enable row level security;
alter table productions enable row level security;
alter table production_members enable row level security;
alter table scenes enable row level security;
alter table scene_casts enable row level security;
alter table schedules enable row level security;
alter table attendances enable row level security;
alter table schedule_scenes enable row level security;

-- organizations
create policy "owner" on organizations for all using (owner_id = auth.uid());

-- members
create policy "owner" on members for all using (
  organization_id in (select id from organizations where owner_id = auth.uid())
);

-- productions
create policy "owner" on productions for all using (
  organization_id in (select id from organizations where owner_id = auth.uid())
);

-- production_members
create policy "owner" on production_members for all using (
  production_id in (
    select id from productions where organization_id in (
      select id from organizations where owner_id = auth.uid()
    )
  )
);

-- scenes
create policy "owner" on scenes for all using (
  production_id in (
    select id from productions where organization_id in (
      select id from organizations where owner_id = auth.uid()
    )
  )
);

-- scene_casts
create policy "owner" on scene_casts for all using (
  scene_id in (
    select id from scenes where production_id in (
      select id from productions where organization_id in (
        select id from organizations where owner_id = auth.uid()
      )
    )
  )
);

-- schedules
create policy "owner" on schedules for all using (
  production_id in (
    select id from productions where organization_id in (
      select id from organizations where owner_id = auth.uid()
    )
  )
);

-- attendances
create policy "owner" on attendances for all using (
  schedule_id in (
    select id from schedules where production_id in (
      select id from productions where organization_id in (
        select id from organizations where owner_id = auth.uid()
      )
    )
  )
);

-- schedule_scenes
create policy "owner" on schedule_scenes for all using (
  schedule_id in (
    select id from schedules where production_id in (
      select id from productions where organization_id in (
        select id from organizations where owner_id = auth.uid()
      )
    )
  )
);

-- 権限付与
grant all on organizations to authenticated;
grant all on members to authenticated;
grant all on productions to authenticated;
grant all on production_members to authenticated;
grant all on scenes to authenticated;
grant all on scene_casts to authenticated;
grant all on schedules to authenticated;
grant all on attendances to authenticated;
grant all on schedule_scenes to authenticated;
