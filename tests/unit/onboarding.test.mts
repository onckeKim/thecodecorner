// Unit tests for onboarding step/resume logic and password rules. Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

const { currentStep, canVisit, nextStep, previousStep, normaliseTools } = await import("../../src/lib/onboarding/steps.ts");
const { passwordSchema, signUpSchema, resetPasswordSchema } = await import("../../src/server/auth/schemas.ts");

const blank = { started: false, learningGoalId: null, experienceLevelId: null, toolsAnswered: false, weeklyTargetId: null };

test("resumes at the first unanswered step", () => {
  assert.equal(currentStep(null), "welcome");
  assert.equal(currentStep(blank), "welcome");
  assert.equal(currentStep({ ...blank, started: true }), "goal");
  assert.equal(currentStep({ ...blank, started: true, learningGoalId: "learn-sql" }), "experience");
  assert.equal(currentStep({ ...blank, started: true, learningGoalId: "x", experienceLevelId: "new" }), "tools");
  assert.equal(currentStep({ ...blank, started: true, learningGoalId: "x", experienceLevelId: "new", toolsAnswered: true }), "time");
});

test("can go back but not skip ahead", () => {
  const a = { ...blank, started: true, learningGoalId: "x" };
  assert.equal(canVisit("welcome", a), true);
  assert.equal(canVisit("goal", a), true);
  assert.equal(canVisit("experience", a), true);
  assert.equal(canVisit("tools", a), false);
  assert.equal(canVisit("time", a), false);
  assert.equal(nextStep("tools"), "time");
  assert.equal(nextStep("time"), null);
  assert.equal(previousStep("welcome"), null);
  assert.equal(previousStep("goal"), "welcome");
});

test("tool selection rules", () => {
  const valid = ["excel", "sql"];
  assert.deepEqual(normaliseTools(["none"], valid), { ok: true, tools: [] });
  assert.deepEqual(normaliseTools(["excel", "sql", "excel"], valid), { ok: true, tools: ["excel", "sql"] });
  assert.equal(normaliseTools([], valid).ok, false);
  assert.equal(normaliseTools(["none", "excel"], valid).ok, false);
  assert.equal(normaliseTools(["cobol"], valid).ok, false);
});

test("password rules", () => {
  assert.equal(passwordSchema.safeParse("").success, false);
  assert.equal(passwordSchema.safeParse("abc1").success, false);
  assert.equal(passwordSchema.safeParse("abcdefgh").success, false);
  assert.equal(passwordSchema.safeParse("12345678").success, false);
  assert.equal(passwordSchema.safeParse("learning1").success, true);
});

test("registration validation", () => {
  const ok = { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", password: "learning1", confirmPassword: "learning1" };
  assert.equal(signUpSchema.safeParse(ok).success, true);
  const issues = (v: object) => (signUpSchema.safeParse(v).error?.issues ?? []).map((i) => i.path[0]);
  assert.deepEqual(issues({ ...ok, confirmPassword: "learning2" }), ["confirmPassword"]);
  assert.deepEqual(issues({ ...ok, email: "not-an-email" }), ["email"]);
  assert.deepEqual(issues({ ...ok, firstName: "  " }), ["firstName"]);
  assert.equal(resetPasswordSchema.safeParse({ password: "learning1", confirmPassword: "nope" }).success, false);
});
