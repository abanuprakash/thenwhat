"use client";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { vote } from "@/app/actions";
import { formatNum } from "@/lib/format";
import type { VoteValue } from "@/lib/types";
import { safely } from "@/lib/client-action";
import { toast } from "@/components/Toast";

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
  // What the server has confirmed. Starts from the page's numbers, follows each saved vote
  // (no page redraw needed), and resets if the page brings newer numbers.
  const fromPage: State = { up, down, mine };
  const [confirmed, setConfirmed] = useState(fromPage);
  const [pageSeen, setPageSeen] = useState(fromPage);
  if (pageSeen.up !== up || pageSeen.down !== down || pageSeen.mine !== mine) {
    setPageSeen(fromPage);
    setConfirmed(fromPage);
  }
  const [state, setOptimistic] = useOptimistic<State, VoteValue>(confirmed, apply);
  // The vote shows instantly; while it's being saved, further taps are ignored so nothing is sent twice.
  const [saving, start] = useTransition();
  // If a save is ever cut off (a dropped connection), don't keep ignoring taps: the guard expires.
  const sentAt = useRef(0);
  const [error, setError] = useState<string>();
  // Bumped on every click so the arrow and number replay their small animation.
  const [tick, setTick] = useState(0);
  // What the last tap did, so the motion matches it: up nudges up, down nudges down, undo settles.
  const [last, setLast] = useState<{ kind: "up" | "down" | "off"; dir: number }>({ kind: "off", dir: 0 });
  const router = useRouter();

  const cast = (value: VoteValue) => {
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
    if (!allowed) return setError("Voting isn't part of your plan. See Pricing.");
    if (saving && msSince(sentAt.current) < 8000) return;
    sentAt.current = nowMs();
    setError(undefined);
    const after = apply(state, value);
    setLast({ kind: after.mine === 1 ? "up" : after.mine === -1 ? "down" : "off", dir: Math.sign(after.up - after.down - (state.up - state.down)) });
    setTick((t) => t + 1);
    start(async () => {
      setOptimistic(value);
      const res = await safely(() => vote(lineId, value));
      if (!res.error) {
        setConfirmed((s) => apply(s, value));
        return;
      }
      // The arrow and count flip back on their own (the optimistic state ends); say why.
      if ("failure" in res) {
        toast({
          title: "Your vote didn't land",
          body: res.failure === "server" ? "Something went wrong on our side, so nothing changed." : "You're offline, so nothing changed.",
          art: res.failure === "server" ? "error" : "offline",
          action: { label: "Try again", run: () => cast(value) },
        });
      } else {
        setError(res.error);
        toast({ title: "That vote didn't count", body: res.error, art: "error" });
      }
    });
  };

  const net = state.up - state.down;
  const btn = (active: boolean) =>
    `press relative inline-block leading-none transition-colors duration-200 ${layout === "row" ? "text-[15px] p-1" : "text-[11px] px-1 py-[2px]"} ${active ? "text-gold" : "text-faint"} hover:text-gold`;

  return (
    <div
      className={`flex items-center ${layout === "row" ? "gap-[10px]" : "w-[38px] flex-col gap-[2px]"}`}
      title={error ?? `${state.up} up · ${state.down} down`}
      aria-busy={saving || undefined}
    >
      <button type="button" aria-label="Upvote" aria-pressed={state.mine === 1} className={btn(state.mine === 1)} onClick={() => cast(1)}>
        {tick > 0 && last.kind === "up" && <span key={`ru${tick}`} aria-hidden="true" className="vote-ring" />}
        <span key={`u${tick}`} className={`inline-block ${tick && last.kind === "up" ? "vote-nudge-up" : tick && last.kind === "off" && state.mine === 0 ? "vote-settle" : ""}`}>
          ▲
        </span>
      </button>
      {/* The count rolls the way it moved: up from below, down from above. */}
      <span className={`vote-count relative inline-flex overflow-hidden ${layout === "row" ? "h-[18px]" : "h-[16px]"}`} aria-live="polite">
        <span
          key={net}
          className={`font-bold tabular-nums text-ink ${tick && last.dir > 0 ? "count-up" : tick && last.dir < 0 ? "count-down" : ""} ${layout === "row" ? "text-[13px] leading-[18px]" : "text-xs leading-[16px]"}`}
        >
          {formatNum(net)}
        </span>
      </span>
      <button type="button" aria-label="Downvote" aria-pressed={state.mine === -1} className={btn(state.mine === -1)} onClick={() => cast(-1)}>
        {tick > 0 && last.kind === "down" && <span key={`rd${tick}`} aria-hidden="true" className="vote-ring vote-ring-down" />}
        <span key={`d${tick}`} className={`inline-block ${tick && last.kind === "down" ? "vote-nudge-down" : ""}`}>
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

// Clock reads for the double-tap guard (only ever called from event handlers).
const nowMs = () => Date.now();
const msSince = (t: number) => Date.now() - t;
