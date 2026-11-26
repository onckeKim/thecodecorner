"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPublicEnv, isSupabaseConfigured } from "@/lib/env";
import { routes, safeNextPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/types/domain";

import { fieldErrorsFrom, signInSchema, signUpSchema, type SignInField, type SignUpField } from "./schemas";

const NOT_CONFIGURED: FormState = {
  status: "error",
  message: "Sign-in isn’t available yet: the site isn’t connected to Supabase.",
};

export async function signIn(_prev: FormState<SignInField>, formData: FormData): Promise<FormState<SignInField>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom<SignInField>(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const unconfirmed = error.code === "email_not_confirmed";
    return {
      status: "error",
      message: unconfirmed
        ? "Please confirm your email address first. Check your inbox for the link."
        : "Incorrect email or password.",
    };
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(parsed.data.next));
}

export async function signUp(_prev: FormState<SignUpField>, formData: FormData): Promise<FormState<SignUpField>> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom<SignUpField>(parsed.error) };
  }

  const env = getPublicEnv();
  const next = safeNextPath(parsed.data.next);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${env?.siteUrl ?? ""}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { status: "error", fieldErrors: { password: error.message }, message: "Please choose a stronger password." };
    }
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { status: "error", message: "Too many sign-up attempts right now. Please wait a few minutes and try again." };
    }
    if (error.code === "email_address_invalid") {
      return { status: "error", fieldErrors: { email: "This email address can’t be used. Please try another." }, message: "Please use a different email address." };
    }
    // Server-side log for operators (no password or personal data).
    console.error("[auth] sign-up failed", { code: error.code, status: error.status, message: error.message });
    if (/confirmation email|sending email|smtp/i.test(error.message)) {
      return { status: "error", message: "We couldn’t send your confirmation email. Please try again later." };
    }
    return { status: "error", message: "We couldn’t create your account. Please try again." };
  }

  // With email confirmation disabled, Supabase signs the user in immediately.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }

  // Otherwise (and also when the address is already registered, which Supabase
  // deliberately doesn't reveal) ask the user to check their inbox.
  return {
    status: "success",
    message: `Check ${parsed.data.email} for a confirmation link to activate your account.`,
  };
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect(routes.home);
}
