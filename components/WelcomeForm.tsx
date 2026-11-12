"use client";
import { useActionState, useEffect, useState } from "react";
import { checkHandle, completeOnboarding } from "@/app/account-actions";
import type { FormState } from "@/lib/action-utils";
import { BotFields } from "@/components/BotFields";

export function WelcomeForm({ handle, displayName, next }: { handle: string; displayName: string; next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(completeOnboarding, {});
  const [value, setValue] = useState(handle);
  const [check, setCheck] = useState<{ available: boolean; message: string } | null>(null);

  // Check availability shortly after typing stops.
  useEffect(() => {
    const h = value.trim().toLowerCase();
    if (h === handle) {
      setCheck({ available: true, message: `@${h} is yours.` });
      return;
    }
    if (h.length < 3) {
      setCheck(null);
      return;
    }
    const t = setTimeout(async () => setCheck(await checkHandle(h)), 450);
    return () => clearTimeout(t);
  }, [value, handle]);

  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5">
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
        <label htmlFor="handle" className="mb-1 block text-sm font-semibold text-ink">
          Handle
        </label>
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
      <button type="submit" className="btn-primary" disabled={pending || (check !== null && !check.available)}>
        {pending ? "Saving…" : "Start reading"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-red-800">
          {state.error}
        </p>
      )}
    </form>
  );
}
