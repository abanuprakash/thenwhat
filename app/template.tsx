/**
 * Re-mounts on every navigation, so each page arrives with a soft fade-and-rise
 * instead of snapping in. (Reduced-motion users get the page instantly.)
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
