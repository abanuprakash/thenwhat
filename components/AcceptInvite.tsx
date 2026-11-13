"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { acceptInvite } from "@/app/actions";
import { BusyButton } from "@/components/Pending";
import { safely } from "@/lib/client-action";
import { FormError } from "@/components/FormError";

export function AcceptInvite({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ status: string; message: string }>();
  const [error, setError] = useState<string>();

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
    <>
    <BusyButton className="btn-primary" busy={pending} pendingLabel="Accepting" onClick={() => start(async () => {
          const res = await safely(() => acceptInvite(token));
          if ("failure" in res) setError(res.error);
          else setResult(res);
        })}>
      Accept invite
    </BusyButton>
    <FormError className="mt-3 text-sm text-red-800">{error}</FormError>
    </>
  );
}
