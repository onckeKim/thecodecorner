"use client";

import { useEffect, type RefObject } from "react";

import type { FormState } from "@/types/domain";

/** After a failed submit, move keyboard focus to the first invalid field. */
export function useFocusFirstError(formRef: RefObject<HTMLFormElement | null>, state: FormState<string>) {
  useEffect(() => {
    if (state.status !== "error" || !state.fieldErrors) return;
    const first = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
    first?.focus();
  }, [state, formRef]);
}
