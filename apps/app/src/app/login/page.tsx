// apps/app/src/app/login/page.tsx
import LoginForm from "./ui/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-dvh relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 hi5-bg" />

      {/* Soft gradient wash */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(1200px 800px at 15% 10%, rgba(255, 79, 225, 0.28), transparent 60%)," +
            "radial-gradient(900px 700px at 85% 25%, rgba(0, 193, 255, 0.24), transparent 55%)," +
            "radial-gradient(900px 700px at 55% 95%, rgba(255, 196, 45, 0.18), transparent 55%)",
        }}
      />

      {/* Floating blobs */}
      <div
        className="absolute -top-24 -left-20 h-72 w-72 rounded-full blur-2xl opacity-40"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(255, 79, 225, 0.95), rgba(255, 79, 225, 0.0) 60%)",
        }}
      />
      <div
        className="absolute top-24 -right-24 h-80 w-80 rounded-full blur-2xl opacity-35"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(0, 193, 255, 0.95), rgba(0, 193, 255, 0.0) 60%)",
        }}
      />
      <div
        className="absolute -bottom-28 left-10 h-80 w-80 rounded-full blur-2xl opacity-30"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(255, 196, 45, 0.9), rgba(255, 196, 45, 0.0) 60%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-dvh flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-3xl border hi5-border shadow-lg overflow-hidden">
            <div className="relative p-6 sm:p-8">
              {/* Glass overlay */}
              <div className="absolute inset-0 bg-white/55 dark:bg-black/40 backdrop-blur-xl" />
              <div className="absolute inset-0 opacity-60 dark:opacity-40"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0.0))",
                }}
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-semibold leading-tight">
                      Hello there, <br />
                      <span className="opacity-90">Welcome back</span>
                    </h1>
                    <p className="text-sm opacity-75 mt-2">
                      Sign in to access your Hi5Tech modules.
                    </p>
                  </div>

                  {/* Small orb */}
                  <div
                    className="h-12 w-12 rounded-2xl shrink-0"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, rgba(255,79,225,0.85), rgba(0,193,255,0.75) 55%, rgba(255,196,45,0.65))",
                      boxShadow:
                        "0 12px 32px rgba(0,0,0,0.12)",
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

            {/* Footer strip */}
            <div className="px-6 sm:px-8 py-4 border-t hi5-divider bg-black/[0.02] dark:bg-white/[0.03]">
              <p className="text-xs opacity-70">
                Need access? Ask your tenant admin to invite you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
