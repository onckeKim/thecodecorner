import "server-only";

import { notFound } from "next/navigation";

import { requireViewer } from "@/server/auth/session";
import { getPathOutline } from "@/server/curriculum/service";
import type { Enrolment, PathOutline, PathProgress, Viewer } from "@/types/domain";

import { getEnrolment, getPathProgress } from "./service";

export type LearnerPathContext = {
  viewer: Viewer;
  path: PathOutline;
  enrolment: Enrolment | null;
  progress: PathProgress;
  /** Admins may preview without enrolling (for testing content). */
  canStudy: boolean;
};

/** Loads everything a /learn/[pathSlug]/… page needs, or 404s if the path isn't visible. */
export async function loadLearnerPath(pathSlug: string): Promise<LearnerPathContext> {
  const viewer = await requireViewer();
  const path = await getPathOutline(pathSlug);
  if (!path) notFound();
  const [enrolment, progress] = await Promise.all([getEnrolment(viewer.id, path.id), getPathProgress(viewer, path)]);
  return { viewer, path, enrolment, progress, canStudy: !!enrolment || viewer.isAdmin };
}
