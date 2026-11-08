-- 工商自委资料库系统 · 数据库初始化脚本
-- 用法：Supabase Dashboard → SQL Editor → 新建查询 → 整体粘贴本文件 → Run
-- 可重复执行（所有对象均带 if not exists / drop if exists 保护）

-- ═══════════════════════════════════════════
-- 1. 成员档案表
-- ═══════════════════════════════════════════
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text default '',
  display_name text default '',
  department text default '综合',
  role text not null default 'member' check (role in ('member','admin')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════
-- 2. 文件资料表（学年 / 部门 / 类型 三级归档）
-- ═══════════════════════════════════════════
create table if not exists public.materials (
  id bigint generated always as identity primary key,
  title text not null,
  description text default '',
  academic_year text not null,
  department text not null,
  category text not null,
  visibility text not null default 'internal' check (visibility in ('public','internal')),
  file_path text not null,
  file_name text not null,
  file_size bigint default 0,
  mime_type text default '',
  uploader_id uuid references auth.users(id) on delete set null,
  uploader_email text default '',
  download_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════
-- 3. 通知公告表
-- ═══════════════════════════════════════════
create table if not exists public.notices (
  id bigint generated always as identity primary key,
  title text not null,
  body text not null default '',
  visibility text not null default 'public' check (visibility in ('public','internal')),
  pinned boolean not null default false,
  author_id uuid references auth.users(id) on delete set null,
  author_email text default '',
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════
-- 4. 活动照片表
-- ═══════════════════════════════════════════
create table if not exists public.photos (
  id bigint generated always as identity primary key,
  activity text not null,
  caption text default '',
  event_date date,
  file_path text not null,
  file_name text not null,
  visibility text not null default 'public' check (visibility in ('public','internal')),
  uploader_id uuid references auth.users(id) on delete set null,
  uploader_email text default '',
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════
-- 5. 权限判断函数（security definer 绕过 RLS，防止策略递归）
-- ═══════════════════════════════════════════
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'approved');
$$;

create or replace function public.is_member()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved');
$$;

-- ═══════════════════════════════════════════
-- 6. 注册自动建档：首位注册者自动成为管理员并直接通过
-- ═══════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, email, display_name, role, status)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(coalesce(new.email,'成员'),'@',1)),
    case when first_user then 'admin' else 'member' end,
    case when first_user then 'approved' else 'pending' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════
-- 7. 防止普通成员篡改自己的角色 / 状态
-- ═══════════════════════════════════════════
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ═══════════════════════════════════════════
-- 8. 启用行级安全并授权
-- ═══════════════════════════════════════════
alter table public.profiles enable row level security;
alter table public.materials enable row level security;
alter table public.notices enable row level security;
alter table public.photos enable row level security;

grant select, insert, update, delete on public.materials to anon, authenticated;
grant select, insert, update, delete on public.notices to anon, authenticated;
grant select, insert, update, delete on public.photos to anon, authenticated;
grant select, update on public.profiles to authenticated;

-- ═══════════════════════════════════════════
-- 9. 策略：profiles（本人可读可改资料，管理员可读可改全部）
-- ═══════════════════════════════════════════
drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists profiles_read_admin on public.profiles;
create policy profiles_read_admin on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated using (public.is_admin()) with check (true);

-- ═══════════════════════════════════════════
-- 10. 策略：materials（公开资料任何人可读，内部资料仅成员可见）
-- ═══════════════════════════════════════════
drop policy if exists materials_read on public.materials;
create policy materials_read on public.materials
  for select to anon, authenticated using (
    visibility = 'public' or public.is_member()
  );

drop policy if exists materials_insert on public.materials;
create policy materials_insert on public.materials
  for insert to authenticated with check (
    uploader_id = auth.uid() and public.is_member()
  );

drop policy if exists materials_update on public.materials;
create policy materials_update on public.materials
  for update to authenticated using (uploader_id = auth.uid() or public.is_admin());

drop policy if exists materials_delete on public.materials;
create policy materials_delete on public.materials
  for delete to authenticated using (uploader_id = auth.uid() or public.is_admin());

-- ═══════════════════════════════════════════
-- 11. 策略：notices
-- ═══════════════════════════════════════════
drop policy if exists notices_read on public.notices;
create policy notices_read on public.notices
  for select to anon, authenticated using (visibility = 'public' or public.is_member());

drop policy if exists notices_insert on public.notices;
create policy notices_insert on public.notices
  for insert to authenticated with check (author_id = auth.uid() and public.is_member());

drop policy if exists notices_update on public.notices;
create policy notices_update on public.notices
  for update to authenticated using (author_id = auth.uid() or public.is_admin());

drop policy if exists notices_delete on public.notices;
create policy notices_delete on public.notices
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- ═══════════════════════════════════════════
-- 12. 策略：photos
-- ═══════════════════════════════════════════
drop policy if exists photos_read on public.photos;
create policy photos_read on public.photos
  for select to anon, authenticated using (visibility = 'public' or public.is_member());

drop policy if exists photos_insert on public.photos;
create policy photos_insert on public.photos
  for insert to authenticated with check (uploader_id = auth.uid() and public.is_member());

drop policy if exists photos_update on public.photos;
create policy photos_update on public.photos
  for update to authenticated using (uploader_id = auth.uid() or public.is_admin());

drop policy if exists photos_delete on public.photos;
create policy photos_delete on public.photos
  for delete to authenticated using (uploader_id = auth.uid() or public.is_admin());

-- ═══════════════════════════════════════════
-- 13. 存储桶：公开桶 + 内部桶（私有）
-- ═══════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('gswz-public', 'gswz-public', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('gswz-internal', 'gswz-internal', false)
on conflict (id) do nothing;

drop policy if exists gswz_public_read on storage.objects;
create policy gswz_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'gswz-public');

drop policy if exists gswz_public_insert on storage.objects;
create policy gswz_public_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'gswz-public' and public.is_member()
  );

drop policy if exists gswz_public_delete on storage.objects;
create policy gswz_public_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'gswz-public' and (owner = auth.uid() or public.is_admin())
  );

drop policy if exists gswz_internal_read on storage.objects;
create policy gswz_internal_read on storage.objects
  for select to authenticated using (
    bucket_id = 'gswz-internal' and public.is_member()
  );

drop policy if exists gswz_internal_insert on storage.objects;
create policy gswz_internal_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'gswz-internal' and public.is_member()
  );

drop policy if exists gswz_internal_delete on storage.objects;
create policy gswz_internal_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'gswz-internal' and (owner = auth.uid() or public.is_admin())
  );

-- ═══════════════════════════════════════════
-- 14. 常用索引
-- ═══════════════════════════════════════════
create index if not exists idx_materials_year on public.materials (academic_year);
create index if not exists idx_materials_dept on public.materials (department);
create index if not exists idx_materials_cat on public.materials (category);
create index if not exists idx_materials_vis on public.materials (visibility);
create index if not exists idx_notices_created on public.notices (created_at desc);
create index if not exists idx_photos_created on public.photos (created_at desc);

-- ═══════════════════════════════════════════
-- 15. 管理员移除成员（连同其登录账号一起删除）
--     仅管理员可调用；不能移除自己。
--     该成员上传的资料保留（uploader_id 置空）。
-- ═══════════════════════════════════════════
create or replace function public.admin_remove_member(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '只有管理员可以移除成员';
  end if;
  if target = auth.uid() then
    raise exception '不能移除自己的账号';
  end if;
  delete from auth.users where id = target;
end;
$$;

revoke all on function public.admin_remove_member(uuid) from public;
grant execute on function public.admin_remove_member(uuid) to authenticated;
