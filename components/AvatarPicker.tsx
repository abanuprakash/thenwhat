"use client";
import { useRef, useState, useTransition } from "react";
import { applyGooglePhoto, removeAvatar, uploadAvatar } from "@/app/account-actions";
import { Avatar } from "@/components/Avatar";

/** Upload a photo, switch to the Google photo, or go back to initials. */
export function AvatarPicker({ url, handle, hasGooglePhoto }: { url: string | null; handle: string; hasGooglePhoto: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (fn: () => Promise<{ error?: string }>, done: string) =>
    start(async () => {
      setError(undefined);
      setStatus(undefined);
      const res = await fn();
      if (res.error) setError(res.error);
      else setStatus(done);
    });

  return (
    <fieldset className="space-y-3">
      <legend className="eyebrow mb-2">Profile photo</legend>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar url={url} handle={handle} size={64} />
        <div className="flex flex-wrap gap-2">
          <label className="btn-secondary cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold">
            {pending ? "Working…" : "Upload a photo"}
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
                run(() => uploadAvatar(fd), "Photo updated.");
                e.target.value = "";
              }}
            />
          </label>
          {hasGooglePhoto && (
            <button type="button" className="btn-secondary" disabled={pending} onClick={() => run(applyGooglePhoto, "Using your Google photo.")}>
              Use my Google photo
            </button>
          )}
          {url && (
            <button type="button" className="text-xs font-semibold text-faint hover:text-ink" disabled={pending} onClick={() => run(removeAvatar, "Photo removed.")}>
              Remove photo
            </button>
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
