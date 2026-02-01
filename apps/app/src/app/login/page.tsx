// apps/app/src/app/login/page.tsx
import LoginForm from "./ui/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="hi5-panel p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle inner highlight */}
          <div
            className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-40"
            style={{
              background:
                "radial-gradient(800px 320px at 20% 0%, rgba(255,255,255,0.55), transparent 55%)," +
                "linear-gradient(135deg, rgba(255,255,255,0.10), transparent 60%)",
            }}
          />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">
                  Hello there,
                  <br />
                  <span className="opacity-90">Welcome back</span>
                </h1>
                <p className="text-sm opacity-75 mt-2">
                  Sign in to access your Hi5Tech modules.
                </p>
              </div>

              {/* Small orb (matches mock vibe) */}
              <div
                className="h-12 w-12 rounded-2xl shrink-0"
                style={{
                  background:
                    "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.75), rgba(255,255,255,0) 35%)," +
                    "radial-gradient(circle at 30% 30%, rgba(255,79,225,0.95), rgba(0,193,255,0.85) 55%, rgba(255,196,45,0.80))",
                  boxShadow:
                    "0 18px 45px rgba(0,0,0,0.18)",
                }}
              />
            </div>

            <div className="mt-6">
              <LoginForm />
            </div>

            <p className="mt-6 text-xs opacity-70 leading-relaxed">
              By continuing, you agree to the acceptable use policy and security
              terms for your tenant.
            </p>
          </div>
        </div>

        {/* Footer helper */}
        <div className="mt-4 text-center text-xs opacity-70">
          Need access? Ask your tenant admin to invite you.
        </div>
      </div>
    </div>
  );
}
