"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { createInvite } from "@/app/actions";

type Invite = { token: string; invitee: string | null; status: "Joined" | "Pending" | "Expired"; expiresAt: string };

export function InviteManager({ siteUrl, canCreate, invites }: { siteUrl: string; canCreate: boolean; invites: Invite[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState<string>();
  const link = (token: string) => `${siteUrl}/invite/${token}`;
  const latest = invites.find((i) => i.status === "Pending");

  const share = async (token: string) => {
    const url = link(token);
    try {
      if (navigator.share && /Mobi/i.test(navigator.userAgent)) {
        await navigator.share({ title: "Then what? Come write it with me", text: "I saved you a seat on Then What, where stories are written one line at a time.", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(token);
      setTimeout(() => setCopied(undefined), 1500);
    } catch {
      /* the person dismissed the share sheet */
    }
  };

  return (
    <>
      <div className="panel mb-[26px] flex flex-wrap items-center justify-between gap-3 px-5 py-[18px]">
        {latest ? (
          <div className="min-w-0">
            <div className="eyebrow mb-1">Invite link</div>
            <div className="break-all font-mono text-sm font-bold text-ink">{link(latest.token)}</div>
          </div>
        ) : (
          <div className="text-sm text-muted">
            {canCreate ? "Create a link and send it to someone you'd like to write with." : "All your invite slots are in use."}
          </div>
        )}
        <div className="flex gap-2">
          {latest && (
            <button type="button" className="btn-primary" onClick={() => share(latest.token)}>
              {copied === latest.token ? "Copied!" : "Copy link"}
            </button>
          )}
          {canCreate && (
            <button
              type="button"
              className={latest ? "btn-secondary" : "btn-primary"}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await createInvite();
                  if (res.error) setError(res.error);
                  else if (res.token) await share(res.token);
                })
              }
            >
              {pending ? "Creating…" : "New invite link"}
            </button>
          )}
        </div>
        {error && <p role="alert" className="w-full text-xs text-red-800">{error}</p>}
      </div>

      <h2 className="eyebrow mb-[10px]">People you&apos;ve invited</h2>
      {invites.length === 0 && <p className="py-3 text-sm text-faint">No invites yet.</p>}
      <ul>
        {invites.map((i) => (
          <li key={i.token} className="flex items-center justify-between border-b border-black/[.06] py-3">
            <span className="text-sm font-medium text-ink">
              {i.invitee ? <Link href={`/u/${i.invitee}`}>@{i.invitee}</Link> : <span className="font-mono text-xs text-faint">…{i.token.slice(-6)}</span>}
            </span>
            <span className="flex items-center gap-3">
              {i.status === "Pending" && (
                <button type="button" className="text-xs font-semibold text-gold hover:text-gold-dark" onClick={() => share(i.token)}>
                  {copied === i.token ? "Copied!" : "Copy"}
                </button>
              )}
              <span className={i.status === "Joined" ? "badge-gold" : "badge-muted"}>{i.status}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-faint">Links expire after 7 days. An expired, unused link frees its slot.</p>
    </>
  );
}
