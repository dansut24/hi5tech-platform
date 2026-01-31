import Link from "next/link";

export default function SiteNav({ appUrl }: { appUrl: string }) {
  return (
    <header className="sticky top-0 z-50">
      <div className="container pt-4">
        <div className="hi5-panel px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold tracking-tight">
              Hi5Tech
            </Link>
            <span className="text-xs hi5-muted hidden sm:inline">
              ITSM + RMM Platform
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            <Link className="hi5-btn" href="/features">Features</Link>
            <Link className="hi5-btn" href="/pricing">Pricing</Link>
            <Link className="hi5-btn" href="/security">Security</Link>
            <Link className="hi5-btn" href="/contact">Contact</Link>
          </nav>

          <div className="flex items-center gap-2">
            <a className="hi5-btn hidden sm:inline-flex" href={`${appUrl}/login`}>
              Sign in
            </a>
            <Link className="hi5-btn hi5-btn-primary" href="/signup">
              Start free trial
            </Link>
          </div>
        </div>

        {/* Mobile quick links */}
        <div className="mt-3 md:hidden flex gap-2 overflow-x-auto no-scrollbar">
          <Link className="hi5-btn shrink-0" href="/features">Features</Link>
          <Link className="hi5-btn shrink-0" href="/pricing">Pricing</Link>
          <Link className="hi5-btn shrink-0" href="/security">Security</Link>
          <Link className="hi5-btn shrink-0" href="/contact">Contact</Link>
        </div>
      </div>
    </header>
  );
}
