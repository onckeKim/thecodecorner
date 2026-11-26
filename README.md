# The Code Corner

An online IT learning platform: structured **learning paths → courses → modules → lessons**, with
progress tracking, XP, streaks and achievements. The first path is **Data Analyst**; the
architecture supports any number of paths.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, RLS) · deployable to Vercel.

**Status:** Phase 1 (platform foundation) and Phase 2 (authentication & learner onboarding) are complete. See [What exists today](#what-exists-today).

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
| `npm run test:db` | Migrations + seed + 83 RLS/progress/onboarding checks on a plain PostgreSQL server ([details](supabase/tests/README.md)) |
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
3. **Auth settings** (Dashboard → Authentication). See [Authentication setup](#authentication-setup) below.
4. **Make yourself an admin** after registering through the site:
   ```sql
   insert into public.user_roles (user_id, role_id)
   select id, 'admin' from auth.users where email = 'you@example.com';
   ```
5. When the real curriculum is ready, turn prerequisites back on from **/admin** (or
   `update platform_settings set value = 'true' where key = 'enforce_prerequisites';`).

## Authentication setup

**URL Configuration** (Authentication → URL Configuration)
- Site URL: your production URL (e.g. `https://thecodecorner.example`), or `http://localhost:3000` while developing.
- Redirect URLs: add `http://localhost:3000/**` and `https://<your-domain>/**`. Email links come back to
  `/auth/confirm?next=…`, and the wildcard also allows those query strings.

**Email confirmation** (Authentication → Providers → Email): "Confirm email" is **on** for this project, and the
app supports it. Learners confirm, then go straight to onboarding. With it off, they go straight to onboarding
after registering.

**Email delivery:** Supabase's built-in mailer is rate-limited to a handful of emails per hour for the whole
project. That's fine for testing, not for launch. Set up custom SMTP (Authentication → Emails → SMTP settings;
e.g. Resend, Postmark, Amazon SES) and raise the email rate limit (Authentication → Rate Limits).

**Email templates (recommended):** the default templates work when the learner opens the link in the same
browser they registered in. To make links work in *any* browser or device, change the link in these templates
(Authentication → Emails → Templates):
- *Confirm signup*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding`
- *Reset password*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`

### Flows

| Flow | Path |
| --- | --- |
| Register | `/register` (first name, last name, email, password ×2) → "check your inbox" (or straight to onboarding if confirmation is off). Resend link available. |
| Confirm email | email link → `/auth/confirm` → profile ensured (idempotent) → `/onboarding` (or dashboard if already onboarded) |
| Sign in | `/login` → learner not onboarded → `/onboarding`; learner → `/dashboard` (or the page they asked for); admin → `/admin` |
| Forgot password | `/forgot-password` → same reply whether or not the email exists → email link → `/auth/confirm` → `/reset-password` → new password → **signed out everywhere** → `/login?reset=success` |
| Sign out | account menu → session ended → `/login?signed_out=1`; protected pages (and the back button) redirect to sign-in |
| Onboarding | `/onboarding` → welcome → goal → experience → tools → weekly time → enrolled in Data Analyst → `/dashboard?welcome=1`. Answers are saved per step; returning learners resume where they stopped. |

Sessions live in HTTP-only cookies (`@supabase/ssr`), are refreshed by `src/proxy.ts` on each request and
verified server-side with `auth.getUser()`. Nothing in `localStorage` is trusted for auth.

## Architecture

```
src/
  app/                    Routes only (thin). Data comes from src/server/*
    (auth)/login|register|forgot-password|reset-password   Auth pages
    onboarding/[step]       Learner onboarding (welcome, goal, experience, tools, time)
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
    auth/                   Session/viewer, destination logic, guards, sign-in/up/out + password reset actions
    onboarding/             Onboarding options, answers, resume state and step actions
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
- **People:** `profiles` (1:1 with `auth.users`, created by trigger; first/last name, onboarding status),
  `roles`, `user_roles`. Roles are never stored on profiles, so profile edits can't change them.
- **Onboarding:** `learner_preferences` (goal, experience level, weekly target), `learner_tools`, and the option
  tables `learning_goals`, `experience_levels`, `tools`, `weekly_learning_targets` (add rows to add options).
  `complete_onboarding()` marks onboarding complete and enrols the learner in the path named by
  `platform_settings.default_learning_path` (Data Analyst), exactly once.
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

**Built:** full auth lifecycle (register, email confirmation, sign in/out, forgotten/reset password,
expired-session handling); five-step resumable onboarding with Data Analyst enrolment; public
catalogue and path pages; enrolment; path/course/module/lesson pages with progress, locks,
prev/next navigation and "mark as complete" (XP, streaks, achievements); dashboard; profile
editing; achievements and certificates pages; projects (briefs); admin overview,
prerequisite switch, publish/unpublish for paths/courses/modules/lessons/quizzes/projects,
and a users list; light/dark theme.

**Next phases:** learner dashboard (Phase 3), admin CMS editing, quiz engine, graded exercises / SQL environment,
project submissions & review, certificate generation. Not planned yet: payments,
community features.

The static **prototype** (topic quizzes and an in-browser SQL Lab) is still served at
`/prototype/…` and linked from **/practice** until those tools are rebuilt in the platform.
