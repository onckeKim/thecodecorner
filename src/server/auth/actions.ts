"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPublicEnv, isSupabaseConfigured } from "@/lib/env";
import { routes, safeNextPath } from "@/lib/routes";
import { createClient, type ServerSupabaseClient } from "@/lib/supabase/server";
import type { FormState } from "@/types/domain";

import {
  fieldErrorsFrom,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type ForgotPasswordField,
  type ResetPasswordField,
  type SignInField,
  type SignUpField,
} from "./schemas";

/*
 * Authentication actions. All run on the server; Supabase Auth owns password storage
 * (passwords are never logged or written to the application database). Supabase error
 * messages are translated into plain-language messages for learners.
 */

const NOT_CONFIGURED = {
  status: "error",
  message: "Sign-in isn’t available yet: the site isn’t connected to Supabase.",
} as const;

const RATE_LIMITED = "Too many attempts right now. Please wait a few minutes and try again.";
const NETWORK = "We couldn’t reach the sign-in service. Check your connection and try again.";

function siteUrl(): string {
  return getPublicEnv()?.siteUrl ?? "";
}

function confirmUrl(next: string): string {
  return `${siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`;
}

function isRateLimit(error: { code?: string; status?: number }) {
  return error.status === 429 || (error.code ?? "").startsWith("over_");
}

function isNetwork(error: { name?: string; status?: number }) {
  return error.name === "AuthRetryableFetchError" || error.status === 0;
}

/** Decides where a freshly signed-in user goes (see destinationFor in session.ts). */
async function postSignInPath(supabase: ServerSupabaseClient, userId: string, next?: string): Promise<string> {
  await supabase.rpc("ensure_profile"); // idempotent; guarantees profile + learner role exist
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("onboarding_completed").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role_id").eq("user_id", userId),
  ]);
  const isAdmin = (roles ?? []).some((r) => r.role_id === "admin");
  const target = next ? safeNextPath(next, "") : "";
  if (!profile?.onboarding_completed && !isAdmin) return routes.onboarding;
  if (target) return target;
  return isAdmin ? routes.admin : routes.dashboard;
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------
export async function signIn(_prev: FormState<SignInField>, formData: FormData): Promise<FormState<SignInField>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const raw = Object.fromEntries(formData);
  const values = { email: typeof raw.email === "string" ? raw.email : "" };
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom<SignInField>(parsed.error), values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });

  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      return {
        status: "error",
        message: "Please confirm your email address first. Check your inbox for the confirmation link.",
        link: { href: `${routes.register}?resend=${encodeURIComponent(parsed.data.email)}`, label: "Resend the confirmation email" },
        values,
      };
    }
    if (error && isRateLimit(error)) return { status: "error", message: RATE_LIMITED, values };
    if (error && isNetwork(error)) return { status: "error", message: NETWORK, values };
    return {
      status: "error",
      message: "Incorrect email or password.",
      link: { href: routes.forgotPassword, label: "Forgotten your password?" },
      values,
    };
  }

  const destination = await postSignInPath(supabase, data.user.id, parsed.data.next);
  revalidatePath("/", "layout");
  redirect(destination);
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
export async function signUp(_prev: FormState<SignUpField>, formData: FormData): Promise<FormState<SignUpField>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const raw = Object.fromEntries(formData);
  const str = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "");
  const values = { firstName: str("firstName"), lastName: str("lastName"), email: str("email") };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom<SignUpField>(parsed.error), values };
  }
  const { firstName, lastName, email, password } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Stored in auth.users metadata and copied to the profile by the sign-up trigger.
      data: { first_name: firstName, last_name: lastName, display_name: `${firstName} ${lastName}` },
      emailRedirectTo: confirmUrl(routes.onboarding),
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return {
        status: "error",
        message: "An account with this email address already exists.",
        fieldErrors: { email: "This email address is already registered." },
        link: { href: `${routes.login}?email=${encodeURIComponent(email)}`, label: "Sign in instead" },
        values,
      };
    }
    if (error.code === "weak_password") {
      return { status: "error", message: "Please choose a stronger password.", fieldErrors: { password: "This password is too weak or too common." }, values };
    }
    if (error.code === "email_address_invalid") {
      return { status: "error", message: "Please use a different email address.", fieldErrors: { email: "This email address can’t be used." }, values };
    }
    if (error.code === "signup_disabled") {
      return { status: "error", message: "New registrations are currently closed.", values };
    }
    if (isRateLimit(error)) return { status: "error", message: RATE_LIMITED, values };
    if (isNetwork(error)) return { status: "error", message: NETWORK, values };
    // Operator log without personal data or passwords.
    console.error("[auth] sign-up failed", { code: error.code, status: error.status });
    if (/confirmation email|sending email|smtp/i.test(error.message)) {
      return { status: "error", message: "Your account couldn’t be created because the confirmation email failed to send. Please try again later.", values };
    }
    return { status: "error", message: "We couldn’t create your account. Please try again.", values };
  }

  // Email confirmation disabled: Supabase signs the user in straight away.
  if (data.session && data.user) {
    revalidatePath("/", "layout");
    redirect(routes.onboarding);
  }

  // Email confirmation enabled. Supabase returns the same response for an address that
  // is already registered (no identities), deliberately not revealing that it exists.
  return {
    status: "success",
    message: `We’ve sent a confirmation link to ${email}. Open it to activate your account, then you’ll continue to onboarding.`,
    values: { email },
  };
}

/** Re-sends the sign-up confirmation email. Always answers the same way (no account probing). */
export async function resendConfirmation(_prev: FormState<"email">, formData: FormData): Promise<FormState<"email">> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom<"email">(parsed.error), message: "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: confirmUrl(routes.onboarding) },
  });
  if (error && isRateLimit(error)) return { status: "error", message: RATE_LIMITED, values: { email: parsed.data.email } };
  return {
    status: "success",
    message: "If that address has an unconfirmed account, a new confirmation link is on its way.",
    values: { email: parsed.data.email },
  };
}

// ---------------------------------------------------------------------------
// Forgotten password
// ---------------------------------------------------------------------------
export async function requestPasswordReset(
  _prev: FormState<ForgotPasswordField>,
  formData: FormData,
): Promise<FormState<ForgotPasswordField>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")) : "";
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted field.", fieldErrors: fieldErrorsFrom<ForgotPasswordField>(parsed.error), values: { email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: confirmUrl(routes.resetPassword),
  });

  if (error) {
    if (isRateLimit(error)) return { status: "error", message: RATE_LIMITED, values: { email } };
    if (isNetwork(error)) return { status: "error", message: NETWORK, values: { email } };
    console.error("[auth] password reset request failed", { code: error.code, status: error.status });
  }
  // Same response whether or not the address is registered.
  return {
    status: "success",
    message: `If an account exists for ${parsed.data.email}, we’ve sent a link to reset your password. The link expires after a short time.`,
  };
}

// ---------------------------------------------------------------------------
// Reset password (after following the emailed link, which creates a recovery session)
// ---------------------------------------------------------------------------
export async function updatePassword(
  _prev: FormState<ResetPasswordField>,
  formData: FormData,
): Promise<FormState<ResetPasswordField>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom<ResetPasswordField>(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      message: "Your password reset link has expired or was already used.",
      link: { href: routes.forgotPassword, label: "Request a new link" },
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { status: "error", message: "Please choose a new password.", fieldErrors: { password: "Your new password must be different from the old one." } };
    }
    if (error.code === "weak_password") {
      return { status: "error", message: "Please choose a stronger password.", fieldErrors: { password: "This password is too weak or too common." } };
    }
    if (error.code === "session_not_found" || error.code === "session_expired" || error.status === 401 || error.status === 403) {
      return { status: "error", message: "Your password reset link has expired.", link: { href: routes.forgotPassword, label: "Request a new link" } };
    }
    if (isRateLimit(error)) return { status: "error", message: RATE_LIMITED };
    console.error("[auth] password update failed", { code: error.code, status: error.status });
    return { status: "error", message: "We couldn’t update your password. Please try again." };
  }

  // End every session (including the recovery session) so the new password is used everywhere.
  await supabase.auth.signOut({ scope: "global" });
  revalidatePath("/", "layout");
  redirect(`${routes.login}?reset=success`);
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect(`${routes.login}?signed_out=1`);
}
