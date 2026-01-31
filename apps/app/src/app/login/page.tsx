import LoginForm from "./ui/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border bg-white/80 dark:bg-black/30 backdrop-blur p-6">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm opacity-80 mt-1">
          Use your Hi5Tech account to access your modules.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}