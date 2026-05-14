import Link from "next/link";

export default function SignupSuccessPage({
  searchParams,
}: {
  searchParams?: { company?: string; tenant?: string };
}) {
  const company = searchParams?.company || "your company";
  const tenant = searchParams?.tenant;
  const tenantUrl = tenant ? `https://${tenant}.hi5tech.co.uk` : "https://app.hi5tech.co.uk";

  return (
    <div className="container py-14 sm:py-20">
      <div className="mx-auto max-w-3xl text-center hi5-panel p-8 sm:p-12">
        <div className="hi5-kicker mx-auto">Tenant created</div>

        <h1 className="mt-5 text-5xl sm:text-6xl font-black tracking-tight leading-[0.95]">
          Check your email to finish setup.
        </h1>

        <p className="mt-6 text-lg hi5-muted leading-relaxed">
          We have created the tenant for <strong>{company}</strong>. An invite or login link
          has been sent to the owner email address.
        </p>

        <div className="mt-8 hi5-card p-5 text-left">
          <div className="text-sm hi5-muted">Tenant URL</div>
          <div className="mt-1 font-black break-all">{tenantUrl}</div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <a href={tenantUrl} className="hi5-btn hi5-btn-primary">
            Open tenant
          </a>
          <Link href="/" className="hi5-btn">
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
