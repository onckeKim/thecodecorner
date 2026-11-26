// Unit tests for pure platform logic (no database). Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
const { computePathProgress } = await import("../../src/server/progress/compute.ts");
const { parseContent } = await import("../../src/lib/content/blocks.ts");
const { safeNextPath, isProtectedPath } = await import("../../src/lib/routes.ts");

const lesson = (id: string) => ({ id, slug: id, title: id, summary: null, lessonType: "article", estimatedMinutes: 5, xpReward: 10, sortOrder: 0, status: "published" });
const mod = (id: string, lessons: string[], prereq: string[] = []) => ({ id, slug: id, title: id, summary: null, estimatedMinutes: null, sortOrder: 0, status: "published", prerequisiteModuleIds: prereq, lessons: lessons.map(lesson) });
const course = (id: string, mods: ReturnType<typeof mod>[], prereq: string[] = []) => ({ id, slug: id, title: id.toUpperCase(), summary: null, description: null, level: null, estimatedHours: null, icon: null, theme: null, sortOrder: 0, status: "published", prerequisiteCourseIds: prereq, modules: mods });
const path = { id: "p", slug: "p", title: "P", summary: null, description: null, level: null, estimatedHours: null, icon: null, status: "published",
  courses: [course("c1", [mod("m1", ["l1", "l2"])]), course("c2", [mod("m2", ["l3"])], ["c1"])] };

test("locks the second course until the first is complete", () => {
  const p = computePathProgress(path, new Map([["l1", "completed"]]), { enforcePrerequisites: true, bypassLocks: false });
  assert.equal(p.courses.c2.locked, true);
  assert.deepEqual(p.courses.c2.blockedBy, ["C1"]);
  assert.equal(p.lessons.l3.locked, true);
  assert.equal(p.courses.c1.percent, 50);
  assert.equal(p.nextLesson?.lessonSlug, "l2");
  assert.equal(p.percent, 33);
});
test("unlocks once prerequisites are complete", () => {
  const p = computePathProgress(path, new Map([["l1", "completed"], ["l2", "completed"]]), { enforcePrerequisites: true, bypassLocks: false });
  assert.equal(p.courses.c1.status, "completed");
  assert.equal(p.courses.c2.locked, false);
  assert.equal(p.nextLesson?.lessonSlug, "l3");
});
test("testing mode and admins bypass locks", () => {
  assert.equal(computePathProgress(path, new Map(), { enforcePrerequisites: false, bypassLocks: false }).courses.c2.locked, false);
  assert.equal(computePathProgress(path, new Map(), { enforcePrerequisites: true, bypassLocks: true }).courses.c2.locked, false);
});
test("module prerequisites lock modules", () => {
  const p2 = { ...path, courses: [course("c1", [mod("m1", ["l1"]), mod("m2", ["l2"], ["m1"])])] };
  const p = computePathProgress(p2, new Map(), { enforcePrerequisites: true, bypassLocks: false });
  assert.equal(p.modules.m2.locked, true);
  assert.equal(p.modules.m1.locked, false);
});
test("content parser keeps valid blocks and counts invalid ones", () => {
  const r = parseContent([{ type: "paragraph", text: "hi" }, { type: "script", src: "x" }, { type: "video", title: "v", url: "http://insecure" }, { type: "list", items: ["a"] }]);
  assert.equal(r.blocks.length, 2);
  assert.equal(r.invalidCount, 2);
  assert.equal(r.blocks[1].type === "list" && r.blocks[1].style, "bullet");
  assert.deepEqual(parseContent(null), { blocks: [], invalidCount: 0 });
});
test("safeNextPath blocks open redirects", () => {
  for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "/login", "/auth/confirm", 42, undefined]) assert.equal(safeNextPath(bad), "/dashboard");
  assert.equal(safeNextPath("/learn/data-analyst?x=1"), "/learn/data-analyst?x=1");
});
test("protected route matching", () => {
  assert.equal(isProtectedPath("/learn"), false);
  assert.equal(isProtectedPath("/learn/data-analyst"), true);
  assert.equal(isProtectedPath("/admin/users"), true);
  assert.equal(isProtectedPath("/paths/data-analyst"), false);
  assert.equal(isProtectedPath("/dashboardx"), false);
});
