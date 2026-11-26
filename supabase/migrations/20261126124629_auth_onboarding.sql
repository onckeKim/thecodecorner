-- =============================================================================
-- The Code Corner — Phase 2: authentication & learner onboarding
--
-- profiles            + first_name, last_name, onboarding_completed(_at)
-- learning_goals, experience_levels, weekly_learning_targets, tools
--                     Reference data for onboarding answers. Rows (not code) define
--                     the options, so new goals/tools can be added without schema changes.
-- learner_preferences One row per learner with their onboarding answers. Saved step by
--                     step, so onboarding can be resumed later.
-- learner_tools       Tools the learner has used (many-to-many).
-- ensure_profile()    Idempotently creates a missing profile/role/streak for the caller.
-- complete_onboarding() Validates the answers, marks onboarding complete and enrols the
--                     learner in the default path (Data Analyst) exactly once.
--
-- Roles stay in public.user_roles (Phase 1); they are never stored on profiles, so no
-- profile update can change a role.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Profile fields
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column first_name text check (first_name is null or char_length(first_name) between 1 and 60),
  add column last_name  text check (last_name is null or char_length(last_name) between 1 and 60),
  add column onboarding_completed    boolean not null default false,
  add column onboarding_completed_at timestamptz,
  add constraint profiles_onboarding_completed_at_check
    check (not onboarding_completed or onboarding_completed_at is not null);

-- Learners may edit their names; onboarding status changes only via complete_onboarding().
grant update (first_name, last_name) on public.profiles to authenticated;

-- New users: copy first/last name from sign-up metadata. Display name defaults to
-- "First Last". Idempotent (on conflict do nothing) so repeated calls never duplicate.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first text := left(nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''), 60);
  v_last  text := left(nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''), 60);
  v_name  text;
begin
  v_name := left(coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(concat_ws(' ', v_first, v_last)), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  ), 80);

  insert into public.profiles (id, email, first_name, last_name, display_name)
  values (new.id, new.email, v_first, v_last, coalesce(v_name, ''))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role_id) values (new.id, 'learner') on conflict do nothing;
  insert into public.user_streaks (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

-- Safety net used after sign-in / email confirmation: (re)creates the caller's profile,
-- learner role and streak row if any are missing. Never duplicates, never grants admin.
create or replace function public.ensure_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.profiles.id%type := auth.uid();
  u      record;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select id, email, raw_user_meta_data into u from auth.users where id = v_user;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  insert into public.profiles (id, email, first_name, last_name, display_name)
  values (
    u.id, u.email,
    left(nullif(trim(u.raw_user_meta_data ->> 'first_name'), ''), 60),
    left(nullif(trim(u.raw_user_meta_data ->> 'last_name'), ''), 60),
    left(coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(concat_ws(' ', u.raw_user_meta_data ->> 'first_name', u.raw_user_meta_data ->> 'last_name')), ''),
      split_part(coalesce(u.email, ''), '@', 1)), 80)
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role_id) values (u.id, 'learner') on conflict do nothing;
  insert into public.user_streaks (user_id) values (u.id) on conflict do nothing;
end;
$$;

-- -----------------------------------------------------------------------------
-- Onboarding reference data
-- -----------------------------------------------------------------------------
create table public.learning_goals (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label       text not null,
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.experience_levels (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label       text not null,
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.weekly_learning_targets (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label       text not null,
  min_hours   integer not null check (min_hours >= 0),
  max_hours   integer check (max_hours is null or max_hours >= min_hours),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.tools (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label       text not null,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into public.learning_goals (id, label, sort_order) values
  ('start-career',          'Start a career in Data Analytics',       1),
  ('improve-skills',        'Improve my current Data Analytics skills', 2),
  ('learn-sql',             'Learn SQL',                              3),
  ('learn-power-bi',        'Learn Power BI',                         4),
  ('improve-excel',         'Improve my Excel skills',                5),
  ('build-portfolio',       'Build projects for my portfolio',        6),
  ('career-opportunities',  'Prepare for future career opportunities', 7),
  ('personal-development',  'Learn for personal development',         8);

insert into public.experience_levels (id, label, description, sort_order) values
  ('new',          'I''m completely new', 'I have little or no experience with Data Analytics.', 1),
  ('beginner',     'Beginner',            'I understand some basic concepts but still need structured guidance.', 2),
  ('intermediate', 'Intermediate',        'I''ve worked with tools such as Excel, SQL or Power BI and want to strengthen my skills.', 3),
  ('experienced',  'Experienced',         'I already work with data and want to fill gaps or practise specific skills.', 4);

insert into public.weekly_learning_targets (id, label, min_hours, max_hours, sort_order) values
  ('1-2-hours', '1–2 hours', 1, 2,    1),
  ('3-5-hours', '3–5 hours', 3, 5,    2),
  ('6-8-hours', '6–8 hours', 6, 8,    3),
  ('9-hours',   '9+ hours',  9, null, 4);

insert into public.tools (id, label, sort_order) values
  ('excel',         'Excel',         1),
  ('sql',           'SQL',           2),
  ('power-bi',      'Power BI',      3),
  ('python',        'Python',        4),
  ('tableau',       'Tableau',       5),
  ('google-sheets', 'Google Sheets', 6);

-- Path every learner is enrolled in when onboarding completes (configurable).
insert into public.platform_settings (key, value, description) values
  ('default_learning_path', '"data-analyst"'::jsonb,
   'Slug of the learning path new learners are enrolled in when they complete onboarding.')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Learner answers
-- -----------------------------------------------------------------------------
create table public.learner_preferences (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  learning_goal_id    text references public.learning_goals (id) on update cascade,
  experience_level_id text references public.experience_levels (id) on update cascade,
  weekly_target_id    text references public.weekly_learning_targets (id) on update cascade,
  -- Set when the tools question is answered, so "none of these" (no rows in
  -- learner_tools) can be told apart from "not answered yet".
  tools_answered_at   timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index learner_preferences_goal_idx on public.learner_preferences (learning_goal_id);
create index learner_preferences_level_idx on public.learner_preferences (experience_level_id);
create index learner_preferences_weekly_idx on public.learner_preferences (weekly_target_id);

create table public.learner_tools (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  tool_id    text not null references public.tools (id) on update cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tool_id)
);
create index learner_tools_tool_idx on public.learner_tools (tool_id);

do $$
declare t text;
begin
  foreach t in array array['learning_goals', 'experience_levels', 'weekly_learning_targets', 'tools', 'learner_preferences'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Complete onboarding: validate answers, mark complete, enrol in the default path
-- -----------------------------------------------------------------------------
create or replace function public.complete_onboarding()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_prefs     public.learner_preferences;
  v_path_slug text;
  v_path_id   uuid;
  v_enrolment uuid;
  v_created   boolean := false;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  perform public.ensure_profile();

  select * into v_prefs from public.learner_preferences where user_id = v_user;
  if not found
     or v_prefs.learning_goal_id is null
     or v_prefs.experience_level_id is null
     or v_prefs.tools_answered_at is null
     or v_prefs.weekly_target_id is null then
    raise exception 'Please answer every onboarding question first' using errcode = '23514';
  end if;

  update public.profiles
     set onboarding_completed = true,
         onboarding_completed_at = coalesce(onboarding_completed_at, now())
   where id = v_user;

  select value #>> '{}' into v_path_slug from public.platform_settings where key = 'default_learning_path';
  select id into v_path_id from public.learning_paths where slug = v_path_slug and status = 'published';

  if v_path_id is not null then
    insert into public.enrolments (user_id, path_id, status)
    values (v_user, v_path_id, 'active')
    on conflict (user_id, path_id) do nothing
    returning id into v_enrolment;
    v_created := v_enrolment is not null;
    if v_enrolment is null then
      select id into v_enrolment from public.enrolments where user_id = v_user and path_id = v_path_id;
    end if;
  end if;

  return jsonb_build_object(
    'enrolment_id', v_enrolment,
    'enrolment_created', v_created,
    'path_slug', case when v_path_id is null then null else v_path_slug end
  );
end;
$$;

revoke execute on function public.ensure_profile(), public.complete_onboarding() from public, anon;
grant execute on function public.ensure_profile(), public.complete_onboarding() to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.learning_goals          enable row level security;
alter table public.experience_levels       enable row level security;
alter table public.weekly_learning_targets enable row level security;
alter table public.tools                   enable row level security;
alter table public.learner_preferences     enable row level security;
alter table public.learner_tools           enable row level security;

do $$
declare t text;
begin
  foreach t in array array['learning_goals', 'experience_levels', 'weekly_learning_targets', 'tools'] loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (is_active or (select public.is_admin()))', t || ' are readable', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))', 'admins insert ' || t, t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', 'admins update ' || t, t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))', 'admins delete ' || t, t);
  end loop;
end;
$$;

create policy "users read own preferences; admins read all" on public.learner_preferences
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "users create own preferences" on public.learner_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "users update own preferences" on public.learner_preferences
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "users read own tools; admins read all" on public.learner_tools
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "users add own tools" on public.learner_tools
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "users remove own tools" on public.learner_tools
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- user_id can never be changed by learners (only the answer columns).
revoke update on public.learner_preferences from anon, authenticated;
grant update (learning_goal_id, experience_level_id, weekly_target_id, tools_answered_at) on public.learner_preferences to authenticated;
revoke update on public.learner_tools from anon, authenticated;
