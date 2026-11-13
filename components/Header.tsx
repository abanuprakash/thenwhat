import Link from "next/link";
import type { Viewer } from "@/lib/queries";
import { Avatar } from "@/components/Avatar";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";
import { TourButton } from "@/components/Tour";

export function Header({ viewer }: { viewer: Viewer }) {
  const role = viewer?.profile.role;
  const isAuthor = role === "author" || role === "admin";
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-black/[.08] bg-paper/95 px-4 py-[14px] backdrop-blur desk:px-8">
      <div className="flex items-center gap-[30px]">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-[22px] desk:flex">
          <NavLink href="/" exact>Home</NavLink>
          {viewer && <NavLink href={`/u/${viewer.profile.handle}`}>Profile</NavLink>}
          {isAuthor && <NavLink href="/dashboard">Dashboard</NavLink>}
          <NavLink href="/pricing">Pricing</NavLink>
        </nav>
      </div>
      <div className="flex items-center gap-3 desk:gap-4">
        <TourButton />
        {isAuthor && (
          <Link href="/new" data-tour="start-story" className="btn-primary hidden !px-[14px] !py-2 !text-xs desk:inline-flex">
            + Start a story
          </Link>
        )}
        {viewer ? (
          <>
            <span className={isAuthor ? "badge-gold hidden desk:inline-block" : "badge-muted hidden desk:inline-block"}>
              {role === "admin" ? "Admin" : isAuthor ? "Verified author" : "Reader"}
            </span>
            <Link href={`/u/${viewer.profile.handle}`} aria-label="Your profile" data-tour="your-profile">
              <Avatar url={viewer.profile.avatar_url} handle={viewer.profile.handle} />
            </Link>
          </>
        ) : (
          <Link href="/login" className="btn-secondary" data-tour="sign-in">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
