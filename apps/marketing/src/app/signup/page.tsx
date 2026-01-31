import Link from "next/link";
import SignupForm from "./SignupForm";

export const metadata = {
  title: "Start your 14-day trial | Hi5Tech",
};

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-white/80" />
            14‑day free trial • No card required
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Create your tenant in minutes
          </h1>

          <p className="mt-3 text-white/75">
            Your company gets a dedicated workspace with ITSM, RMM, and the
            Hi5Tech portal. Cancel anytime.
          </p>

          <div className="mt-6 space-y-3 text-sm text-white/80">
            <div className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-white/80" />
              <div>
                <div className="font-medium text-white">Instant setup</div>
                <div className="text-white/70">
                  We’ll provision your tenant and admin account.
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-white/80" />
              <div>
                <div className="font-medium text-white">Full platform access</div>
                <div className="text-white/70">
                  Try everything for 14 days — no feature gating.
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-white/80" />
              <div>
                <div className="font-medium text-white">Guided onboarding</div>
                <div className="text-white/70">
                  We’ll help you import users, devices, and your service catalog.
                </div>
              </div>
            </div>
          </div>

          <p className="mt-8 text-sm text-white/60">
            Already have an account?{" "}
            <Link className="text-white underline underline-offset-4" href="https://app.hi5tech.co.uk/login">
              Sign in
            </Link>
          </p>
        </div>

        <div className="rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur">
          <div className="mb-4">
            <div className="text-lg font-semibold">Start your trial</div>
            <div className="text-sm text-white/70">
              We’ll email you when your tenant is ready.
            </div>
          </div>

          <SignupForm />

          <div className="mt-6 text-xs text-white/55">
            Questions?{" "}
            <Link className="underline underline-offset-4" href="/contact">
              Contact sales
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
