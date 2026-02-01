// apps/app/src/app/auth/invite/page.tsx
import InviteClient from "./ui/invite-client";

export default function InvitePage() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md hi5-panel p-6 space-y-2">
        <h1 className="text-xl font-semibold">Finish setting up your account</h1>
        <p className="text-sm opacity-80">
          Click continue to verify your invite and set your password.
        </p>
        <InviteClient />
      </div>
    </div>
  );
}
