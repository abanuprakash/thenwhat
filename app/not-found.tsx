import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-narrow">
      <h1 className="mb-3 font-serif text-2xl font-semibold">This branch never grew</h1>
      <p className="mb-6 text-sm text-muted">It may have been pruned, or the link took a wrong turn.</p>
      <Link href="/" className="btn-secondary">Back to stories</Link>
    </div>
  );
}
