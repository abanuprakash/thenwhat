"use client";
import { useActionState } from "react";
import { adminSetRole } from "@/app/dashboard-actions";
import type { FormState } from "@/lib/action-utils";
import type { Role } from "@/lib/types";
import { SubmitButton } from "@/components/Pending";
import { guard, useKeepOnError } from "@/lib/client-action";
import { FormError } from "@/components/FormError";

export function RoleSelect({ handle, role, isSelf, idPrefix }: { handle: string; role: Role; isSelf: boolean; idPrefix: string }) {
  const [state, action] = useActionState<FormState, FormData>(guard(adminSetRole), {});
  const keep = useKeepOnError(state);
  const id = `${idPrefix}-role-${handle}`;
  if (isSelf) return <span className="text-xs text-faint">You can&apos;t change your own role</span>;
  return (
    <form action={action} {...keep} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="handle" value={handle} />
      <label htmlFor={id} className="sr-only">
        Role for @{handle}
      </label>
      <select id={id} name="role" defaultValue={role} className="field !w-auto !py-[6px] !text-xs">
        <option value="reader">Reader</option>
        <option value="author">Verified author</option>
        <option value="admin">Admin</option>
      </select>
      <SubmitButton className="btn-secondary !py-[6px]">
        Save
      </SubmitButton>
      {state.ok && (
        <span role="status" className="w-full text-[11px] text-faint">
          {state.ok}
        </span>
      )}
      <FormError className="w-full text-[11px] text-red-800">{state.error}</FormError>
    </form>
  );
}
