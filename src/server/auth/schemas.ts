import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(128),
  next: z.string().optional(),
});

export const signUpSchema = z
  .object({
    displayName: z.string().trim().min(1, "Tell us what to call you.").max(80, "Keep it under 80 characters."),
    email: z.email("Enter a valid email address.").max(254),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(128, "Use at most 128 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string(),
    next: z.string().optional(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don’t match.",
  });

export type SignInField = keyof z.infer<typeof signInSchema>;
export type SignUpField = "displayName" | "email" | "password" | "confirmPassword" | "next";

/** Flattens zod issues to one message per field. */
export function fieldErrorsFrom<F extends string>(error: z.ZodError): Partial<Record<F, string>> {
  const out: Partial<Record<F, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) out[key as F] = issue.message;
  }
  return out;
}
