export default function SecurityPage() {
  return (
    <div className="container pt-10 pb-14">
      <div className="hi5-card p-6 sm:p-10">
        <div className="hi5-kicker">Security</div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
          Security-first foundations.
        </h1>
        <p className="hi5-muted mt-4 max-w-2xl">
          You’re building the right way: auth-guarded modules, tenant separation, and branded tokens.
          Next we’ll wire signup + tenant provisioning and then tighten policies.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mt-8">
          <div className="hi5-panel p-6">
            <div className="font-semibold">Tenant separation</div>
            <div className="text-sm hi5-muted mt-2">
              Data access scoped to the active tenant (memberships and module assignments).
            </div>
          </div>
          <div className="hi5-panel p-6">
            <div className="font-semibold">Theme tokens</div>
            <div className="text-sm hi5-muted mt-2">
              Brand styling driven by safe variables instead of hard-coded colors.
            </div>
          </div>
          <div className="hi5-panel p-6">
            <div className="font-semibold">Audit-ready approach</div>
            <div className="text-sm hi5-muted mt-2">
              Clear ownership boundaries: tenant admin vs platform admin vs user preferences.
            </div>
          </div>
          <div className="hi5-panel p-6">
            <div className="font-semibold">Next steps</div>
            <div className="text-sm hi5-muted mt-2">
              Add RLS policies after signup provisioning is stable and roles are finalised.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
