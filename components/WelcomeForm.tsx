"use client";
import { useActionState, useEffect, useState } from "react";
import { checkHandle, completeOnboarding } from "@/app/account-actions";
import type { FormState } from "@/lib/action-utils";
import { BotFields } from "@/components/BotFields";
import { SubmitButton } from "@/components/Pending";
import { guard, useKeepOnError } from "@/lib/client-action";
import { FormError } from "@/components/FormError";
import { InfoTip } from "@/components/InfoTip";

export function WelcomeForm({ handle, displayName, next }: { handle: string; displayName: string; next: string }) {
  const [state, action] = useActionState<FormState, FormData>(guard(completeOnboarding), {});
  const keep = useKeepOnError(state);
  const [value, setValue] = useState(handle);
  // Answers from the server, remembered with the handle they were for.
  const [answer, setAnswer] = useState<{ for: string; result: { available: boolean; message: string } | null } | null>(null);
  const h = value.trim().toLowerCase();
  // Some answers need no server: your own handle, or one that's too short to check yet.
  const local = h === handle ? { available: true, message: `@${h} is yours.` } : h.length < 3 ? null : undefined;
  const needsServer = local === undefined;
  const check = !needsServer ? local : answer?.for === h ? answer.result : null;

  // Ask the server shortly after typing stops.
  useEffect(() => {
    if (!needsServer) return;
    // If the check can't reach us, say nothing: the server checks again when the form is sent.
    const t = setTimeout(async () => {
      try {
        setAnswer({ for: h, result: await checkHandle(h) });
      } catch {
        setAnswer({ for: h, result: null });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [h, needsServer]);

  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} {...keep} className="space-y-5">
      <BotFields />
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="displayName" className="mb-1 block text-sm font-semibold text-ink">
          Your name
        </label>
        <input id="displayName" name="displayName" defaultValue={displayName} maxLength={60} required autoComplete="name" className="field" />
        {fe.displayName && <p className="mt-1 text-xs text-red-800">{fe.displayName[0]}</p>}
      </div>
      <div>
        <div className="mb-1 flex items-center gap-1">
          <label htmlFor="handle" className="text-sm font-semibold text-ink">
            Handle
          </label>
          <InfoTip title="Your @handle" art="profile">
            How people find and mention you, and the address of your profile. Your email is never shown to anyone else.
          </InfoTip>
        </div>
        <p id="handle-help" className="mb-2 text-xs text-faint">
          Your unique name on Then What, like @{value || "yourname"}. 3–24 letters, numbers, dots or underscores.
        </p>
        <div className="flex items-center rounded-[3px] border border-black/15 bg-white focus-within:border-gold focus-within:ring-2 focus-within:ring-cream">
          <span aria-hidden="true" className="pl-3 text-faint">
            @
          </span>
          <input
            id="handle"
            name="handle"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\s/g, "").toLowerCase())}
            maxLength={24}
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby="handle-help handle-status"
            aria-invalid={check && !check.available ? true : undefined}
            className="w-full bg-transparent px-1 py-3 text-base text-ink outline-none"
          />
        </div>
        <p id="handle-status" aria-live="polite" className={`mt-1 min-h-[1.25rem] text-xs ${check?.available ? "text-[#2F5420]" : "text-red-800"}`}>
          {fe.handle?.[0] ?? check?.message ?? ""}
        </p>
      </div>
      <SubmitButton className="btn-primary" disabled={(check !== null && !check.available)} pendingLabel="Saving">
        Start reading
      </SubmitButton>
      <FormError className="text-sm text-red-800">{state.error}</FormError>
    </form>
  );
}
