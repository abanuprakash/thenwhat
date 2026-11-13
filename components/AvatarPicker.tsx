"use client";
import { useRef, useState, useTransition } from "react";
import { applyGooglePhoto, removeAvatar, uploadAvatar } from "@/app/account-actions";
import { Avatar } from "@/components/Avatar";
import { BusyButton, Dots } from "@/components/Pending";

/** Upload a photo, switch to the Google photo, or go back to initials. */
export function AvatarPicker({ url, handle, hasGooglePhoto }: { url: string | null; handle: string; hasGooglePhoto: boolean }) {
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<"upload" | "google" | "remove">();
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (kind: "upload" | "google" | "remove", fn: () => Promise<{ error?: string }>, done: string) => {
    setWhich(kind);
    start(async () => {
      setError(undefined);
      setStatus(undefined);
      const res = await fn();
      if (res.error) setError(res.error);
      else setStatus(done);
    });
  };
  const busy = (kind: typeof which) => pending && which === kind;

  return (
    <fieldset className="space-y-3">
      <legend className="eyebrow mb-2">Profile photo</legend>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar url={url} handle={handle} size={64} />
        <div className="flex flex-wrap gap-2">
          <label
            className={`btn-secondary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold ${pending ? "pointer-events-none" : "cursor-pointer"}`}
            data-busy={busy("upload") || undefined}
            aria-busy={busy("upload") || undefined}
          >
            {busy("upload") ? (
              <span className="inline-flex items-center gap-[6px]">
                Uploading <Dots />
              </span>
            ) : (
              "Upload a photo"
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={pending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.set("avatar", file);
                run("upload", () => uploadAvatar(fd), "Photo updated.");
                e.target.value = "";
              }}
            />
          </label>
          {hasGooglePhoto && (
            <BusyButton busy={busy("google")} disabled={pending} onClick={() => run("google", applyGooglePhoto, "Using your Google photo.")}>
              Use my Google photo
            </BusyButton>
          )}
          {url && (
            <BusyButton
              className="text-xs font-semibold text-faint hover:text-ink"
              busy={busy("remove")}
              disabled={pending}
              onClick={() => run("remove", removeAvatar, "Photo removed.")}
            >
              Remove photo
            </BusyButton>
          )}
        </div>
      </div>
      <p className="text-[11px] text-faint">JPG, PNG, WebP or GIF up to 4 MB. We crop it square and strip hidden details like location.</p>
      {status && (
        <p role="status" className="text-xs text-ink">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-800">
          {error}
        </p>
      )}
    </fieldset>
  );
}
