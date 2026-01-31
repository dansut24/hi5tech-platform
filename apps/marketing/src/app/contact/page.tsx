export default function ContactPage() {
  return (
    <div className="container pt-10 pb-14">
      <div className="hi5-card p-6 sm:p-10">
        <div className="hi5-kicker">Contact</div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
          Talk to Hi5Tech
        </h1>
        <p className="hi5-muted mt-4 max-w-2xl">
          For now this is a simple placeholder. Next we can wire this to email,
          a Supabase table, or a ticket creation flow.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mt-8">
          <div className="hi5-panel p-6">
            <div className="font-semibold">Sales & onboarding</div>
            <div className="text-sm hi5-muted mt-2">sales@yourdomain (add later)</div>
          </div>
          <div className="hi5-panel p-6">
            <div className="font-semibold">Support</div>
            <div className="text-sm hi5-muted mt-2">support@yourdomain (add later)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
