# The Code Corner

An online IT learning platform: structured **learning paths → courses → modules → lessons**, with
progress tracking, XP, streaks and achievements. The first path is **Data Analyst**; the
architecture supports any number of paths.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, RLS) · deployable to Vercel.

**Status:** Phase 1 (platform foundation) is complete. See [What exists today](#what-exists-today).

---

## Quick start

```bash
npm install
cp .env.example .env.local      # fill in your Supabase URL + anon key
npm run dev                     # http://localhost:3000
```

Then set up the database ([Supabase setup](#supabase-setup)) and make yourself an admin.

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js (syncs the design system into the prototype first) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm test` | Unit tests for progress/lock logic, content parsing and redirect safety |
| `npm run test:db` | Migration + seed + 60 RLS/progress checks on a plain PostgreSQL server ([details](supabase/tests/README.md)) |
| `npm run check` | typecheck + lint + build |

## Environment variables

| Variable | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same (anon / publishable key) | Required. Safe in the browser: all data is protected by RLS |
| `NEXT_PUBLIC_SITE_URL` | your site's base URL | Used in auth email links. `http://localhost:3000` locally |

The **service-role key is not used** anywhere in Phase 1. Never prefix it with `NEXT_PUBLIC_`.
On Vercel, add the three variables under Project → Settings → Environment Variables.

## Supabase setup

1. **Apply the schema.** Either:
   - CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`, or
   - Dashboard → SQL Editor: run each file in `supabase/migrations/` in order.
   (Already applied to the `thecodecorner` project, together with the seed.)
2. **Load the demo curriculum** (development only): run `supabase/seed.sql` in the SQL Editor.
   It's safe to re-run. It switches prerequisites **off** so every course can be tested.
3. **Auth settings** (Dashboard → Authentication):
   - URL Configuration → Site URL: your site URL; Redirect URLs: add `http://localhost:3000/auth/confirm`
     and `https://<your-domain>/auth/confirm`.
   - Providers → Email: enabled. "Confirm email" can stay on (users get a link that lands on
     `/auth/confirm`) or be turned off for quicker local testing.
   - **Email delivery:** Supabase's built-in mailer only sends to your project team's addresses
     and allows a few emails per hour, so sign-ups from anyone else fail. Before real users
     register, set up custom SMTP (Authentication → Emails → SMTP settings, e.g. Resend,
     Postmark or SES), or turn "Confirm email" off while developing.
4. **Make yourself an admin** after registering through the site:
   ```sql
   insert into public.user_roles (user_id, role_id)
   select id, 'admin' from auth.users where email = 'you@example.com';
   ```
5. When the real curriculum is ready, turn prerequisites back on from **/admin** (or
   `update platform_settings set value = 'true' where key = 'enforce_prerequisites';`).

## Architecture

```
src/
  app/                    Routes only (thin). Data comes from src/server/*
    (auth)/login|register   Sign-in / registration
    auth/confirm            Email-link landing (PKCE code or token_hash)
    paths/, paths/[slug]    Public catalogue + path overview with enrolment
    learn/                  Public learning hub
    (learner)/…             Signed-in area: dashboard, learn/[path]/[course]/[module]/[lesson],
                            practice, projects, profile, achievements, certificates
    admin/…                 Admin area (role checked server-side in the layout and every action)
  components/
    ui/                     Thin React wrappers around the design-system classes
    layout/                 Header, footer, theme toggle, menus
    curriculum/ auth/ profile/ admin/   Feature components
  server/                 Server-only application logic ("services"), one folder per domain
    auth/                   Session/viewer, requireViewer, assertAdmin, sign-in/up/out actions
    curriculum/             Paths, courses, modules, lessons, projects (reads, RLS-filtered)
    progress/               Enrolment, progress, lock computation, complete-lesson action
    assessment/             Quizzes/exercises (metadata in Phase 1; grading later)
    xp/ achievements/       XP summary & history, achievements, certificates
    profile/ admin/         Profile editing; admin content status & settings
  lib/                    Framework-agnostic helpers: env, routes, Supabase clients,
                          lesson content schema (zod) and syntax highlighting
  types/                  database.ts (Supabase types) and domain.ts (app types)
  proxy.ts                Session refresh + redirect of signed-out users (Next 16 "proxy")
supabase/
  migrations/             Schema, functions, RLS, storage buckets
  seed.sql                Demo Data Analyst curriculum (temporary, replaceable via CMS)
  tests/                  Supabase stubs + RLS/progress test suite for plain Postgres
design/                   Design system (the visual source of truth)
public/prototype/         The original static prototype (quiz + SQL Lab), still served
```

### Design system

`design/tokens.css` and `design/components.css` are imported into `src/app/globals.css`
unchanged. Tailwind's colour/font names are mapped onto the design tokens (`bg-surface`,
`text-muted`, `bg-accent`…), so utilities can't introduce new colours, and dark mode works
everywhere. Components use the design classes directly (`btn`, `card`, `tag`, `level`,
`progress`, `callout`, `code`, `stat`, `topic-card`, `data-topic`).

### Data model (summary)

- **Curriculum:** `learning_paths` → `courses` → `modules` → `lessons` (+ `lesson_resources`),
  each with `status` (draft/published/archived), `sort_order`, `published_at`, `created_by`,
  timestamps. Prerequisites: `course_prerequisites`, `module_prerequisites`.
- **Lesson content:** `lessons.content` is a JSON array of typed blocks (heading, paragraph,
  list, callout, code, table, key_terms, video), validated by `src/lib/content/blocks.ts`.
  The future CMS edits this JSON, so nothing is hard-coded in components.
- **Assessment:** `quizzes`, `quiz_questions`, `quiz_question_keys` (answers, admin-only),
  `quiz_attempts`, `exercises`, `exercise_solutions` (admin-only), `projects`,
  `project_submissions`.
- **Learner state:** `enrolments`, `lesson_progress`, `course_progress`, `xp_transactions`,
  `user_streaks`, `achievements`/`user_achievements`, `certificates`.
- **People:** `profiles` (1:1 with `auth.users`, created by trigger), `roles`, `user_roles`.
- **Settings:** `platform_settings` (`enforce_prerequisites`).

### Security model

- RLS is enabled on every table. Learners read only their own state; anonymous visitors see
  only published curriculum; admins (`public.is_admin()`) manage everything.
- Learners **cannot write** progress, XP, streaks, achievements or certificates directly.
  Those change only via `start_lesson()` / `complete_lesson()` (SECURITY DEFINER), which check
  enrolment, publication and prerequisite locks, award XP once per lesson, update the streak
  (in the learner's time zone), recalculate course/path progress and award achievements.
- Profiles: column privileges let learners edit only `display_name`, `username`, `bio`,
  `timezone`. Roles can only be granted by admins.
- Project submissions: a trigger stops learners setting feedback/score or approving themselves.
- Storage: private `learning-resources` (admin upload, signed-in read) and
  `project-submissions` (each user only under `<user id>/…`).
- Admin routes check the role on the server (layout + every server action) and RLS
  enforces it again in the database. `?next=` redirects are restricted to same-site paths.

## What exists today

**Built:** auth (register, sign in/out, email confirmation route, session refresh); public
catalogue and path pages; enrolment; path/course/module/lesson pages with progress, locks,
prev/next navigation and "mark as complete" (XP, streaks, achievements); dashboard; profile
editing; achievements and certificates pages; projects (briefs); admin overview,
prerequisite switch, publish/unpublish for paths/courses/modules/lessons/quizzes/projects,
and a users list; light/dark theme.

**Next phases:** admin CMS editing, quiz engine, graded exercises / SQL environment,
project submissions & review, certificate generation. Not planned yet: payments,
community features.

The static **prototype** (topic quizzes and an in-browser SQL Lab) is still served at
`/prototype/…` and linked from **/practice** until those tools are rebuilt in the platform.
