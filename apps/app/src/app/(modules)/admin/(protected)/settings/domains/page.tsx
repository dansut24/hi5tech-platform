import { getActiveTenantId } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  CUSTOM_DOMAIN_DNS_TARGET,
  customDomainCnameRecord,
  customDomainVerificationRecord,
} from "@/lib/tenant/custom-domains";
import CustomDomainForm from "./custom-domain-form";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "active" || status === "verified"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
      : status === "pending"
        ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200"
        : "border-slate-500/25 bg-slate-500/10 opacity-75";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>
      {status}
    </span>
  );
}

export default async function TenantDomainsPage() {
  const tenantId = await getActiveTenantId();
  const admin = supabaseAdmin();

  const { data: domains } = await admin
    .from("tenant_custom_domains")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  return (
    <div className="hi5-page space-y-5">
      <div className="hi5-panel p-5">
        <div className="text-xs uppercase tracking-[0.18em] opacity-60">Admin settings</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Custom domains</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 opacity-75">
          Connect your own domain to this workspace. For this first pass, domain verification is stored
          and shown here, then Hi5Tech can manually verify and activate it from the platform admin portal.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="hi5-panel p-5">
          <div className="text-lg font-extrabold">Add a domain</div>
          <p className="mt-2 text-sm opacity-75">
            Use a subdomain such as support.yourcompany.com or portal.yourcompany.com.
          </p>

          <div className="mt-5">
            <CustomDomainForm />
          </div>
        </div>

        <div className="hi5-panel p-5">
          <div className="text-lg font-extrabold">DNS target</div>
          <p className="mt-2 text-sm opacity-75">
            Point your custom domain to the Hi5Tech platform.
          </p>

          <div className="mt-4 rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5">
            <div className="text-xs opacity-65">CNAME target</div>
            <div className="mt-1 break-words font-mono text-sm font-bold">{CUSTOM_DOMAIN_DNS_TARGET}</div>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-200">
            After adding DNS records, the domain still needs to be verified and activated by Hi5Tech.
            Automated verification will be added in the next pass.
          </div>
        </div>
      </div>

      <div className="hi5-panel p-5">
        <div className="text-lg font-extrabold">Configured domains</div>

        <div className="mt-5 space-y-4">
          {(domains ?? []).length ? (
            domains!.map((domain: any) => {
              const cname = customDomainCnameRecord(domain.domain);
              const txt = customDomainVerificationRecord(domain.domain, domain.verification_token);

              return (
                <div key={domain.id} className="rounded-3xl border hi5-border bg-black/5 p-4 dark:bg-white/5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-lg font-extrabold">{domain.domain}</div>
                      <div className="mt-1 text-sm opacity-70">
                        Environment: {domain.environment_key} · Created {formatDate(domain.created_at)}
                      </div>
                    </div>

                    <StatusPill status={domain.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl border hi5-border bg-white/45 p-3 dark:bg-black/20">
                      <div className="text-xs opacity-65">CNAME record</div>
                      <div className="mt-2 text-sm">
                        <div><span className="font-bold">Type:</span> {cname.type}</div>
                        <div className="break-words"><span className="font-bold">Name:</span> {cname.name}</div>
                        <div className="break-words"><span className="font-bold">Value:</span> {cname.value}</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border hi5-border bg-white/45 p-3 dark:bg-black/20">
                      <div className="text-xs opacity-65">Verification TXT record</div>
                      <div className="mt-2 text-sm">
                        <div><span className="font-bold">Type:</span> {txt.type}</div>
                        <div className="break-words"><span className="font-bold">Name:</span> {txt.name}</div>
                        <div className="break-words"><span className="font-bold">Value:</span> {txt.value}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border hi5-border bg-black/5 p-4 text-sm opacity-70 dark:bg-white/5">
              No custom domains have been added yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
