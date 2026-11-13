"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { SubmitButton } from "@/components/Pending";
import { SnappedThread } from "@/components/Illustrations";

/**
 * A decision that needs a second look: approve, reject, make inactive, publish.
 *
 * The trigger opens a confirmation that spells out what will happen. It's a centred dialog on wider
 * screens and a bottom sheet on phones (swipe the handle down, tap outside or press Esc to cancel).
 * The dialog sits inside the same <form>, so its confirm button submits the form with every field,
 * shows the loader while sending, and the dialog closes when the form is done.
 *
 * Built on <dialog>.showModal(): focus is trapped inside, Esc works, and the page behind is inert.
 */

export type Outcome = { text: ReactNode; tone?: "plus" | "minus" | "info" };

export function ConfirmButton({
  label,
  className = "btn-primary",
  disabled,
  ariaLabel,
  eyebrow,
  title,
  preview,
  outcomes,
  children,
  confirmLabel,
  confirmClassName = "btn-primary",
  pendingLabel,
  name,
  value,
  caution = false,
  error,
}: {
  label: ReactNode;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  eyebrow?: string;
  title: ReactNode;
  /** What's being decided on, shown as a quote (a line, an opening, a title). */
  preview?: ReactNode;
  /** What will happen. A function gets the form's current values (e.g. a number someone typed). */
  outcomes: Outcome[] | ((form: FormData) => Outcome[]);
  /** Extra fields that belong to the decision (a note, a reason). They're part of the form. */
  children?: ReactNode;
  confirmLabel: ReactNode;
  confirmClassName?: string;
  pendingLabel?: ReactNode;
  name?: string;
  value?: string;
  /** For decisions that take something away: Cancel gets the focus instead of Confirm. */
  caution?: boolean;
  /** The form's error, if the decision didn't go through. The dialog stays open and shows it. */
  error?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<Outcome[]>([]);
  const [closing, setClosing] = useState(false);
  const { pending } = useFormStatus();
  const uid = useId();

  // Show an error only if it came back from a decision made in this dialog.
  const [showError, setShowError] = useState(false);
  const errorRef = useRef(error);
  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  const open = () => {
    setShowError(false);
    const form = triggerRef.current?.form;
    setItems(typeof outcomes === "function" ? outcomes(form ? new FormData(form) : new FormData()) : outcomes);
    setClosing(false);
    dialogRef.current?.showModal();
  };

  // Play the exit, then actually close.
  const close = () => {
    const d = dialogRef.current;
    if (!d?.open || pending) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return d.close();
    setClosing(true);
  };
  const onAnimationEnd = (e: React.AnimationEvent) => {
    if (closing && e.target === e.currentTarget.querySelector(".confirm-panel")) {
      dialogRef.current?.close();
      setClosing(false);
    }
  };

  // When the form finishes sending: close if it worked, stay open with the reason if it didn't.
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && dialogRef.current?.open) {
      if (errorRef.current) setShowError(true);
      else close();
    }
    wasPending.current = pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  // Phone sheet: drag the handle down to dismiss.
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const [dy, setDy] = useState(0);
  const onPointerDown = (e: React.PointerEvent) => {
    if (pending) return;
    drag.current = { y: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y);
    setDy(drag.current.dy);
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    const far = drag.current.dy > 90;
    drag.current = null;
    setDy(0);
    if (far) close();
  };

  return (
    <>
      <button ref={triggerRef} type="button" className={className} disabled={disabled || pending} aria-label={ariaLabel} aria-haspopup="dialog" onClick={open}>
        {label}
      </button>
      <dialog
        ref={dialogRef}
        className="confirm"
        data-closing={closing || undefined}
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-what`}
        onCancel={(e) => {
          e.preventDefault(); // Esc: animate out instead of vanishing
          close();
        }}
        onClick={(e) => e.target === e.currentTarget && close()} // a tap on the backdrop
        onAnimationEnd={onAnimationEnd}
      >
        <div className="confirm-panel" style={dy ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}>
          <div
            className="confirm-handle"
            aria-hidden="true"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <span />
          </div>
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h2 id={`${uid}-title`} className="font-serif text-[22px] font-semibold leading-tight text-ink">
            {title}
          </h2>
          {preview && <blockquote className="mt-3 border-l-2 border-gold-edge pl-3 font-serif text-[15px] leading-relaxed text-muted">{preview}</blockquote>}
          <p className="eyebrow mb-2 mt-5">What happens</p>
          <ul id={`${uid}-what`} className="space-y-2">
            {items.map((o, i) => (
              <li key={i} className="confirm-item flex gap-[10px] text-sm leading-relaxed text-ink" style={{ "--i": i } as React.CSSProperties}>
                <OutcomeMark tone={o.tone ?? "info"} />
                <span>{o.text}</span>
              </li>
            ))}
          </ul>
          {children && <div className="mt-5 space-y-2">{children}</div>}
          {showError && error && (
            <div role="alert" className="confirm-error mt-5 flex items-start gap-3 rounded-[6px] bg-sand p-3">
              <SnappedThread size={36} className="flex-none" />
              <div>
                <p className="font-serif text-[14px] font-semibold text-ink">That didn&apos;t go through</p>
                <p className="text-[13px] leading-relaxed text-muted">{error.replace(/^That didn't reach us: /, "").replace(/^./, (c) => c.toUpperCase())}</p>
              </div>
            </div>
          )}
          <div className="confirm-actions mt-6 flex gap-2">
            <button type="button" className="btn-secondary flex-1 !py-[10px] !text-[13px] desk:flex-none" onClick={close} disabled={pending} autoFocus={caution}>
              Cancel
            </button>
            <SubmitButton name={name} value={value} className={`${confirmClassName} flex-1 !py-[10px] desk:flex-none`} pendingLabel={pendingLabel} autoFocus={!caution}>
              {showError ? "Try again" : confirmLabel}
            </SubmitButton>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** A small mark per outcome: gold plus (something starts), muted minus (something stops), dot (good to know). */
function OutcomeMark({ tone }: { tone: "plus" | "minus" | "info" }) {
  const label = tone === "plus" ? "Happens:" : tone === "minus" ? "Stops:" : "Note:";
  return (
    <span className="mt-[3px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-sand">
      <span className="sr-only">{label}</span>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        {tone === "plus" && <path d="M5 1.5v7M1.5 5h7" className="stroke-gold" strokeWidth="1.6" strokeLinecap="round" />}
        {tone === "minus" && <path d="M1.5 5h7" className="stroke-faint" strokeWidth="1.6" strokeLinecap="round" />}
        {tone === "info" && <circle cx="5" cy="5" r="1.8" className="fill-faint" />}
      </svg>
    </span>
  );
}
