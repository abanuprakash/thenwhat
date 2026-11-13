"use client";
import { useState, useTransition } from "react";
import { adminSetHidden } from "@/app/dashboard-actions";
import { BusyButton } from "@/components/Pending";

export function AdminLineActions({ lineId, hidden }: { lineId: string; hidden: boolean }) {
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<"hide" | "show">();
  const run = (hide: boolean) => {
    setWhich(hide ? "hide" : "show");
    start(async () => void (await adminSetHidden(lineId, hide)));
  };
  return (
    <div className="flex flex-wrap gap-2">
      <BusyButton busy={pending && which === "hide"} disabled={pending} onClick={() => run(true)}>
        Hide line
      </BusyButton>
      <BusyButton busy={pending && which === "show"} disabled={pending} onClick={() => run(false)}>
        {hidden ? "Restore line" : "Keep visible"}
      </BusyButton>
    </div>
  );
}
