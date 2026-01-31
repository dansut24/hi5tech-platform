import Link from "next/link";

export const metadata = {
  title: "Trial requested | Hi5Tech",
};

export default function SignupSuccessPage({
  searchParams,
}: {
  searchParams?: { company?: string };
}) {
  const company = (searchParams?.company ?? "").toString();

  return (
    <main className="mx-auto max-w-3xl px-6 py-20 text-center">
      <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm">
        ✅ Trial request received
      </div>

      <h1 className="mt-6 text-4xl font-semibold tracking-tight">
        {company ? `${company}, you’re in!` : "You’re in!"}
      </h1>

      <p className="mt-3 text-white/75">
        We’re provisioning your tenant now. Check your inbox for next steps.
      </p>

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="rounded-xl border border-white/20 bg-white/5 px-5 py-2 font-medium hover:bg-white/10"
        >
          Back to home
        </Link>
        <Link
          href="/contact"
          className="rounded-xl bg-white px-5 py-2 font-semibold text-black hover:bg-white/90"
        >
          Talk to sales
        </Link>
      </div>

      <p className="mt-8 text-xs text-white/55">
        If you don’t see an email within a few minutes, check spam — or reach us via{" "}
        <Link className="underline underline-offset-4" href="/contact">
          contact
        </Link>.
      </p>
    </main>
  );
}
