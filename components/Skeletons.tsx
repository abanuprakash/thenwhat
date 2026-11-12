/** Calm placeholders shown while a page loads. Hidden from screen readers; a status line says what's happening. */
export function SkeletonLines({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-3" style={{ width: `${92 - i * 14}%` }} />
      ))}
    </div>
  );
}

export function LoadingLabel({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}
