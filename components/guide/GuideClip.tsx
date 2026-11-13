"use client";
import { useEffect, useRef, useState } from "react";

/**
 * A short silent clip in the guide. It plays only while it's on screen and loops; a Play/Pause
 * button sits on top. With reduced motion it waits for a press instead of starting by itself.
 */
export function GuideClip({ src, poster, label, width, height, phone }: { src: string; poster?: string; label: string; width: number; height: number; phone?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  // Whether the reader wants it playing (null until we know their motion preference).
  const wanted = useRef<boolean | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (wanted.current === null) wanted.current = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sync = () => setPlaying(!v.paused);
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && wanted.current) v.play().catch(() => {});
        else if (!e.isIntersecting) v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => {
      io.disconnect();
      v.removeEventListener("play", sync);
      v.removeEventListener("pause", sync);
    };
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    wanted.current = v.paused;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  return (
    <figure className={`guide-fig${phone ? " phone" : ""}`}>
      <div className="relative">
        <video
          ref={video}
          src={src}
          poster={poster}
          width={width}
          height={height}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={label}
          className="guide-shot"
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={`${playing ? "Pause" : "Play"} clip: ${label}`}
          className="press absolute right-3 top-3 rounded-full bg-ink/75 px-3 py-1.5 text-xs font-semibold text-white"
        >
          {playing ? "Pause" : "Play"}
        </button>
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
