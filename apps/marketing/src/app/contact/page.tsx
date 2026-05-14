import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="container py-14 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <div className="hi5-kicker">Contact</div>
          <h1 className="mt-5 text-5xl sm:text-6xl font-black tracking-tight leading-[0.95]">
            Let’s talk about your{" "}
            <span className="gradient-text">service desk</span>.
          </h1>
          <p className="mt-6 text-lg sm:text-xl hi5-muted leading-relaxed">
            Whether you are building an internal IT helpdesk or managing multiple customers,
            Hi5Tech can help bring tickets, devices and remote support into one platform.
          </p>

          <div className="mt-8 grid gap-3">
            <div className="hi5-card p-5">
              <div className="font-black">Sales & demos</div>
              <p className="mt-2 text-sm hi5-muted">
                Discuss pricing, rollout, MSP workflows and premium endpoint features.
              </p>
            </div>

            <div className="hi5-card p-5">
              <div className="font-black">Existing platform access</div>
              <p className="mt-2 text-sm hi5-muted">
                Already have a tenant? Sign in to continue managing your workspace.
              </p>
              <Link href="/signup" className="inline-flex mt-4 font-bold text-[rgb(var(--hi5-accent))]">
                Start a trial →
              </Link>
            </div>
          </div>
        </div>

        <div className="hi5-panel p-6 sm:p-8">
          <div className="text-2xl font-black">Send a message</div>
          <p className="mt-2 hi5-muted">
            Tell us what you are looking to build or improve.
          </p>

          <form className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-bold">Name</label>
              <input className="mt-2 w-full rounded-2xl border border-[rgba(var(--hi5-border),var(--hi5-border-alpha))] bg-[rgba(var(--hi5-card),0.55)] px-4 py-3 outline-none focus:ring-2 focus:ring-[rgba(var(--hi5-accent),0.25)]" />
            </div>

            <div>
              <label className="text-sm font-bold">Work email</label>
              <input type="email" className="mt-2 w-full rounded-2xl border border-[rgba(var(--hi5-border),var(--hi5-border-alpha))] bg-[rgba(var(--hi5-card),0.55)] px-4 py-3 outline-none focus:ring-2 focus:ring-[rgba(var(--hi5-accent),0.25)]" />
            </div>

            <div>
              <label className="text-sm font-bold">Message</label>
              <textarea rows={6} className="mt-2 w-full rounded-2xl border border-[rgba(var(--hi5-border),var(--hi5-border-alpha))] bg-[rgba(var(--hi5-card),0.55)] px-4 py-3 outline-none focus:ring-2 focus:ring-[rgba(var(--hi5-accent),0.25)]" />
            </div>

            <button type="button" className="hi5-btn hi5-btn-primary w-full">
              Send message
            </button>

            <p className="text-xs hi5-muted">
              Form delivery can be wired to email, CRM or Supabase next.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
