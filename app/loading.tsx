import { LoadingLabel, SkeletonLines } from "@/components/Skeletons";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-24 pt-9 desk:px-6">
      <LoadingLabel>Finding where we left off…</LoadingLabel>
      <div aria-hidden="true" className="mb-6 flex gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-4 w-16" />
        ))}
      </div>
      <div className="space-y-6">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonLines key={i} rows={3} />
        ))}
      </div>
    </div>
  );
}
