"use client";
import { useEffect, useRef, type FormEvent } from "react";
import { unstable_rethrow } from "next/navigation";
import type { FormState } from "@/lib/action-utils";

/**
 * Calling a Server Action from the browser can fail before the server ever answers: no connection,
 * a dropped connection, a server crash, or a body the server refuses. React would throw that to the
 * nearest error boundary and replace the whole page. These helpers turn it into a message instead.
 *
 * Redirects and notFound() from an action are not failures, so they're passed straight through.
 */

export const FAILURE = {
  offline: "That didn't reach us: you're offline. Nothing was saved, so try again once you're back.",
  dropped: "That didn't reach us: the connection dropped. Nothing was saved, so try again.",
  server: "Something went wrong on our side. Nothing was saved; try again in a moment.",
} as const;

export type FailureKind = keyof typeof FAILURE;

export function failureKind(error: unknown): FailureKind {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  // fetch() rejects with a TypeError when the request never completes.
  if (error instanceof TypeError) return "dropped";
  return "server";
}

/** For actions run in a transition: never throws; returns { error, failure } when the request fails. */
export async function safely<T extends object>(fn: () => Promise<T>): Promise<T | { error: string; failure: FailureKind }> {
  try {
    return await fn();
  } catch (error) {
    unstable_rethrow(error);
    const kind = failureKind(error);
    return { error: FAILURE[kind], failure: kind };
  }
}

type FormAction = (prev: FormState, data: FormData) => Promise<FormState>;
const guarded = new WeakMap<FormAction, FormAction>();

/**
 * For useActionState: wraps a Server Action so a failed request becomes `state.error`.
 * The same action always gets the same wrapper, so it's safe to call during render.
 */
export function guard(action: FormAction): FormAction {
  let wrapped = guarded.get(action);
  if (!wrapped) {
    wrapped = async (prev, data) => {
      try {
        return await action(prev, data);
      } catch (error) {
        unstable_rethrow(error);
        return { error: FAILURE[failureKind(error)] };
      }
    };
    guarded.set(action, wrapped);
  }
  return wrapped;
}

/**
 * React clears a form's fields when its action finishes, even when it failed. That would throw away
 * what someone typed whenever the connection drops or a field needs fixing. Spread the result on the
 * <form> (`<form action={action} {...keep}>`): it remembers what was sent and puts it back if the
 * result is an error. Controlled fields (with useState) don't need it.
 */
export function useKeepOnError(state: { error?: string; fieldErrors?: Record<string, string[] | undefined> }) {
  const ref = useRef<HTMLFormElement>(null);
  const sent = useRef<Map<string, string[]> | null>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const values = new Map<string, string[]>();
    new FormData(e.currentTarget).forEach((v, k) => {
      if (typeof v === "string") values.set(k, [...(values.get(k) ?? []), v]);
    });
    sent.current = values;
  };

  useEffect(() => {
    const form = ref.current;
    const values = sent.current;
    if (!form || !values) return;
    if (!state.error && !state.fieldErrors) {
      sent.current = null;
      return;
    }
    for (const el of Array.from(form.elements)) {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) || !el.name) continue;
      if (el instanceof HTMLInputElement && ["hidden", "file", "submit", "button"].includes(el.type)) continue;
      const v = values.get(el.name);
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) el.checked = !!v?.includes(el.value);
      else if (v) el.value = v[0];
    }
  }, [state]);

  return { ref, onSubmit };
}
