"use client";
import { useActionState, useState } from "react";
import { updateProfile } from "@/app/account-actions";
import type { FormState } from "@/lib/action-utils";
import { AvatarPicker } from "@/components/AvatarPicker";
import { NativeForm, SubmitButton } from "@/components/Pending";

export function ProfileEditor({
  handle,
  displayName,
  bio,
  avatarUrl,
  hasGooglePhoto,
}: {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  hasGooglePhoto: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(updateProfile, {});
  const fe = state.fieldErrors ?? {};

  return (
    <section className="border-t border-black/[.08] pt-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-secondary" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="profile-editor">
          {open ? "Close" : "Edit profile"}
        </button>
        <NativeForm action="/auth/signout" method="post">
          <SubmitButton className="text-xs font-semibold text-faint hover:text-ink" pendingLabel="Signing out">
            Sign out
          </SubmitButton>
        </NativeForm>
      </div>

      {open && (
        <div id="profile-editor" className="animate-reveal mt-5 space-y-6">
          <AvatarPicker url={avatarUrl} handle={handle} hasGooglePhoto={hasGooglePhoto} />
          <form action={action} className="space-y-4">
            <div>
              <label htmlFor="handle" className="eyebrow mb-2 block">Handle</label>
              <input id="handle" name="handle" defaultValue={handle} maxLength={24} className="field" autoComplete="username" aria-describedby="handle-help" />
              <p id="handle-help" className="mt-1 text-[11px] text-faint">Changing it changes your profile link.</p>
              {fe.handle && <p className="mt-1 text-xs text-red-800">{fe.handle[0]}</p>}
            </div>
            <div>
              <label htmlFor="displayName" className="eyebrow mb-2 block">Name</label>
              <input id="displayName" name="displayName" defaultValue={displayName} maxLength={60} className="field" autoComplete="name" />
              {fe.displayName && <p className="mt-1 text-xs text-red-800">{fe.displayName[0]}</p>}
            </div>
            <div>
              <label htmlFor="bio" className="eyebrow mb-2 block">Bio</label>
              <textarea id="bio" name="bio" defaultValue={bio} maxLength={280} className="field min-h-[90px]" />
            </div>
            <div className="flex items-center gap-3">
              <SubmitButton className="btn-primary" pendingLabel="Saving">
                Save profile
              </SubmitButton>
              {state.ok && <span className="text-xs text-faint" role="status">{state.ok}</span>}
              {state.error && <span className="text-xs text-red-800" role="alert">{state.error}</span>}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
