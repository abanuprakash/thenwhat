export function SetupNotice() {
  return (
    <div className="container-narrow">
      <h1 className="mb-3 font-serif text-2xl font-semibold">Almost there</h1>
      <p className="text-sm leading-relaxed text-muted">
        Then What can&apos;t find its Supabase settings. Add <code>SUPABASE_URL</code> and{" "}
        <code>SUPABASE_ANON_KEY</code> to <code>.env.local</code> (or your Vercel project&apos;s environment
        variables), then restart. The setup guide in <code>docs/SETUP.md</code> walks through it.
      </p>
    </div>
  );
}
