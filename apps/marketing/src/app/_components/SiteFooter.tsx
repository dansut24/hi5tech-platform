import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="container pb-10 pt-12">
      <div className="hi5-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="font-semibold">Hi5Tech Platform</div>
            <div className="text-sm hi5-muted mt-1">
              ITSM + RMM, multi-tenant, branded per customer.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link className="hi5-btn" href="/features">Features</Link>
            <Link className="hi5-btn" href="/pricing">Pricing</Link>
            <Link className="hi5-btn" href="/security">Security</Link>
            <Link className="hi5-btn" href="/contact">Contact</Link>
          </div>
        </div>

        <div className="mt-6 text-xs hi5-muted">
          © {new Date().getFullYear()} Hi5Tech. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
