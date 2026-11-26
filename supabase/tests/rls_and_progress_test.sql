-- RLS & learner-progress test suite.
-- Runs on a plain PostgreSQL database prepared with supabase_stubs.sql + the
-- migration + seed.sql (see supabase/tests/README.md). Every check raises an
-- exception on failure, so the script stops at the first broken rule.

\set ON_ERROR_STOP 1
\set QUIET 1

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create or replace function tests.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;

-- Passes only if the statement raises an error (or affects zero rows when allow_noop).
create or replace function tests.denied(stmt text, label text, allow_noop boolean default false) returns void language plpgsql as $$
declare n integer;
begin
  begin
    execute stmt;
    get diagnostics n = row_count;
  exception when others then
    raise notice 'ok - % (denied: %)', label, sqlerrm;
    return;
  end;
  if allow_noop and n = 0 then
    raise notice 'ok - % (no rows affected)', label;
    return;
  end if;
  raise exception 'FAILED: % (statement succeeded, % rows)', label, n;
end $$;
grant execute on all functions in schema tests to anon, authenticated;

-- Test users ------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test', '{"display_name":"Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.test',   '{}'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.test', '{"display_name":"Ada Admin"}');
insert into public.user_roles (user_id, role_id) values ('00000000-0000-0000-0000-0000000000ad', 'admin');

select tests.ok((select count(*) = 3 from public.profiles), 'signup trigger creates profiles');
select tests.ok((select display_name = 'bob' from public.profiles where email = 'bob@example.test'), 'display name falls back to email prefix');
select tests.ok((select count(*) = 3 from public.user_roles where role_id = 'learner'), 'every new user gets the learner role');

-- Anonymous visitor -----------------------------------------------------------------
begin;
set local role anon;
select tests.ok((select count(*) = 1 from public.learning_paths), 'anon sees the published path');
select tests.ok((select count(*) = 5 from public.courses), 'anon sees published courses');
select tests.ok((select count(*) = 16 from public.lessons), 'anon sees the 16 published lessons');
select tests.ok((select count(*) = 0 from public.lessons where status = 'draft'), 'anon cannot see draft lessons');
select tests.ok((select count(*) = 0 from public.profiles), 'anon cannot read profiles');
select tests.ok((select count(*) = 0 from public.quiz_question_keys), 'anon cannot read quiz answer keys');
select tests.ok((select count(*) = 0 from public.quizzes), 'quizzes require sign-in');
select tests.denied($$update public.lessons set title = 'hacked'$$, 'anon cannot edit lessons', true);
select tests.denied($$select public.complete_lesson((select id from public.lessons limit 1))$$, 'anon cannot call complete_lesson');
commit;

-- Learner Alice ---------------------------------------------------------------------
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select tests.ok((select count(*) = 1 from public.profiles), 'Alice sees only her own profile');
select tests.ok((select count(*) = 1 from public.user_roles), 'Alice sees only her own roles');
select tests.ok(not public.is_admin(), 'Alice is not an admin');

update public.profiles set display_name = 'Alice A.', username = 'alice', bio = 'Learning SQL', timezone = 'Europe/Amsterdam'
 where id = auth.uid();
select tests.ok((select display_name = 'Alice A.' from public.profiles), 'Alice can edit her own profile');
select tests.denied($$update public.profiles set email = 'x@evil.test' where id = auth.uid()$$, 'Alice cannot change the synced email column');
select tests.denied($$update public.profiles set display_name = 'pwned' where email = 'bob@example.test'$$, 'Alice cannot edit Bob''s profile', true);
select tests.denied($$update public.profiles set timezone = 'Mars/Olympus' where id = auth.uid()$$, 'invalid timezone is rejected');
select tests.denied($$insert into public.user_roles (user_id, role_id) values (auth.uid(), 'admin')$$, 'Alice cannot make herself admin');
select tests.denied($$insert into public.lesson_progress (user_id, lesson_id, status, completed_at) select auth.uid(), id, 'completed', now() from public.lessons limit 1$$, 'Alice cannot write lesson progress directly');
select tests.denied($$insert into public.xp_transactions (user_id, amount, source_type) values (auth.uid(), 99999, 'admin_adjustment')$$, 'Alice cannot grant herself XP');
select tests.denied($$insert into public.user_achievements (user_id, achievement_id) select auth.uid(), id from public.achievements limit 1$$, 'Alice cannot award herself achievements');
select tests.denied($$select public.award_xp(auth.uid(), 500, 'lesson', gen_random_uuid(), 'x')$$, 'internal award_xp is not callable');
select tests.denied($$select public.recalculate_course_progress(auth.uid(), (select id from public.courses limit 1))$$, 'internal progress recalculation is not callable');
select tests.denied($$update public.platform_settings set value = 'false'$$, 'Alice cannot change platform settings', true);
select tests.denied($$update public.lessons set status = 'published' where status = 'draft'$$, 'Alice cannot publish lessons', true);

select tests.denied($$select public.complete_lesson((select id from public.lessons where slug = 'what-is-data-analysis'))$$, 'cannot complete a lesson before enrolling');

insert into public.enrolments (path_id) select id from public.learning_paths where slug = 'data-analyst';
select tests.ok((select count(*) = 1 from public.enrolments where user_id = auth.uid()), 'Alice can enrol herself');
select tests.denied($$insert into public.enrolments (user_id, path_id) select '00000000-0000-0000-0000-00000000000b', id from public.learning_paths$$, 'Alice cannot enrol Bob');
select tests.denied($$update public.enrolments set status = 'completed'$$, 'Alice cannot mark her enrolment completed', true);

select tests.ok(public.start_lesson((select id from public.lessons where slug = 'what-is-data-analysis')) = 'in_progress', 'start_lesson marks a lesson in progress');
select tests.ok((select (public.complete_lesson(id) ->> 'xp_awarded')::int = 10 from public.lessons where slug = 'what-is-data-analysis'), 'completing a lesson awards its XP');
select tests.ok((select (public.complete_lesson(id) ->> 'xp_awarded')::int = 0 from public.lessons where slug = 'what-is-data-analysis'), 'completing it again awards no extra XP');
select tests.ok(public.start_lesson((select id from public.lessons where slug = 'what-is-data-analysis')) = 'completed', 'revisiting never downgrades a completed lesson');
select tests.ok((select total_xp = 20 and lessons_completed = 1 and current_streak = 1 and achievements_earned = 1 from public.get_learning_summary()), 'summary: 10 lesson XP + 10 first-lesson achievement XP, streak 1');
select tests.ok((select completed_lessons = 1 and total_lessons = 6 and status = 'in_progress' from public.course_progress), 'course progress counts published lessons only');
select tests.denied($$select public.complete_lesson((select id from public.lessons where slug = 'grouping-and-aggregation'))$$, 'cannot complete a draft lesson');
commit;

-- Prerequisites ------------------------------------------------------------------------
update public.platform_settings set value = 'true' where key = 'enforce_prerequisites';

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select tests.denied($$select public.complete_lesson((select id from public.lessons where slug = 'navigating-workbooks'))$$, 'Excel is locked until Data Fundamentals is complete');
select public.complete_lesson(l.id)
from public.lessons l join public.modules m on m.id = l.module_id join public.courses c on c.id = m.course_id
where c.slug = 'data-fundamentals' order by m.sort_order, l.sort_order;
select tests.ok((select cp.status = 'completed' and cp.percent_complete = 100 from public.course_progress cp join public.courses c on c.id = cp.course_id where c.slug = 'data-fundamentals'), 'Data Fundamentals is complete');
select tests.ok((select (public.complete_lesson(id) ->> 'xp_awarded')::int = 10 from public.lessons where slug = 'navigating-workbooks'), 'Excel unlocks once its prerequisite is complete');
select tests.ok((select count(*) = 3 from public.user_achievements), 'first-lesson, five-lessons and first-course achievements awarded');
select tests.denied($$select public.complete_lesson((select id from public.lessons where slug = 'what-is-sql'))$$, 'SQL course is still locked');
commit;

-- Learner Bob: isolation ---------------------------------------------------------------
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select tests.ok((select count(*) = 0 from public.lesson_progress), 'Bob cannot see Alice''s lesson progress');
select tests.ok((select count(*) = 0 from public.xp_transactions), 'Bob cannot see Alice''s XP');
select tests.ok((select count(*) = 0 from public.enrolments), 'Bob cannot see Alice''s enrolment');
select tests.ok((select count(*) = 0 from public.user_achievements), 'Bob cannot see Alice''s achievements');
select tests.ok((select total_xp = 0 from public.get_learning_summary()), 'Bob''s summary only counts his own XP');
select tests.denied($$delete from public.lesson_progress$$, 'Bob cannot delete anyone''s progress', true);

-- Project submissions
insert into public.project_submissions (project_id, status, submission_url, notes, feedback, score)
select id, 'submitted', 'https://github.com/bob/retail', 'My project', 'Great job!', 100 from public.projects limit 1;
select tests.ok((select feedback is null and score is null and submitted_at is not null from public.project_submissions), 'learners cannot set their own feedback or score');
select tests.denied($$update public.project_submissions set status = 'approved'$$, 'Bob cannot approve his own submission', true);
select tests.denied($$insert into public.project_submissions (project_id, status) select id, 'approved' from public.projects limit 1$$, 'Bob cannot create an approved submission');
commit;

-- Storage ---------------------------------------------------------------------------------
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into storage.objects (bucket_id, name) values ('project-submissions', '00000000-0000-0000-0000-00000000000b/report.pdf');
select tests.denied($$insert into storage.objects (bucket_id, name) values ('project-submissions', '00000000-0000-0000-0000-00000000000a/report.pdf')$$, 'Bob cannot upload into Alice''s folder');
select tests.denied($$insert into storage.objects (bucket_id, name) values ('learning-resources', 'lesson.pdf')$$, 'learners cannot upload learning resources');
commit;

-- Admin ------------------------------------------------------------------------------------
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select tests.ok(public.is_admin(), 'admin is recognised');
select tests.ok((select count(*) = 17 from public.lessons), 'admin sees draft lessons too');
select tests.ok((select count(*) = 3 from public.quiz_question_keys), 'admin can read answer keys');
select tests.ok((select count(*) = 3 from public.profiles), 'admin can list all profiles');
update public.lessons set status = 'published' where slug = 'grouping-and-aggregation';
select tests.ok((select published_at is not null from public.lessons where slug = 'grouping-and-aggregation'), 'publishing stamps published_at');
update public.lessons set status = 'draft' where slug = 'grouping-and-aggregation';
select tests.ok((select (public.complete_lesson(id) ->> 'xp_awarded')::int = 15 from public.lessons where slug = 'filtering-data-with-where'), 'admins bypass locks and enrolment for testing');
commit;

\echo 'ALL RLS & PROGRESS TESTS PASSED'
