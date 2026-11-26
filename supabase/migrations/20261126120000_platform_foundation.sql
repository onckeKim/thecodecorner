-- =============================================================================
-- The Code Corner — Phase 1: platform foundation
--
-- Content hierarchy : learning_paths → courses → modules → lessons
-- Learner state     : enrolments, lesson_progress, course_progress, quiz_attempts,
--                     project_submissions, xp_transactions, user_streaks,
--                     user_achievements, certificates
-- Security model    : RLS on every table. Learners can only read their own state and
--                     can never write progress / XP / achievements directly; those
--                     change only through the SECURITY DEFINER functions below
--                     (start_lesson, complete_lesson), which validate everything.
--                     Curriculum writes are restricted to administrators.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enumerated types
-- -----------------------------------------------------------------------------
create type public.content_status    as enum ('draft', 'published', 'archived');
create type public.difficulty_level  as enum ('beginner', 'intermediate', 'advanced');
create type public.lesson_type       as enum ('article', 'video', 'exercise', 'quiz', 'project');
create type public.progress_status   as enum ('not_started', 'in_progress', 'completed');
create type public.enrolment_status  as enum ('active', 'completed', 'withdrawn');
create type public.question_type     as enum ('single_choice', 'multiple_choice', 'true_false', 'short_answer');
create type public.exercise_type     as enum ('sql', 'excel', 'dax', 'power_bi', 'python', 'general');
create type public.submission_status as enum ('draft', 'submitted', 'under_review', 'changes_requested', 'approved');
create type public.xp_source         as enum ('lesson', 'quiz', 'exercise', 'project', 'achievement', 'streak', 'admin_adjustment');

-- -----------------------------------------------------------------------------
-- Generic trigger helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Stamps published_at the first time a row becomes published.
create or replace function public.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;

-- -----------------------------------------------------------------------------
-- Roles & profiles
-- -----------------------------------------------------------------------------
create table public.roles (
  id          text primary key check (id ~ '^[a-z_]+$'),
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

insert into public.roles (id, name, description) values
  ('learner', 'Learner',       'Can enrol in learning paths and track their own progress.'),
  ('admin',   'Administrator', 'Can manage curriculum, users and platform settings.');

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  username     text unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null default '' check (char_length(display_name) <= 80),
  avatar_url   text check (avatar_url is null or avatar_url ~ '^https://'),
  bio          text check (bio is null or char_length(bio) <= 500),
  timezone     text not null default 'UTC' check (public.is_valid_timezone(timezone)),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on column public.profiles.email is 'Copy of auth.users.email kept in sync by trigger; visible only to the owner and admins.';

create table public.user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role_id    text not null references public.roles (id) on delete restrict,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users (id) on delete set null,
  primary key (user_id, role_id)
);
create index user_roles_role_idx on public.user_roles (role_id);

-- Role checks. SECURITY DEFINER so they can be used inside RLS policies without
-- recursing through user_roles' own policies.
create or replace function public.has_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role_id = p_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin');
$$;

-- -----------------------------------------------------------------------------
-- Platform settings (non-secret; readable by everyone, writable by admins)
-- -----------------------------------------------------------------------------
create table public.platform_settings (
  key         text primary key check (key ~ '^[a-z_]+$'),
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);

insert into public.platform_settings (key, value, description) values
  ('enforce_prerequisites', 'true'::jsonb,
   'When true, courses and modules stay locked until their prerequisites are completed. Admins always bypass locks.');

-- -----------------------------------------------------------------------------
-- Curriculum
-- -----------------------------------------------------------------------------
create table public.learning_paths (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null check (char_length(title) between 1 and 120),
  summary         text,
  description     text,
  level           public.difficulty_level,
  estimated_hours numeric(6,1) check (estimated_hours is null or estimated_hours > 0),
  icon            text,
  sort_order      integer not null default 0,
  status          public.content_status not null default 'draft',
  published_at    timestamptz,
  created_by      uuid references auth.users (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.courses (
  id              uuid primary key default gen_random_uuid(),
  path_id         uuid not null references public.learning_paths (id) on delete cascade,
  slug            text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null check (char_length(title) between 1 and 120),
  summary         text,
  description     text,
  level           public.difficulty_level,
  estimated_hours numeric(6,1) check (estimated_hours is null or estimated_hours > 0),
  icon            text,
  -- Design-system topic accent (data-topic attribute). null = brand accent.
  theme           text check (theme is null or theme in ('sql', 'powerbi', 'excel', 'dax', 'model')),
  sort_order      integer not null default 0,
  status          public.content_status not null default 'draft',
  published_at    timestamptz,
  created_by      uuid references auth.users (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (path_id, slug)
);
create index courses_path_order_idx on public.courses (path_id, sort_order);

create table public.course_prerequisites (
  course_id          uuid not null references public.courses (id) on delete cascade,
  required_course_id uuid not null references public.courses (id) on delete cascade,
  created_at         timestamptz not null default now(),
  primary key (course_id, required_course_id),
  check (course_id <> required_course_id)
);
create index course_prerequisites_required_idx on public.course_prerequisites (required_course_id);

create table public.modules (
  id                uuid primary key default gen_random_uuid(),
  course_id         uuid not null references public.courses (id) on delete cascade,
  slug              text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title             text not null check (char_length(title) between 1 and 120),
  summary           text,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  sort_order        integer not null default 0,
  status            public.content_status not null default 'draft',
  published_at      timestamptz,
  created_by        uuid references auth.users (id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (course_id, slug)
);
create index modules_course_order_idx on public.modules (course_id, sort_order);

create table public.module_prerequisites (
  module_id          uuid not null references public.modules (id) on delete cascade,
  required_module_id uuid not null references public.modules (id) on delete cascade,
  created_at         timestamptz not null default now(),
  primary key (module_id, required_module_id),
  check (module_id <> required_module_id)
);
create index module_prerequisites_required_idx on public.module_prerequisites (required_module_id);

create table public.lessons (
  id                uuid primary key default gen_random_uuid(),
  module_id         uuid not null references public.modules (id) on delete cascade,
  slug              text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title             text not null check (char_length(title) between 1 and 160),
  summary           text,
  lesson_type       public.lesson_type not null default 'article',
  -- Ordered array of typed content blocks (validated by the application; see
  -- src/server/curriculum/content.ts). Kept as JSON so an admin CMS can edit it.
  content           jsonb not null default '[]'::jsonb check (jsonb_typeof(content) = 'array'),
  video_url         text check (video_url is null or video_url ~ '^https://'),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  xp_reward         integer not null default 10 check (xp_reward between 0 and 1000),
  sort_order        integer not null default 0,
  status            public.content_status not null default 'draft',
  published_at      timestamptz,
  created_by        uuid references auth.users (id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (module_id, slug)
);
create index lessons_module_order_idx on public.lessons (module_id, sort_order);

create table public.lesson_resources (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.lessons (id) on delete cascade,
  title         text not null,
  description   text,
  resource_type text not null check (resource_type in ('file', 'link')),
  storage_path  text,   -- object path inside the 'learning-resources' bucket
  external_url  text check (external_url is null or external_url ~ '^https://'),
  sort_order    integer not null default 0,
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check ((resource_type = 'file' and storage_path is not null)
      or (resource_type = 'link' and external_url is not null))
);
create index lesson_resources_lesson_idx on public.lesson_resources (lesson_id, sort_order);

-- -----------------------------------------------------------------------------
-- Assessments, exercises & projects (structure only in Phase 1)
-- -----------------------------------------------------------------------------
create table public.quizzes (
  id                 uuid primary key default gen_random_uuid(),
  lesson_id          uuid references public.lessons (id) on delete cascade,
  module_id          uuid references public.modules (id) on delete cascade,
  title              text not null,
  description        text,
  pass_mark_percent  integer not null default 70 check (pass_mark_percent between 0 and 100),
  time_limit_seconds integer check (time_limit_seconds is null or time_limit_seconds > 0),
  max_attempts       integer check (max_attempts is null or max_attempts > 0),
  xp_reward          integer not null default 20 check (xp_reward between 0 and 1000),
  sort_order         integer not null default 0,
  status             public.content_status not null default 'draft',
  published_at       timestamptz,
  created_by         uuid references auth.users (id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (lesson_id is not null or module_id is not null)
);
create index quizzes_lesson_idx on public.quizzes (lesson_id);
create index quizzes_module_idx on public.quizzes (module_id);

create table public.quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.quizzes (id) on delete cascade,
  question_type public.question_type not null default 'single_choice',
  prompt        text not null,
  code          jsonb,  -- optional { "language": "sql", "code": "..." }
  options       jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  hint          text,
  points        integer not null default 1 check (points > 0),
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index quiz_questions_quiz_idx on public.quiz_questions (quiz_id, sort_order);

-- Answer keys live in a separate, admin-only table so learners can never read them.
create table public.quiz_question_keys (
  question_id    uuid primary key references public.quiz_questions (id) on delete cascade,
  correct_answer jsonb not null,
  explanation    text,
  updated_at     timestamptz not null default now()
);

create table public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  quiz_id      uuid not null references public.quizzes (id) on delete cascade,
  answers      jsonb not null default '{}'::jsonb,
  score        integer check (score is null or score >= 0),
  max_score    integer check (max_score is null or max_score >= 0),
  percent      numeric(5,2) check (percent is null or percent between 0 and 100),
  passed       boolean,
  started_at   timestamptz not null default now(),
  submitted_at timestamptz,
  created_at   timestamptz not null default now()
);
create index quiz_attempts_user_quiz_idx on public.quiz_attempts (user_id, quiz_id);
create index quiz_attempts_quiz_idx on public.quiz_attempts (quiz_id);

create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid references public.lessons (id) on delete cascade,
  title         text not null,
  exercise_type public.exercise_type not null default 'general',
  instructions  jsonb not null default '[]'::jsonb check (jsonb_typeof(instructions) = 'array'),
  starter_code  text,
  dataset       text,  -- identifier of the sample dataset the exercise runs against
  level         public.difficulty_level,
  xp_reward     integer not null default 25 check (xp_reward between 0 and 1000),
  sort_order    integer not null default 0,
  status        public.content_status not null default 'draft',
  published_at  timestamptz,
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index exercises_lesson_idx on public.exercises (lesson_id, sort_order);

-- Model solutions / checker config: admin-only.
create table public.exercise_solutions (
  exercise_id uuid primary key references public.exercises (id) on delete cascade,
  solution    text not null,
  checker     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  path_id         uuid not null references public.learning_paths (id) on delete cascade,
  course_id       uuid references public.courses (id) on delete set null,
  slug            text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null,
  summary         text,
  brief           jsonb not null default '[]'::jsonb check (jsonb_typeof(brief) = 'array'),
  level           public.difficulty_level,
  estimated_hours numeric(6,1) check (estimated_hours is null or estimated_hours > 0),
  xp_reward       integer not null default 100 check (xp_reward between 0 and 5000),
  sort_order      integer not null default 0,
  status          public.content_status not null default 'draft',
  published_at    timestamptz,
  created_by      uuid references auth.users (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (path_id, slug)
);
create index projects_course_idx on public.projects (course_id);

create table public.project_submissions (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status         public.submission_status not null default 'draft',
  submission_url text check (submission_url is null or submission_url ~ '^https://'),
  notes          text check (notes is null or char_length(notes) <= 5000),
  storage_path   text,  -- object path inside the 'project-submissions' bucket
  feedback       text,
  score          integer check (score is null or score between 0 and 100),
  reviewed_by    uuid references auth.users (id) on delete set null,
  reviewed_at    timestamptz,
  submitted_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index project_submissions_user_idx on public.project_submissions (user_id);
create index project_submissions_project_idx on public.project_submissions (project_id);

-- -----------------------------------------------------------------------------
-- Learner state
-- -----------------------------------------------------------------------------
create table public.enrolments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path_id      uuid not null references public.learning_paths (id) on delete cascade,
  status       public.enrolment_status not null default 'active',
  enrolled_at  timestamptz not null default now(),
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (user_id, path_id)
);
create index enrolments_path_idx on public.enrolments (path_id);

create table public.lesson_progress (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  lesson_id      uuid not null references public.lessons (id) on delete cascade,
  status         public.progress_status not null default 'in_progress',
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  last_viewed_at timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, lesson_id),
  check (status <> 'completed' or completed_at is not null)
);
create index lesson_progress_lesson_idx on public.lesson_progress (lesson_id);

create table public.course_progress (
  user_id           uuid not null references auth.users (id) on delete cascade,
  course_id         uuid not null references public.courses (id) on delete cascade,
  completed_lessons integer not null default 0 check (completed_lessons >= 0),
  total_lessons     integer not null default 0 check (total_lessons >= 0),
  percent_complete  numeric(5,2) not null default 0 check (percent_complete between 0 and 100),
  status            public.progress_status not null default 'not_started',
  started_at        timestamptz,
  completed_at      timestamptz,
  updated_at        timestamptz not null default now(),
  primary key (user_id, course_id)
);
create index course_progress_course_idx on public.course_progress (course_id);

create table public.achievements (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null,
  description text,
  icon        text,
  xp_reward   integer not null default 0 check (xp_reward between 0 and 5000),
  -- { "type": "lessons_completed" | "courses_completed" | "streak_days" | "xp_total", "threshold": n }
  criteria    jsonb not null check (
                jsonb_typeof(criteria) = 'object'
                and criteria ? 'type' and criteria ? 'threshold'),
  sort_order  integer not null default 0,
  status      public.content_status not null default 'draft',
  published_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.user_achievements (
  user_id        uuid not null references auth.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  awarded_at     timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
create index user_achievements_achievement_idx on public.user_achievements (achievement_id);

create table public.xp_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  amount      integer not null check (amount <> 0 and amount between -100000 and 100000),
  source_type public.xp_source not null,
  source_id   uuid,
  description text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index xp_transactions_user_idx on public.xp_transactions (user_id, created_at desc);
-- Each lesson / quiz / achievement etc. awards XP at most once per learner.
create unique index xp_transactions_once_per_source_idx
  on public.xp_transactions (user_id, source_type, source_id)
  where source_id is not null and source_type <> 'admin_adjustment';

create table public.user_streaks (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  current_streak     integer not null default 0 check (current_streak >= 0),
  longest_streak     integer not null default 0 check (longest_streak >= 0),
  last_activity_date date,
  updated_at         timestamptz not null default now()
);

create table public.certificates (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  path_id            uuid references public.learning_paths (id) on delete cascade,
  course_id          uuid references public.courses (id) on delete cascade,
  certificate_number text not null unique,
  verification_code  text not null unique default replace(gen_random_uuid()::text, '-', ''),
  storage_path       text,
  issued_at          timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  check (num_nonnulls(path_id, course_id) = 1),
  unique (user_id, path_id),
  unique (user_id, course_id)
);
create index certificates_path_idx on public.certificates (path_id);
create index certificates_course_idx on public.certificates (course_id);

-- -----------------------------------------------------------------------------
-- Triggers: updated_at / published_at
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'learning_paths', 'courses', 'modules', 'lessons', 'lesson_resources',
    'quizzes', 'quiz_questions', 'quiz_question_keys', 'exercises', 'exercise_solutions',
    'projects', 'project_submissions', 'enrolments', 'lesson_progress', 'course_progress',
    'achievements', 'user_streaks', 'platform_settings'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;

  foreach t in array array[
    'learning_paths', 'courses', 'modules', 'lessons', 'quizzes', 'exercises', 'projects', 'achievements'
  ] loop
    execute format(
      'create trigger set_published_at before insert or update of status on public.%I
         for each row execute function public.set_published_at()', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- New users: profile + learner role + streak row
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := left(coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  ), 80);

  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(v_name, ''))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role_id)
  values (new.id, 'learner')
  on conflict do nothing;

  insert into public.user_streaks (user_id)
  values (new.id)
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- Visibility & unlock helpers (used by RLS and by the progress functions)
-- -----------------------------------------------------------------------------
create or replace function public.is_path_visible(p_path_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.learning_paths p
    where p.id = p_path_id and p.status = 'published'
  );
$$;

create or replace function public.is_course_visible(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.courses c
    join public.learning_paths p on p.id = c.path_id
    where c.id = p_course_id and c.status = 'published' and p.status = 'published'
  );
$$;

create or replace function public.is_module_visible(p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.modules m
    where m.id = p_module_id and m.status = 'published'
      and public.is_course_visible(m.course_id)
  );
$$;

create or replace function public.is_lesson_visible(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lessons l
    where l.id = p_lesson_id and l.status = 'published'
      and public.is_module_visible(l.module_id)
  );
$$;

create or replace function public.prerequisites_enforced()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (value)::text::boolean from public.platform_settings where key = 'enforce_prerequisites'),
    true
  );
$$;

-- Published lessons in published modules of a course.
create or replace function public.course_lesson_ids(p_course_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select l.id
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where m.course_id = p_course_id and m.status = 'published' and l.status = 'published';
$$;

create or replace function public.is_module_completed(p_user_id uuid, p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.lessons l
    where l.module_id = p_module_id and l.status = 'published'
      and not exists (
        select 1 from public.lesson_progress lp
        where lp.user_id = p_user_id and lp.lesson_id = l.id and lp.status = 'completed'
      )
  );
$$;

create or replace function public.is_course_completed(p_user_id uuid, p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.course_lesson_ids(p_course_id))
     and not exists (
       select 1
       from public.course_lesson_ids(p_course_id) as lesson(id)
       where not exists (
         select 1 from public.lesson_progress lp
         where lp.user_id = p_user_id and lp.lesson_id = lesson.id and lp.status = 'completed'
       )
     );
$$;

create or replace function public.is_course_unlocked(p_user_id uuid, p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not public.prerequisites_enforced()
      or exists (select 1 from public.user_roles where user_id = p_user_id and role_id = 'admin')
      or not exists (
        select 1
        from public.course_prerequisites cp
        where cp.course_id = p_course_id
          and public.is_course_visible(cp.required_course_id)
          and not public.is_course_completed(p_user_id, cp.required_course_id)
      );
$$;

create or replace function public.is_module_unlocked(p_user_id uuid, p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_course_unlocked(p_user_id, m.course_id)
     and (
       not public.prerequisites_enforced()
       or exists (select 1 from public.user_roles where user_id = p_user_id and role_id = 'admin')
       or not exists (
         select 1
         from public.module_prerequisites mp
         where mp.module_id = m.id
           and public.is_module_visible(mp.required_module_id)
           and not public.is_module_completed(p_user_id, mp.required_module_id)
       )
     )
  from public.modules m
  where m.id = p_module_id;
$$;

-- -----------------------------------------------------------------------------
-- Internal business logic (NOT callable by clients; see revokes below)
-- -----------------------------------------------------------------------------

-- Awards XP once per (user, source). Returns the amount awarded (0 if already awarded).
create or replace function public.award_xp(
  p_user_id uuid, p_amount integer, p_source public.xp_source, p_source_id uuid, p_description text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  if p_amount is null or p_amount = 0 then
    return 0;
  end if;

  insert into public.xp_transactions (user_id, amount, source_type, source_id, description)
  values (p_user_id, p_amount, p_source, p_source_id, p_description)
  on conflict (user_id, source_type, source_id)
    where source_id is not null and source_type <> 'admin_adjustment'
  do nothing;

  get diagnostics v_rows = row_count;
  return case when v_rows > 0 then p_amount else 0 end;
end;
$$;

-- Records learning activity for today (in the learner's timezone) and updates the streak.
create or replace function public.record_activity(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today   date;
  v_streak  public.user_streaks%rowtype;
  v_current integer;
begin
  select (now() at time zone coalesce(p.timezone, 'UTC'))::date
    into v_today
  from public.profiles p where p.id = p_user_id;
  v_today := coalesce(v_today, (now() at time zone 'UTC')::date);

  insert into public.user_streaks (user_id) values (p_user_id) on conflict do nothing;
  select * into v_streak from public.user_streaks where user_id = p_user_id for update;

  if v_streak.last_activity_date = v_today then
    return v_streak.current_streak;
  elsif v_streak.last_activity_date = v_today - 1 then
    v_current := v_streak.current_streak + 1;
  else
    v_current := 1;
  end if;

  update public.user_streaks
     set current_streak = v_current,
         longest_streak = greatest(longest_streak, v_current),
         last_activity_date = v_today
   where user_id = p_user_id;

  return v_current;
end;
$$;

-- Recomputes course_progress for one learner/course; marks the path enrolment
-- completed when every published course in the path is complete.
create or replace function public.recalculate_course_progress(p_user_id uuid, p_course_id uuid)
returns public.course_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total     integer;
  v_completed integer;
  v_status    public.progress_status;
  v_row       public.course_progress;
  v_path_id   uuid;
begin
  select count(*) into v_total from public.course_lesson_ids(p_course_id);

  select count(*) into v_completed
  from public.course_lesson_ids(p_course_id) as lesson(id)
  join public.lesson_progress lp on lp.lesson_id = lesson.id
  where lp.user_id = p_user_id and lp.status = 'completed';

  -- A course_progress row only exists once the learner has started the course.
  v_status := case when v_total > 0 and v_completed >= v_total then 'completed' else 'in_progress' end;

  insert into public.course_progress as cp
    (user_id, course_id, completed_lessons, total_lessons, percent_complete, status, started_at, completed_at)
  values (
    p_user_id, p_course_id, v_completed, v_total,
    case when v_total = 0 then 0 else round(v_completed * 100.0 / v_total, 2) end,
    v_status, now(),
    case when v_status = 'completed' then now() end
  )
  on conflict (user_id, course_id) do update set
    completed_lessons = excluded.completed_lessons,
    total_lessons     = excluded.total_lessons,
    percent_complete  = excluded.percent_complete,
    status            = excluded.status,
    completed_at      = case
                          when excluded.status = 'completed' then coalesce(cp.completed_at, now())
                          else null
                        end
  returning * into v_row;

  -- Path completion
  select path_id into v_path_id from public.courses where id = p_course_id;
  if not exists (
    select 1 from public.courses c
    where c.path_id = v_path_id and c.status = 'published'
      and not public.is_course_completed(p_user_id, c.id)
  ) then
    update public.enrolments
       set status = 'completed', completed_at = coalesce(completed_at, now())
     where user_id = p_user_id and path_id = v_path_id and status = 'active';
  end if;

  return v_row;
end;
$$;

-- Awards any newly earned achievements. Returns the awarded achievements.
create or replace function public.evaluate_achievements(p_user_id uuid)
returns table (slug text, title text, xp_reward integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lessons integer;
  v_courses integer;
  v_streak  integer;
  v_xp      integer;
  a         record;
  v_value   integer;
begin
  select count(*) into v_lessons from public.lesson_progress where user_id = p_user_id and status = 'completed';
  select count(*) into v_courses from public.course_progress where user_id = p_user_id and status = 'completed';
  select coalesce(longest_streak, 0) into v_streak from public.user_streaks where user_id = p_user_id;
  select coalesce(sum(amount), 0) into v_xp from public.xp_transactions where user_id = p_user_id;

  for a in
    select ach.* from public.achievements ach
    where ach.status = 'published'
      and not exists (
        select 1 from public.user_achievements ua
        where ua.user_id = p_user_id and ua.achievement_id = ach.id)
    order by ach.sort_order
  loop
    v_value := case a.criteria ->> 'type'
      when 'lessons_completed' then v_lessons
      when 'courses_completed' then v_courses
      when 'streak_days'       then coalesce(v_streak, 0)
      when 'xp_total'          then v_xp
      else null
    end;

    if v_value is not null and v_value >= (a.criteria ->> 'threshold')::integer then
      insert into public.user_achievements (user_id, achievement_id)
      values (p_user_id, a.id) on conflict do nothing;
      perform public.award_xp(p_user_id, a.xp_reward, 'achievement', a.id, 'Achievement: ' || a.title);
      slug := a.slug; title := a.title; xp_reward := a.xp_reward;
      return next;
    end if;
  end loop;
end;
$$;

-- Shared validation for the learner-facing lesson RPCs.
create or replace function public.assert_can_study_lesson(p_user_id uuid, p_lesson_id uuid)
returns table (lesson_id uuid, module_id uuid, course_id uuid, path_id uuid, xp_reward integer, title text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin boolean;
begin
  if p_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  v_admin := exists (select 1 from public.user_roles ur where ur.user_id = p_user_id and ur.role_id = 'admin');

  return query
    select l.id, m.id, c.id, c.path_id, l.xp_reward, l.title
    from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where l.id = p_lesson_id;

  if not found then
    raise exception 'Lesson not found' using errcode = 'P0002';
  end if;

  if not v_admin then
    if not public.is_lesson_visible(p_lesson_id) then
      raise exception 'Lesson not found' using errcode = 'P0002';
    end if;
    if not exists (
      select 1 from public.enrolments e
      join public.courses c on c.path_id = e.path_id
      join public.modules m on m.course_id = c.id
      join public.lessons l on l.module_id = m.id
      where l.id = p_lesson_id and e.user_id = p_user_id and e.status <> 'withdrawn'
    ) then
      raise exception 'You are not enrolled in this learning path' using errcode = '42501';
    end if;
    if not public.is_module_unlocked(p_user_id, (select l.module_id from public.lessons l where l.id = p_lesson_id)) then
      raise exception 'This lesson is locked until its prerequisites are completed' using errcode = '42501';
    end if;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Learner-facing RPCs (callable by authenticated users)
-- -----------------------------------------------------------------------------

-- Marks a lesson as started / viewed. Never downgrades a completed lesson.
create or replace function public.start_lesson(p_lesson_id uuid)
returns public.progress_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_info   record;
  v_status public.progress_status;
begin
  select * into v_info from public.assert_can_study_lesson(v_user, p_lesson_id);

  insert into public.lesson_progress as lp (user_id, lesson_id, status)
  values (v_user, p_lesson_id, 'in_progress')
  on conflict (user_id, lesson_id) do update set last_viewed_at = now()
  returning lp.status into v_status;

  insert into public.course_progress (user_id, course_id, status, started_at)
  values (v_user, v_info.course_id, 'in_progress', now())
  on conflict (user_id, course_id) do nothing;

  return v_status;
end;
$$;

-- Completes a lesson: progress, XP (once), streak, course/path progress, achievements.
create or replace function public.complete_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user         uuid := auth.uid();
  v_info         record;
  v_was_complete boolean;
  v_xp           integer := 0;
  v_streak       integer;
  v_course       public.course_progress;
  v_new          jsonb;
begin
  select * into v_info from public.assert_can_study_lesson(v_user, p_lesson_id);

  select coalesce(bool_or(status = 'completed'), false) into v_was_complete
  from public.lesson_progress where user_id = v_user and lesson_id = p_lesson_id;

  insert into public.lesson_progress as lp (user_id, lesson_id, status, completed_at)
  values (v_user, p_lesson_id, 'completed', now())
  on conflict (user_id, lesson_id) do update set
    status = 'completed',
    completed_at = coalesce(lp.completed_at, now()),
    last_viewed_at = now();

  if not v_was_complete then
    v_xp := public.award_xp(v_user, v_info.xp_reward, 'lesson', p_lesson_id, 'Completed lesson: ' || v_info.title);
  end if;

  v_streak := public.record_activity(v_user);
  v_course := public.recalculate_course_progress(v_user, v_info.course_id);

  select coalesce(jsonb_agg(jsonb_build_object('slug', a.slug, 'title', a.title, 'xp_reward', a.xp_reward)), '[]'::jsonb)
    into v_new
  from public.evaluate_achievements(v_user) a;

  return jsonb_build_object(
    'already_completed', v_was_complete,
    'xp_awarded', v_xp,
    'current_streak', v_streak,
    'course_completed', v_course.status = 'completed',
    'course_percent', v_course.percent_complete,
    'new_achievements', v_new
  );
end;
$$;

-- Dashboard summary for the signed-in learner (runs with the caller's RLS).
create or replace function public.get_learning_summary()
returns table (
  total_xp            integer,
  lessons_completed   integer,
  courses_completed   integer,
  current_streak      integer,
  longest_streak      integer,
  achievements_earned integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce((select sum(amount) from public.xp_transactions where user_id = (select auth.uid())), 0)::integer,
    (select count(*) from public.lesson_progress where user_id = (select auth.uid()) and status = 'completed')::integer,
    (select count(*) from public.course_progress where user_id = (select auth.uid()) and status = 'completed')::integer,
    coalesce((
      select case
        when s.last_activity_date >= (now() at time zone coalesce(p.timezone, 'UTC'))::date - 1
          then s.current_streak else 0 end
      from public.user_streaks s
      join public.profiles p on p.id = s.user_id
      where s.user_id = (select auth.uid())
    ), 0)::integer,
    coalesce((select longest_streak from public.user_streaks where user_id = (select auth.uid())), 0)::integer,
    (select count(*) from public.user_achievements where user_id = (select auth.uid()))::integer;
$$;

-- -----------------------------------------------------------------------------
-- Guard: learners may not touch review fields on their own project submissions
-- -----------------------------------------------------------------------------
create or replace function public.guard_project_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.feedback := null; new.score := null; new.reviewed_by := null; new.reviewed_at := null;
    else
      new.feedback := old.feedback; new.score := old.score;
      new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
      new.user_id := old.user_id; new.project_id := old.project_id;
    end if;
    if new.status not in ('draft', 'submitted') then
      raise exception 'Learners can only save drafts or submit' using errcode = '42501';
    end if;
  end if;
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status is distinct from 'submitted') then
    new.submitted_at := now();
  end if;
  return new;
end;
$$;

create trigger guard_project_submission
  before insert or update on public.project_submissions
  for each row execute function public.guard_project_submission();

-- -----------------------------------------------------------------------------
-- Function privileges
-- Supabase grants EXECUTE on new functions to anon/authenticated by default, so
-- internal functions are revoked explicitly.
-- -----------------------------------------------------------------------------
revoke execute on function
  public.award_xp(uuid, integer, public.xp_source, uuid, text),
  public.record_activity(uuid),
  public.recalculate_course_progress(uuid, uuid),
  public.evaluate_achievements(uuid),
  public.assert_can_study_lesson(uuid, uuid),
  public.handle_new_user(),
  public.handle_user_email_change(),
  public.guard_project_submission(),
  public.course_lesson_ids(uuid),
  public.is_module_completed(uuid, uuid),
  public.is_course_completed(uuid, uuid),
  public.is_course_unlocked(uuid, uuid),
  public.is_module_unlocked(uuid, uuid)
from public, anon, authenticated;

revoke execute on function public.start_lesson(uuid), public.complete_lesson(uuid), public.get_learning_summary()
  from public, anon;
grant execute on function public.start_lesson(uuid), public.complete_lesson(uuid), public.get_learning_summary()
  to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.roles                enable row level security;
alter table public.profiles             enable row level security;
alter table public.user_roles           enable row level security;
alter table public.platform_settings    enable row level security;
alter table public.learning_paths       enable row level security;
alter table public.courses              enable row level security;
alter table public.course_prerequisites enable row level security;
alter table public.modules              enable row level security;
alter table public.module_prerequisites enable row level security;
alter table public.lessons              enable row level security;
alter table public.lesson_resources     enable row level security;
alter table public.quizzes              enable row level security;
alter table public.quiz_questions       enable row level security;
alter table public.quiz_question_keys   enable row level security;
alter table public.quiz_attempts        enable row level security;
alter table public.exercises            enable row level security;
alter table public.exercise_solutions   enable row level security;
alter table public.projects             enable row level security;
alter table public.project_submissions  enable row level security;
alter table public.enrolments           enable row level security;
alter table public.lesson_progress      enable row level security;
alter table public.course_progress      enable row level security;
alter table public.achievements         enable row level security;
alter table public.user_achievements    enable row level security;
alter table public.xp_transactions      enable row level security;
alter table public.user_streaks         enable row level security;
alter table public.certificates         enable row level security;

-- Reference data -------------------------------------------------------------
create policy "roles are readable" on public.roles
  for select to anon, authenticated using (true);
create policy "admins manage roles" on public.roles
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "settings are readable" on public.platform_settings
  for select to anon, authenticated using (true);
create policy "admins manage settings" on public.platform_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Profiles & roles -----------------------------------------------------------
create policy "users read own profile; admins read all" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "users update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "admins update profiles" on public.profiles
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Column-level privileges: learners may only edit these profile fields.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_url, bio, timezone) on public.profiles to authenticated;

create policy "users read own roles; admins read all" on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins grant roles" on public.user_roles
  for insert to authenticated with check ((select public.is_admin()));
create policy "admins revoke roles" on public.user_roles
  for delete to authenticated using ((select public.is_admin()));

-- Curriculum (published content is public; admins see and manage everything) --
create policy "published paths are readable" on public.learning_paths
  for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));
create policy "admins manage paths" on public.learning_paths
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "published courses are readable" on public.courses
  for select to anon, authenticated
  using (public.is_course_visible(id) or (select public.is_admin()));
create policy "admins manage courses" on public.courses
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "course prerequisites are readable" on public.course_prerequisites
  for select to anon, authenticated using (true);
create policy "admins manage course prerequisites" on public.course_prerequisites
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "published modules are readable" on public.modules
  for select to anon, authenticated
  using (public.is_module_visible(id) or (select public.is_admin()));
create policy "admins manage modules" on public.modules
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "module prerequisites are readable" on public.module_prerequisites
  for select to anon, authenticated using (true);
create policy "admins manage module prerequisites" on public.module_prerequisites
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "published lessons are readable" on public.lessons
  for select to anon, authenticated
  using (public.is_lesson_visible(id) or (select public.is_admin()));
create policy "admins manage lessons" on public.lessons
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "signed-in users read resources of published lessons" on public.lesson_resources
  for select to authenticated
  using (public.is_lesson_visible(lesson_id) or (select public.is_admin()));
create policy "admins manage lesson resources" on public.lesson_resources
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Assessments ----------------------------------------------------------------
create policy "signed-in users read published quizzes" on public.quizzes
  for select to authenticated
  using (
    (status = 'published'
      and (lesson_id is null or public.is_lesson_visible(lesson_id))
      and (module_id is null or public.is_module_visible(module_id)))
    or (select public.is_admin()));
create policy "admins manage quizzes" on public.quizzes
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "signed-in users read questions of readable quizzes" on public.quiz_questions
  for select to authenticated
  using (exists (select 1 from public.quizzes q where q.id = quiz_id));  -- quizzes RLS applies
create policy "admins manage quiz questions" on public.quiz_questions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admins only: quiz answer keys" on public.quiz_question_keys
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "users read own quiz attempts; admins read all" on public.quiz_attempts
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins manage quiz attempts" on public.quiz_attempts
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "signed-in users read published exercises" on public.exercises
  for select to authenticated
  using ((status = 'published' and (lesson_id is null or public.is_lesson_visible(lesson_id)))
         or (select public.is_admin()));
create policy "admins manage exercises" on public.exercises
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admins only: exercise solutions" on public.exercise_solutions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Projects ---------------------------------------------------------------------
create policy "published projects are readable" on public.projects
  for select to anon, authenticated
  using ((status = 'published' and public.is_path_visible(path_id)) or (select public.is_admin()));
create policy "admins manage projects" on public.projects
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "users read own submissions; admins read all" on public.project_submissions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "users create own submissions" on public.project_submissions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status in ('draft', 'submitted')
    and exists (select 1 from public.projects p where p.id = project_id and p.status = 'published'));
create policy "users edit own open submissions" on public.project_submissions
  for update to authenticated
  using (user_id = (select auth.uid()) and status in ('draft', 'changes_requested'))
  with check (user_id = (select auth.uid()) and status in ('draft', 'submitted'));
create policy "users delete own drafts" on public.project_submissions
  for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'draft');
create policy "admins manage submissions" on public.project_submissions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Learner state ------------------------------------------------------------------
create policy "users read own enrolments; admins read all" on public.enrolments
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "users enrol themselves in published paths" on public.enrolments
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'active' and public.is_path_visible(path_id));
create policy "admins manage enrolments" on public.enrolments
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- No learner update/delete policies: enrolment status changes only through functions.

create policy "users read own lesson progress; admins read all" on public.lesson_progress
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins manage lesson progress" on public.lesson_progress
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "users read own course progress; admins read all" on public.course_progress
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins manage course progress" on public.course_progress
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "published achievements are readable" on public.achievements
  for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));
create policy "admins manage achievements" on public.achievements
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "users read own achievements; admins read all" on public.user_achievements
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins manage user achievements" on public.user_achievements
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "users read own xp; admins read all" on public.xp_transactions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins adjust xp" on public.xp_transactions
  for insert to authenticated
  with check ((select public.is_admin()) and source_type = 'admin_adjustment');

create policy "users read own streak; admins read all" on public.user_streaks
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins manage streaks" on public.user_streaks
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "users read own certificates; admins read all" on public.certificates
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins manage certificates" on public.certificates
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Storage buckets (private) and object policies
--   learning-resources  : admins upload; signed-in users download
--   project-submissions : each user manages files under "<their user id>/..."
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('learning-resources', 'learning-resources', false),
       ('project-submissions', 'project-submissions', false)
on conflict (id) do nothing;

create policy "signed-in users read learning resources" on storage.objects
  for select to authenticated
  using (bucket_id = 'learning-resources');
create policy "admins manage learning resources" on storage.objects
  for all to authenticated
  using (bucket_id = 'learning-resources' and (select public.is_admin()))
  with check (bucket_id = 'learning-resources' and (select public.is_admin()));

create policy "users manage own submission files" on storage.objects
  for all to authenticated
  using (bucket_id = 'project-submissions' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'project-submissions' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "admins read submission files" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-submissions' and (select public.is_admin()));
