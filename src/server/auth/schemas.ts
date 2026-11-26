import { z } from "zod";

/**
 * Password rules shared by registration and password reset. Kept deliberately
 * reasonable: 8+ characters with at least one letter and one number. Supabase Auth
 * hashes and stores the password; the application never stores or logs it.
 */
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "letter", label: "At least one letter", test: (v: string) => /[A-Za-z]/.test(v) },
  { id: "number", label: "At least one number", test: (v: string) => /[0-9]/.test(v) },
] as const;

export const passwordSchema = z
  .string()
  .min(1, "Enter a password.")
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

const email = z.string().trim().min(1, "Enter your email address.").pipe(z.email("Enter a valid email address.").max(254));
const name = (what: string) => z.string().trim().min(1, `Enter your ${what}.`).max(60, "Keep it under 60 characters.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(128),
  next: z.string().optional(),
});

export const signUpSchema = z
  .object({
    firstName: name("first name"),
    lastName: name("last name"),
    email,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
    next: z.string().optional(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don’t match." });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string().min(1, "Confirm your new password.") })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don’t match." });

export type SignInField = "email" | "password" | "next";
export type SignUpField = "firstName" | "lastName" | "email" | "password" | "confirmPassword" | "next";
export type ForgotPasswordField = "email";
export type ResetPasswordField = "password" | "confirmPassword";

/** Flattens zod issues to one message per field. */
export function fieldErrorsFrom<F extends string>(error: z.ZodError): Partial<Record<F, string>> {
  const out: Partial<Record<F, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) out[key as F] = issue.message;
  }
  return out;
}
