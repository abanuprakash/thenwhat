"use client";
import { useActionState, useState } from "react";
import { updateSettings } from "@/app/dashboard-actions";
import type { FormState } from "@/lib/action-utils";
import type { Settings } from "@/lib/types";
import { SubmitButton } from "@/components/Pending";
import { guard, useKeepOnError } from "@/lib/client-action";
import { FormError } from "@/components/FormError";

/** A, A1, A2, A11… the way the rules shape a story, for the preview. */
function previewLevels(branches: number | null, depth: number | null) {
  const b = Math.min(branches ?? 3, 3);
  const d = Math.min(depth ?? 4, 4);
  const levels: string[][] = [["A"]];
  for (let i = 1; i < d; i++) {
    const next: string[] = [];
    for (const name of levels[i - 1]) for (let k = 1; k <= b; k++) next.push(name + k);
    levels.push(next.slice(0, 9));
  }
  return { levels, truncatedBranches: branches === null || branches > 3, truncatedDepth: depth === null || depth > 4 };
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState<FormState, FormData>(guard(updateSettings), {});
  const keep = useKeepOnError(state);
  const [branches, setBranches] = useState(settings.max_branches_per_line?.toString() ?? "");
  const [depth, setDepth] = useState(settings.max_depth?.toString() ?? "");
  const fe = state.fieldErrors ?? {};
  const b = branches ? Number(branches) : null;
  const d = depth ? Number(depth) : null;
  const preview = previewLevels(b && b > 0 ? b : null, d && d > 1 ? d : null);

  const field = (
    name: string,
    label: string,
    help: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
    error?: string[],
  ) => (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-semibold text-ink">
        {label}
      </label>
      <p id={`${name}-help`} className="mb-2 text-xs leading-relaxed text-faint">
        {help}
      </p>
      <input
        id={name}
        name={name}
        type="number"
        inputMode="numeric"
        aria-describedby={`${name}-help${error ? ` ${name}-error` : ""}`}
        aria-invalid={error ? true : undefined}
        className="field !w-32"
        {...props}
      />
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-800">
          {error[0]}
        </p>
      )}
    </div>
  );

  return (
    <form action={action} {...keep} className="grid gap-8 desk:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <fieldset className="card space-y-5 p-5">
          <legend className="eyebrow px-1">Story shape</legend>
          {field(
            "maxBranches",
            "Branches per line",
            "How many different next lines any single line can have. With 2, line A can only have A1 and A2, and A1 can only have A11 and A12. Leave blank for no limit.",
            { min: 1, max: 50, value: branches, onChange: (e) => setBranches(e.target.value), placeholder: "No limit" },
            fe.maxBranches,
          )}
          {field(
            "maxDepth",
            "Lines per path",
            "The longest any path can get, counting the opening line. When a path reaches it, that line is the ending. Leave blank for no limit.",
            { min: 2, max: 200, value: depth, onChange: (e) => setDepth(e.target.value), placeholder: "No limit" },
            fe.maxDepth,
          )}
          <p className="text-xs leading-relaxed text-muted">
            Changes apply to new lines straight away. Lines already written stay put. Writers who hit a limit can ask for
            more room, and the request shows up under Requests. Invite slots are set per plan, under Plans.
          </p>
        </fieldset>

        <fieldset className="card space-y-3 p-5">
          <legend className="eyebrow px-1">New lines</legend>
          <p className="text-xs leading-relaxed text-faint">
            Applies to every story unless its starter (or an admin) picks something else in Stories. Lines written by a
            story&apos;s starter or an admin always publish straight away.
          </p>
          <label className="flex items-start gap-3 text-sm text-ink">
            <input type="radio" name="autoApprove" value="yes" defaultChecked={settings.auto_approve} className="mt-1 accent-[#8C600A]" />
            <span>
              <strong className="block">Publish straight away</strong>
              <span className="text-xs text-faint">Readers see new lines and edits immediately.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-ink">
            <input type="radio" name="autoApprove" value="no" defaultChecked={!settings.auto_approve} className="mt-1 accent-[#8C600A]" />
            <span>
              <strong className="block">Hold for approval</strong>
              <span className="text-xs text-faint">New lines and edits wait in Dashboard → Review until the starter or an admin approves them.</span>
            </span>
          </label>
        </fieldset>

        <fieldset className="card space-y-5 p-5">
          <legend className="eyebrow px-1">Fair use</legend>
          {field(
            "linesPerHour",
            "Lines per author, per hour",
            "Stops anyone flooding a story. Starting a story counts as one line.",
            { min: 1, max: 500, defaultValue: settings.lines_per_hour, required: true },
            fe.linesPerHour,
          )}
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton className="btn-primary" pendingLabel="Saving">
            Save settings
          </SubmitButton>
          {state.ok && (
            <p role="status" className="text-sm text-ink">
              {state.ok}
            </p>
          )}
          <FormError className="text-sm text-red-800">{state.error}</FormError>
        </div>
      </div>

      <aside aria-labelledby="preview-title" className="panel h-fit p-5">
        <h2 id="preview-title" className="eyebrow mb-3">
          What a story can look like
        </h2>
        <ol className="space-y-2" aria-describedby="preview-note">
          {preview.levels.map((names, i) => (
            <li key={i} className="flex flex-wrap items-center gap-1">
              <span className="w-14 flex-none text-[11px] font-medium text-faint">Line {i + 1}</span>
              {names.map((n) => (
                <span key={n} className="rounded-full bg-white px-2 py-[2px] font-mono text-[11px] text-ink">
                  {n}
                </span>
              ))}
            </li>
          ))}
        </ol>
        <p id="preview-note" className="mt-3 text-[11px] leading-relaxed text-faint">
          {preview.truncatedBranches || preview.truncatedDepth
            ? "Shortened to fit. "
            : ""}
          {d ? `Line ${d} is always an ending.` : "With no length limit, paths can keep going."}
        </p>
      </aside>
    </form>
  );
}
