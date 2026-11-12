import { LoadingLabel, SkeletonLines } from "@/components/Skeletons";

export default function LoadingStory() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-8 desk:px-6">
      <LoadingLabel>Turning the page…</LoadingLabel>
      <p aria-hidden="true" className="animate-fade mb-3 font-serif text-sm italic text-faint">
        Turning the page…
      </p>
      <div aria-hidden="true" className="mb-[18px] flex gap-2">
        <div className="skeleton h-6 w-28 rounded-full" />
        <div className="skeleton h-6 w-36 rounded-full" />
      </div>
      <div className="flex flex-wrap items-start gap-7">
        <div className="min-w-0 flex-1 basis-[340px]">
          <div className="card px-7 py-7">
            <div aria-hidden="true" className="space-y-3">
              <div className="skeleton h-5 w-[95%]" />
              <div className="skeleton h-5 w-[80%]" />
              <div className="skeleton mt-4 h-3 w-32" />
            </div>
          </div>
          <div className="mt-[22px] space-y-px overflow-hidden rounded-[3px] border border-black/[.08]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white px-4 py-4">
                <SkeletonLines rows={2} />
              </div>
            ))}
          </div>
        </div>
        <div aria-hidden="true" className="skeleton hidden h-[260px] w-[230px] desk:block" />
      </div>
    </div>
  );
}
