"use client";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollow } from "@/app/actions";

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
  const [tick, setTick] = useState(0);
  const router = useRouter();

  const onClick = () => {
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
    if (!allowed) return router.push("/pricing");
    if (saving) return;
    setTick((t) => t + 1);
    start(async () => {
      setFollowing(!following);
      await toggleFollow(storyId, !following);
    });
  };

  if (variant === "button") {
    return (
      <button type="button" onClick={onClick} aria-pressed={following} aria-busy={saving || undefined} className="btn-secondary">
        <span
          key={`${following}${tick}`}
          aria-hidden="true"
          className={`inline-block transition-colors duration-200 ${following ? "text-gold" : "text-faint"} ${following && tick ? "animate-pop" : ""}`}
        >
          {following ? "★" : "☆"}
        </span>
        {following ? "Following" : "Follow story"}
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
      <span key={`${following}${tick}`} className={`inline-block ${following && tick ? "animate-pop" : ""}`}>
        {following ? "★" : "☆"}
      </span>
    </button>
  );
}
