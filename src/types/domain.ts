import type {
  ContentStatus,
  DifficultyLevel,
  EnrolmentStatus,
  LessonType,
  ProgressStatus,
  TopicTheme,
} from "./database";

/** Platform roles. Stored in public.roles / public.user_roles. */
export type RoleId = "learner" | "admin";

/** The signed-in user as seen by the application. */
export type Viewer = {
  id: string;
  email: string | null;
  displayName: string;
  username: string | null;
  roles: RoleId[];
  isAdmin: boolean;
};

// ---------------------------------------------------------------------------
// Curriculum
// ---------------------------------------------------------------------------
export type PathSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  level: DifficultyLevel | null;
  estimatedHours: number | null;
  icon: string | null;
  courseCount: number;
};

export type LessonOutline = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  lessonType: LessonType;
  estimatedMinutes: number | null;
  xpReward: number;
  sortOrder: number;
  status: ContentStatus;
};

export type ModuleOutline = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  estimatedMinutes: number | null;
  sortOrder: number;
  status: ContentStatus;
  prerequisiteModuleIds: string[];
  lessons: LessonOutline[];
};

export type CourseOutline = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  level: DifficultyLevel | null;
  estimatedHours: number | null;
  icon: string | null;
  theme: TopicTheme | null;
  sortOrder: number;
  status: ContentStatus;
  prerequisiteCourseIds: string[];
  modules: ModuleOutline[];
};

export type PathOutline = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  level: DifficultyLevel | null;
  estimatedHours: number | null;
  icon: string | null;
  status: ContentStatus;
  courses: CourseOutline[];
};

export type LessonDetail = LessonOutline & {
  content: unknown;
  videoUrl: string | null;
};

/** A lesson located within its path, with neighbours for prev/next navigation. */
export type LessonLocation = {
  path: PathOutline;
  course: CourseOutline;
  module: ModuleOutline;
  lesson: LessonOutline;
  previous: LessonLink | null;
  next: LessonLink | null;
};

export type LessonLink = {
  title: string;
  href: string;
};

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------
export type Enrolment = {
  id: string;
  pathId: string;
  status: EnrolmentStatus;
  enrolledAt: string;
  completedAt: string | null;
};

export type LessonState = {
  lessonId: string;
  status: ProgressStatus;
  locked: boolean;
};

export type ModuleState = {
  moduleId: string;
  completedLessons: number;
  totalLessons: number;
  completed: boolean;
  locked: boolean;
};

export type CourseState = {
  courseId: string;
  completedLessons: number;
  totalLessons: number;
  percent: number;
  status: ProgressStatus;
  locked: boolean;
  /** Titles of incomplete prerequisite courses (for "complete X first" messages). */
  blockedBy: string[];
};

export type PathProgress = {
  percent: number;
  completedLessons: number;
  totalLessons: number;
  lessons: Record<string, LessonState>;
  modules: Record<string, ModuleState>;
  courses: Record<string, CourseState>;
  /** The next lesson to study: first incomplete, unlocked lesson in path order. */
  nextLesson: { courseSlug: string; moduleSlug: string; lessonSlug: string; title: string } | null;
};

export type LearningSummary = {
  totalXp: number;
  lessonsCompleted: number;
  coursesCompleted: number;
  currentStreak: number;
  longestStreak: number;
  achievementsEarned: number;
};

export type CompleteLessonResult = {
  alreadyCompleted: boolean;
  xpAwarded: number;
  currentStreak: number;
  courseCompleted: boolean;
  coursePercent: number;
  newAchievements: Array<{ slug: string; title: string; xpReward: number }>;
};

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------
export type FormState<Field extends string = string> = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<Field, string>>;
};

export const initialFormState: FormState = { status: "idle" };
