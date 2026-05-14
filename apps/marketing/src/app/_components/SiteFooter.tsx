import Link from "next/link";

export default function SiteFooter({ appUrl }: { appUrl: string }) {
  return (
    <footer className="container py-10">
      <div className="hi5-panel p-6 sm:p-8">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="logo-mark">H</span>
              <span className="text-lg font-extrabold">Hi5Tech</span>
            </div>
            <p className="mt-4 max-w-sm text-sm hi5-muted leading-relaxed">
              Modern service desk with integrated endpoint visibility and premium remote management tools.
            </p>
          </div>

          <div>
            <div className="font-bold">Product</div>
            <div className="mt-3 grid gap-2 text-sm hi5-muted">
              <Link href="/features">Features</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/security">Security</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>

          <div>
            <div className="font-bold">Platform</div>
            <div className="mt-3 grid gap-2 text-sm hi5-muted">
              <a href={`${appUrl}/login`}>Sign in</a>
              <Link href="/signup">Start trial</Link>
              <Link href="/features">Service Desk</Link>
              <Link href="/features">Endpoint Management</Link>
            </div>
          </div>

          <div>
            <div className="font-bold">Built for</div>
            <div className="mt-3 grid gap-2 text-sm hi5-muted">
              <span>MSPs</span>
              <span>Internal IT</span>
              <span>Service desks</span>
              <span>Remote support</span>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-[rgba(var(--hi5-border),var(--hi5-border-alpha))] pt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs hi5-muted">
          <span>© {new Date().getFullYear()} Hi5Tech. All rights reserved.</span>
          <span>Service desk • Endpoint visibility • Remote management</span>
        </div>
      </div>
    </footer>
  );
}
