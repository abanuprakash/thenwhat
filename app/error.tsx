"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-narrow">
      <h1 className="mb-3 font-serif text-2xl font-semibold">That didn&apos;t go to plan</h1>
      <p className="mb-6 text-sm text-muted">Then what? Try again in a moment.</p>
      <button type="button" className="btn-secondary" onClick={reset}>Try again</button>
    </div>
  );
}
