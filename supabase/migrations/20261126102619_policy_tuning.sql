-- =============================================================================
-- Policy & index tuning (from the Supabase performance advisor)
--
-- 1. Admin "for all" policies duplicated the read policies (which already include
--    `or is_admin()`), so every SELECT evaluated two permissive policies. They are
--    replaced by insert / update / delete policies with the same admin check.
--    Behaviour is unchanged.
-- 2. Index foreign keys to auth.users (created_by, updated_by, …) so deleting a user
--    doesn't need full table scans.
-- =============================================================================

do $$
declare
  t text;
  pol text;
begin
  for t, pol in
    select * from (values
      ('roles', 'admins manage roles'),
      ('platform_settings', 'admins manage settings'),
      ('learning_paths', 'admins manage paths'),
      ('courses', 'admins manage courses'),
      ('course_prerequisites', 'admins manage course prerequisites'),
      ('modules', 'admins manage modules'),
      ('module_prerequisites', 'admins manage module prerequisites'),
      ('lessons', 'admins manage lessons'),
      ('lesson_resources', 'admins manage lesson resources'),
      ('quizzes', 'admins manage quizzes'),
      ('quiz_questions', 'admins manage quiz questions'),
      ('quiz_attempts', 'admins manage quiz attempts'),
      ('exercises', 'admins manage exercises'),
      ('projects', 'admins manage projects'),
      ('project_submissions', 'admins manage submissions'),
      ('enrolments', 'admins manage enrolments'),
      ('lesson_progress', 'admins manage lesson progress'),
      ('course_progress', 'admins manage course progress'),
      ('achievements', 'admins manage achievements'),
      ('user_achievements', 'admins manage user achievements'),
      ('user_streaks', 'admins manage streaks'),
      ('certificates', 'admins manage certificates')
    ) as v(t, pol)
  loop
    execute format('drop policy %I on public.%I', pol, t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))',
                   'admins insert ' || t, t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
                   'admins update ' || t, t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))',
                   'admins delete ' || t, t);
  end loop;
end;
$$;

-- Foreign keys to auth.users without a covering index.
create index learning_paths_created_by_idx       on public.learning_paths (created_by);
create index courses_created_by_idx              on public.courses (created_by);
create index modules_created_by_idx              on public.modules (created_by);
create index lessons_created_by_idx              on public.lessons (created_by);
create index lesson_resources_created_by_idx     on public.lesson_resources (created_by);
create index quizzes_created_by_idx              on public.quizzes (created_by);
create index exercises_created_by_idx            on public.exercises (created_by);
create index projects_created_by_idx             on public.projects (created_by);
create index project_submissions_reviewed_by_idx on public.project_submissions (reviewed_by);
create index platform_settings_updated_by_idx    on public.platform_settings (updated_by);
create index user_roles_granted_by_idx           on public.user_roles (granted_by);
create index xp_transactions_created_by_idx      on public.xp_transactions (created_by);
