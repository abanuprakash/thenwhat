"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { acceptInvite } from "@/app/actions";
import { BusyButton } from "@/components/Pending";

export function AcceptInvite({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ status: string; message: string }>();

  if (result) {
    return (
      <div role="status">
        <p className="mb-4 text-sm text-ink">{result.message}</p>
        {result.status === "accepted" && (
          <Link href="/new" className="btn-primary">
            Start your first story
          </Link>
        )}
      </div>
    );
  }
  return (
    <BusyButton className="btn-primary" busy={pending} pendingLabel="Accepting" onClick={() => start(async () => setResult(await acceptInvite(token)))}>
      Accept invite
    </BusyButton>
  );
}
