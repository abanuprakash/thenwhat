"use client";
import { useTransition } from "react";
import { adminSetHidden } from "@/app/dashboard-actions";

export function AdminLineActions({ lineId, hidden }: { lineId: string; hidden: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={pending} className="btn-secondary" onClick={() => start(async () => void (await adminSetHidden(lineId, true)))}>
        Hide line
      </button>
      <button type="button" disabled={pending} className="btn-secondary" onClick={() => start(async () => void (await adminSetHidden(lineId, false)))}>
        {hidden ? "Restore line" : "Keep visible"}
      </button>
    </div>
  );
}
