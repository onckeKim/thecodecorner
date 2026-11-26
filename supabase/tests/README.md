# Database tests

`rls_and_progress_test.sql` checks the security and business rules of the migration with
three simulated users (two learners and an admin) plus anonymous access. It runs **60 checks**,
including that:

- learners can't read each other's data, grant themselves XP/achievements/admin, or write
  progress directly;
- `complete_lesson()` requires enrolment, awards XP once, updates streaks, course progress
  and achievements;
- prerequisites lock later courses until earlier ones are complete (and admins bypass them);
- drafts are hidden, answer keys are admin-only, and storage folders are per-user.

## Running

These tests need only a plain PostgreSQL 15+ server (no Docker or Supabase CLI).
`supabase_stubs.sql` provides minimal stand-ins for Supabase's `auth` and `storage` schemas
and API roles. **Never run the stubs against a real Supabase project.**

```bash
PGHOST=localhost PGPORT=5432 PGUSER=postgres npm run test:db
```

The script recreates a throwaway database (`tcc_test`, override with `TEST_DB=…`), applies
the stubs, every migration and the seed, then runs the suite. It stops at the first failing
check.
