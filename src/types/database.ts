/**
 * Database types for the Supabase client.
 *
 * Mirrors supabase/migrations/20261126120000_platform_foundation.sql in the same
 * shape as `supabase gen types typescript`. Once the project is linked, these can be
 * regenerated with:
 *   npx supabase gen types typescript --linked --schema public > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ContentStatus = "draft" | "published" | "archived";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type LessonType = "article" | "video" | "exercise" | "quiz" | "project";
export type ProgressStatus = "not_started" | "in_progress" | "completed";
export type EnrolmentStatus = "active" | "completed" | "withdrawn";
export type QuestionType = "single_choice" | "multiple_choice" | "true_false" | "short_answer";
export type ExerciseType = "sql" | "excel" | "dax" | "power_bi" | "python" | "general";
export type SubmissionStatus = "draft" | "submitted" | "under_review" | "changes_requested" | "approved";
export type XpSource = "lesson" | "quiz" | "exercise" | "project" | "achievement" | "streak" | "admin_adjustment";
export type TopicTheme = "sql" | "powerbi" | "excel" | "dax" | "model";

type Timestamps = { created_at: string; updated_at: string };
type Publishable = { status: ContentStatus; published_at: string | null; sort_order: number };

/** Builds a table definition. Insert omits defaulted/generated columns via `Optional`. */
type TableDef<Row, Required extends keyof Row, Optional extends keyof Row = Exclude<keyof Row, Required>> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Pick<Row, Optional>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type RoleRow = { id: string; name: string; description: string | null; created_at: string };

export type ProfileRow = Timestamps & {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
};

export type UserRoleRow = { user_id: string; role_id: string; granted_at: string; granted_by: string | null };

export type PlatformSettingRow = {
  key: string;
  value: Json;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
};

export type LearningPathRow = Timestamps &
  Publishable & {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    description: string | null;
    level: DifficultyLevel | null;
    estimated_hours: number | null;
    icon: string | null;
    created_by: string | null;
  };

export type CourseRow = Timestamps &
  Publishable & {
    id: string;
    path_id: string;
    slug: string;
    title: string;
    summary: string | null;
    description: string | null;
    level: DifficultyLevel | null;
    estimated_hours: number | null;
    icon: string | null;
    theme: TopicTheme | null;
    created_by: string | null;
  };

export type CoursePrerequisiteRow = { course_id: string; required_course_id: string; created_at: string };
export type ModulePrerequisiteRow = { module_id: string; required_module_id: string; created_at: string };

export type ModuleRow = Timestamps &
  Publishable & {
    id: string;
    course_id: string;
    slug: string;
    title: string;
    summary: string | null;
    estimated_minutes: number | null;
    created_by: string | null;
  };

export type LessonRow = Timestamps &
  Publishable & {
    id: string;
    module_id: string;
    slug: string;
    title: string;
    summary: string | null;
    lesson_type: LessonType;
    content: Json;
    video_url: string | null;
    estimated_minutes: number | null;
    xp_reward: number;
    created_by: string | null;
  };

export type LessonResourceRow = Timestamps & {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  resource_type: "file" | "link";
  storage_path: string | null;
  external_url: string | null;
  sort_order: number;
  created_by: string | null;
};

export type QuizRow = Timestamps &
  Publishable & {
    id: string;
    lesson_id: string | null;
    module_id: string | null;
    title: string;
    description: string | null;
    pass_mark_percent: number;
    time_limit_seconds: number | null;
    max_attempts: number | null;
    xp_reward: number;
    created_by: string | null;
  };

export type QuizQuestionRow = Timestamps & {
  id: string;
  quiz_id: string;
  question_type: QuestionType;
  prompt: string;
  code: Json | null;
  options: Json;
  hint: string | null;
  points: number;
  sort_order: number;
};

export type QuizAttemptRow = {
  id: string;
  user_id: string;
  quiz_id: string;
  answers: Json;
  score: number | null;
  max_score: number | null;
  percent: number | null;
  passed: boolean | null;
  started_at: string;
  submitted_at: string | null;
  created_at: string;
};

export type ExerciseRow = Timestamps &
  Publishable & {
    id: string;
    lesson_id: string | null;
    title: string;
    exercise_type: ExerciseType;
    instructions: Json;
    starter_code: string | null;
    dataset: string | null;
    level: DifficultyLevel | null;
    xp_reward: number;
    created_by: string | null;
  };

export type ProjectRow = Timestamps &
  Publishable & {
    id: string;
    path_id: string;
    course_id: string | null;
    slug: string;
    title: string;
    summary: string | null;
    brief: Json;
    level: DifficultyLevel | null;
    estimated_hours: number | null;
    xp_reward: number;
    created_by: string | null;
  };

export type ProjectSubmissionRow = Timestamps & {
  id: string;
  project_id: string;
  user_id: string;
  status: SubmissionStatus;
  submission_url: string | null;
  notes: string | null;
  storage_path: string | null;
  feedback: string | null;
  score: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
};

export type EnrolmentRow = {
  id: string;
  user_id: string;
  path_id: string;
  status: EnrolmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  updated_at: string;
};

export type LessonProgressRow = {
  id: string;
  user_id: string;
  lesson_id: string;
  status: ProgressStatus;
  started_at: string;
  completed_at: string | null;
  last_viewed_at: string;
  updated_at: string;
};

export type CourseProgressRow = {
  user_id: string;
  course_id: string;
  completed_lessons: number;
  total_lessons: number;
  percent_complete: number;
  status: ProgressStatus;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export type AchievementRow = Timestamps & {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
  criteria: Json;
  sort_order: number;
  status: ContentStatus;
  published_at: string | null;
};

export type UserAchievementRow = { user_id: string; achievement_id: string; awarded_at: string };

export type XpTransactionRow = {
  id: string;
  user_id: string;
  amount: number;
  source_type: XpSource;
  source_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
};

export type UserStreakRow = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  updated_at: string;
};

export type CertificateRow = {
  id: string;
  user_id: string;
  path_id: string | null;
  course_id: string | null;
  certificate_number: string;
  verification_code: string;
  storage_path: string | null;
  issued_at: string;
  created_at: string;
};

export type LearningSummaryRow = {
  total_xp: number;
  lessons_completed: number;
  courses_completed: number;
  current_streak: number;
  longest_streak: number;
  achievements_earned: number;
};

export type Database = {
  public: {
    Tables: {
      roles: TableDef<RoleRow, "id" | "name">;
      profiles: TableDef<ProfileRow, "id">;
      user_roles: TableDef<UserRoleRow, "user_id" | "role_id">;
      platform_settings: TableDef<PlatformSettingRow, "key" | "value">;
      learning_paths: TableDef<LearningPathRow, "slug" | "title">;
      courses: TableDef<CourseRow, "path_id" | "slug" | "title">;
      course_prerequisites: TableDef<CoursePrerequisiteRow, "course_id" | "required_course_id">;
      modules: TableDef<ModuleRow, "course_id" | "slug" | "title">;
      module_prerequisites: TableDef<ModulePrerequisiteRow, "module_id" | "required_module_id">;
      lessons: TableDef<LessonRow, "module_id" | "slug" | "title">;
      lesson_resources: TableDef<LessonResourceRow, "lesson_id" | "title" | "resource_type">;
      quizzes: TableDef<QuizRow, "title">;
      quiz_questions: TableDef<QuizQuestionRow, "quiz_id" | "prompt">;
      quiz_attempts: TableDef<QuizAttemptRow, "user_id" | "quiz_id">;
      exercises: TableDef<ExerciseRow, "title">;
      projects: TableDef<ProjectRow, "path_id" | "slug" | "title">;
      project_submissions: TableDef<ProjectSubmissionRow, "project_id">;
      enrolments: TableDef<EnrolmentRow, "path_id">;
      lesson_progress: TableDef<LessonProgressRow, "user_id" | "lesson_id">;
      course_progress: TableDef<CourseProgressRow, "user_id" | "course_id">;
      achievements: TableDef<AchievementRow, "slug" | "title" | "criteria">;
      user_achievements: TableDef<UserAchievementRow, "user_id" | "achievement_id">;
      xp_transactions: TableDef<XpTransactionRow, "user_id" | "amount" | "source_type">;
      user_streaks: TableDef<UserStreakRow, "user_id">;
      certificates: TableDef<CertificateRow, "user_id" | "certificate_number">;
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      start_lesson: { Args: { p_lesson_id: string }; Returns: ProgressStatus };
      complete_lesson: { Args: { p_lesson_id: string }; Returns: Json };
      get_learning_summary: { Args: Record<PropertyKey, never>; Returns: LearningSummaryRow[] };
    };
    Enums: {
      content_status: ContentStatus;
      difficulty_level: DifficultyLevel;
      lesson_type: LessonType;
      progress_status: ProgressStatus;
      enrolment_status: EnrolmentStatus;
      question_type: QuestionType;
      exercise_type: ExerciseType;
      submission_status: SubmissionStatus;
      xp_source: XpSource;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
