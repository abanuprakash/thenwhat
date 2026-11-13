"use client";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { vote } from "@/app/actions";
import { formatNum } from "@/lib/format";
import type { VoteValue } from "@/lib/types";

type State = { up: number; down: number; mine: VoteValue | 0 };

function apply(s: State, value: VoteValue): State {
  let { up, down } = s;
  if (s.mine === 1) up--;
  if (s.mine === -1) down--;
  const mine = s.mine === value ? 0 : value;
  if (mine === 1) up++;
  if (mine === -1) down++;
  return { up, down, mine };
}

/** Up/down voting with instant feedback (useOptimistic); the server action confirms it. */
export function VoteControl({
  lineId,
  up,
  down,
  mine,
  signedIn,
  allowed = true,
  layout = "row",
}: {
  lineId: string;
  up: number;
  down: number;
  mine: VoteValue | 0;
  signedIn: boolean;
  /** False when the person's plan doesn't include voting. */
  allowed?: boolean;
  layout?: "row" | "column";
}) {
  const [state, setOptimistic] = useOptimistic<State, VoteValue>({ up, down, mine }, apply);
  // The vote shows instantly; while it's being saved, further taps are ignored so nothing is sent twice.
  const [saving, start] = useTransition();
  const [error, setError] = useState<string>();
  // Bumped on every click so the arrow and number replay their small animation.
  const [tick, setTick] = useState(0);
  const router = useRouter();

  const cast = (value: VoteValue) => {
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
    if (!allowed) return setError("Voting isn't part of your plan. See Pricing.");
    if (saving) return;
    setError(undefined);
    setTick((t) => t + 1);
    start(async () => {
      setOptimistic(value);
      const res = await vote(lineId, value);
      if (res.error) setError(res.error);
    });
  };

  const net = state.up - state.down;
  const btn = (active: boolean) =>
    `press inline-block leading-none transition-colors duration-200 ${layout === "row" ? "text-[15px] p-1" : "text-[11px] px-1 py-[2px]"} ${active ? "text-gold" : "text-faint"} hover:text-gold`;

  return (
    <div
      className={`flex items-center ${layout === "row" ? "gap-[10px]" : "w-[38px] flex-col gap-[2px]"}`}
      title={error ?? `${state.up} up · ${state.down} down`}
      aria-busy={saving || undefined}
    >
      <button type="button" aria-label="Upvote" aria-pressed={state.mine === 1} className={btn(state.mine === 1)} onClick={() => cast(1)}>
        <span key={state.mine === 1 ? `u${tick}` : "u"} className={`inline-block ${state.mine === 1 && tick ? "animate-pop" : ""}`}>
          ▲
        </span>
      </button>
      <span key={net} className={`font-bold tabular-nums text-ink ${tick ? "animate-count" : ""} ${layout === "row" ? "text-[13px]" : "text-xs"}`} aria-live="polite">
        {formatNum(net)}
      </span>
      <button type="button" aria-label="Downvote" aria-pressed={state.mine === -1} className={btn(state.mine === -1)} onClick={() => cast(-1)}>
        <span key={state.mine === -1 ? `d${tick}` : "d"} className={`inline-block ${state.mine === -1 && tick ? "animate-pop" : ""}`}>
          ▼
        </span>
      </button>
      {error && (
        <span role="alert" className={layout === "row" ? "text-[11px] text-red-800" : "sr-only"}>
          {error}
        </span>
      )}
    </div>
  );
}
