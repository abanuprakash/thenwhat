"use client";
import { FAILURE } from "@/lib/client-action";
import { SnappedThread, TangledBranch } from "@/components/Illustrations";

const NETWORK = new Set<string>([FAILURE.offline, FAILURE.dropped]);

/**
 * A form's error. Ordinary problems (a too-long line, a taken handle) stay a short line of text
 * next to the form. When the request itself failed (offline, the connection dropped, or our
 * server tripped), it becomes a small card with a drawing, so it reads as "nothing was saved"
 * rather than "you did something wrong".
 */
export function FormError({ children, className = "text-sm text-red-800" }: { children?: string | null; className?: string }) {
  if (!children) return null;
  const network = NETWORK.has(children);
  if (network || children === FAILURE.server) {
    return (
      <div role="alert" className="form-failure mt-3 flex w-full basis-full items-start gap-3 rounded-[6px] border border-gold-edge/60 bg-sand p-3">
        {network ? <SnappedThread size={36} className="flex-none" /> : <TangledBranch size={36} className="flex-none" />}
        <div className="min-w-0">
          <p className="font-serif text-[14px] font-semibold text-ink">{network ? "That didn't reach us" : "Our side tripped"}</p>
          <p className="text-[13px] leading-relaxed text-muted">{children.replace(/^That didn't reach us: /, "").replace(/^./, (c) => c.toUpperCase())}</p>
        </div>
      </div>
    );
  }
  return (
    <p role="alert" className={className}>
      {children}
    </p>
  );
}
