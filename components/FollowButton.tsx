"use client";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollow } from "@/app/actions";
import { safely } from "@/lib/client-action";
import { toast } from "@/components/Toast";

export function FollowButton({
  storyId,
  initial,
  signedIn,
  allowed = true,
  variant = "star",
}: {
  storyId: string;
  initial: boolean;
  signedIn: boolean;
  allowed?: boolean;
  variant?: "star" | "button";
}) {
  const [following, setFollowing] = useOptimistic(initial);
  // The star changes instantly; while it's being saved, further taps are ignored.
  const [saving, start] = useTransition();
  // If a save is ever cut off (a dropped connection), don't keep ignoring taps: the guard expires.
  const sentAt = useRef(0);
  const [tick, setTick] = useState(0);
  const router = useRouter();

  const onClick = () => {
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
    if (!allowed) return router.push("/pricing");
    if (saving && msSince(sentAt.current) < 8000) return;
    sentAt.current = nowMs();
    setTick((t) => t + 1);
    start(async () => {
      const want = !following;
      setFollowing(want);
      const res = await safely(() => toggleFollow(storyId, want));
      if (!res.error) return;
      // The star flips back on its own (the optimistic state ends); say why.
      toast({
        title: want ? "That star didn't stick" : "Still following",
        body:
          "failure" in res
            ? res.failure === "server"
              ? "Something went wrong on our side, so nothing changed."
              : "You're offline, so nothing changed."
            : res.error,
        art: "failure" in res && res.failure !== "server" ? "offline" : "error",
        action: "failure" in res ? { label: "Try again", run: onClick } : undefined,
      });
    });
  };

  if (variant === "button") {
    return (
      <button type="button" onClick={onClick} aria-pressed={following} aria-busy={saving || undefined} className="btn-secondary">
        <Star following={following} tick={tick} />
        <span key={`${following}`} className={tick ? "animate-fade" : ""}>
          {following ? "Following" : "Follow story"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={following}
      aria-busy={saving || undefined}
      aria-label={following ? "Unfollow story" : "Follow story"}
      className={`press flex-none p-1 text-lg leading-none transition-colors duration-200 ${following ? "text-gold" : "text-[#A89C7E]"} hover:text-gold`}
    >
      <Star following={following} tick={tick} />
    </button>
  );
}

/**
 * The star. Following: it turns one point (72°) with a small pop and six tiny sparks fly out once.
 * Unfollowing: it settles back, a little smaller for a moment. Colour comes from the button.
 */
function Star({ following, tick }: { following: boolean; tick: number }) {
  return (
    <span aria-hidden="true" className="relative inline-flex items-center justify-center">
      {tick > 0 && following && (
        <span key={`s${tick}`} className="star-sparks">
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <span key={a} style={{ "--a": `${a}deg` } as React.CSSProperties} />
          ))}
        </span>
      )}
      <span
        key={`${following}${tick}`}
        className={`inline-block transition-colors duration-200 ${following ? "text-gold" : ""} ${tick ? (following ? "star-on" : "star-off") : ""}`}
      >
        {following ? "★" : "☆"}
      </span>
    </span>
  );
}

// Clock reads for the double-tap guard (only ever called from event handlers).
const nowMs = () => Date.now();
const msSince = (t: number) => Date.now() - t;
