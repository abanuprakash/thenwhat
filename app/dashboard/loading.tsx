import { LoadingLabel } from "@/components/Skeletons";

export default function LoadingDashboard() {
  return (
    <div>
      <LoadingLabel>Loading the dashboard…</LoadingLabel>
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 desk:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card space-y-2 p-4">
            <div className="skeleton h-6 w-10" />
            <div className="skeleton h-3 w-24" />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="card mt-8 space-y-3 p-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-4" style={{ width: `${90 - i * 9}%` }} />
        ))}
      </div>
    </div>
  );
}
