"use client";
import { useState, useTransition } from "react";
import { adminSetHidden } from "@/app/dashboard-actions";
import { BusyButton } from "@/components/Pending";
import { safely } from "@/lib/client-action";
import { FormError } from "@/components/FormError";

export function AdminLineActions({ lineId, hidden }: { lineId: string; hidden: boolean }) {
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<"hide" | "show">();
  const [error, setError] = useState<string>();
  const run = (hide: boolean) => {
    setWhich(hide ? "hide" : "show");
    setError(undefined);
    start(async () => {
      const res = await safely(() => adminSetHidden(lineId, hide));
      if (res && "error" in res && res.error) setError(res.error);
    });
  };
  return (
    <div className="flex flex-wrap gap-2">
      <BusyButton busy={pending && which === "hide"} disabled={pending} onClick={() => run(true)}>
        Hide line
      </BusyButton>
      <BusyButton busy={pending && which === "show"} disabled={pending} onClick={() => run(false)}>
        {hidden ? "Restore line" : "Keep visible"}
      </BusyButton>
      <FormError className="w-full text-xs text-red-800">{error}</FormError>
    </div>
  );
}
