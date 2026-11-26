#!/usr/bin/env bash
# Runs the migration, seed and RLS/progress test suite against a throwaway database on
# a plain PostgreSQL server (no Docker or Supabase CLI needed).
#
#   PGHOST=localhost PGPORT=5432 PGUSER=postgres ./scripts/test-db.sh
#
# The target database (default: tcc_test) is dropped and recreated.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${TEST_DB:-tcc_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -d postgres -c "drop database if exists ${DB}" -c "create database ${DB}"
"${PSQL[@]}" -d "$DB" -f supabase/tests/supabase_stubs.sql
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -d "$DB" -f "$f"; done
"${PSQL[@]}" -d "$DB" -f supabase/seed.sql
"${PSQL[@]}" -d "$DB" -o /dev/null -f supabase/tests/rls_and_progress_test.sql 2>&1 | sed 's/^psql:[^ ]* //; s/^NOTICE:  //'
