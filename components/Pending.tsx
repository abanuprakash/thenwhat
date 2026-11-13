"use client";
import { createContext, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type FormHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "@/components/Toast";

/**
 * Loading states for every button in Then What.
 *
 * - <Dots />: the loader. Three dots that rise one after another, an "and then…" that's still being written.
 * - <SubmitButton />: inside any <form>. Disables itself the moment the form is sent, so nothing can be
 *   sent twice, and shows the loader on the button you actually pressed (forms with two submit buttons,
 *   like Approve / Reject, tell them apart by name and value).
 * - <NativeForm />: for plain form posts to a URL (Google sign-in, sign out, search), which React's form
 *   status can't see. It ignores a second submit and lets <SubmitButton /> show the loader.
 * - <BusyButton />: for buttons that run an action in a transition (busy comes from useTransition).
 *
 * The label never changes width: the resting label and the pending label share one grid cell, so the
 * button doesn't jump when the loader appears.
 */

export function Dots({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`dots ${className}`}>
      <span />
      <span />
      <span />
    </span>
  );
}

function Label({ busy, children, pendingLabel }: { busy: boolean; children: ReactNode; pendingLabel?: ReactNode }) {
  return (
    <span className="grid place-items-center">
      <span className={`col-start-1 row-start-1 inline-flex items-center gap-2 ${busy ? "invisible" : ""}`}>{children}</span>
      <span className={`col-start-1 row-start-1 inline-flex items-center gap-[6px] ${busy ? "animate-fade" : "invisible"}`} aria-hidden={!busy}>
        {pendingLabel}
        <Dots />
      </span>
    </span>
  );
}

const NativePending = createContext(false);

/** A plain form post (to a URL rather than a Server Action) that can only be sent once. */
export function NativeForm({ children, onSubmit, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  const [sent, setSent] = useState(false);
  // Coming back with the browser's Back button restores the page as it was: make the form usable again.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => e.persisted && setSent(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  return (
    <form
      {...props}
      aria-busy={sent || undefined}
      onSubmit={(e) => {
        if (sent) return e.preventDefault();
        // Offline: don't send the browser to its error page; stay here and say so.
        if (!navigator.onLine) {
          e.preventDefault();
          toast({ title: "That can't go anywhere yet", body: "You're offline. Try again once you're back; nothing was sent.", art: "offline" });
          return;
        }
        onSubmit?.(e);
        if (!e.defaultPrevented) setSent(true);
      }}
    >
      <NativePending.Provider value={sent}>{children}</NativePending.Provider>
    </form>
  );
}

type SubmitProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & { pendingLabel?: ReactNode };

/**
 * The button only becomes disabled once React re-renders, and clicks can land before that (a fast
 * double tap). So the form is also locked at the moment it's submitted: any further submit is
 * dropped until this one finishes. Registered once per form, whichever SubmitButton mounts first.
 */
const locked = new WeakSet<HTMLFormElement>();
const guardedForms = new WeakSet<HTMLFormElement>();
function lockOnSubmit(form: HTMLFormElement) {
  if (guardedForms.has(form)) return;
  guardedForms.add(form);
  form.addEventListener(
    "submit",
    (e) => {
      // Offline: nothing will be sent, so don't lock (the form shows why it didn't go).
      if (!navigator.onLine) return;
      if (locked.has(form)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      locked.add(form);
      // Safety net: never stay locked if the submit didn't turn into a request (e.g. offline guard).
      setTimeout(() => locked.delete(form), 15000);
    },
    true,
  );
}

export function SubmitButton({ children, pendingLabel, disabled, name, value, className = "btn-primary", ...props }: SubmitProps) {
  const status = useFormStatus();
  const nativeSent = useContext(NativePending);
  const sending = status.pending || nativeSent;
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (ref.current?.form) lockOnSubmit(ref.current.form);
  }, []);
  // When the request finishes, the form can be sent again.
  const wasPending = useRef(false);
  useEffect(() => {
    const form = ref.current?.form;
    if (form && wasPending.current && !status.pending) locked.delete(form);
    wasPending.current = status.pending;
  }, [status.pending]);
  // With several submit buttons, only the one that was pressed shows the loader.
  const mine = sending && (!name || !status.data || status.data.get(name) === String(value ?? ""));
  return (
    <button
      {...props}
      ref={ref}
      type="submit"
      name={name}
      value={value}
      className={className}
      disabled={disabled || sending}
      aria-busy={mine || undefined}
      data-busy={mine || undefined}
    >
      <Label busy={mine} pendingLabel={pendingLabel}>
        {children}
      </Label>
    </button>
  );
}

type BusyProps = ButtonHTMLAttributes<HTMLButtonElement> & { busy: boolean; pendingLabel?: ReactNode };

export function BusyButton({ busy, children, pendingLabel, disabled, onClick, className = "btn-secondary", type = "button", ...props }: BusyProps) {
  return (
    <button
      {...props}
      type={type}
      className={className}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      data-busy={busy || undefined}
      onClick={(e) => {
        if (busy) return e.preventDefault();
        onClick?.(e);
      }}
    >
      <Label busy={busy} pendingLabel={pendingLabel}>
        {children}
      </Label>
    </button>
  );
}
