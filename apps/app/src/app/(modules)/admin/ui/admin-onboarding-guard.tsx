// apps/app/src/app/(modules)/admin/ui/admin-onboarding-guard.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Forces admins to complete onboarding at /admin/setup
 * until tenant_settings.onboarding_completed === true
 */
export default function AdminOnboardingGuard({
  onboardingCompleted,
}: {
  onboardingCompleted: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Allow the setup flow + API routes
    const isSetupRoute = pathname?.startsWith("/admin/setup");
    const isAdminApi = pathname?.startsWith("/api/admin");

    if (onboardingCompleted) {
      // If they finished onboarding, keep them away from /admin/setup (nice UX)
      if (isSetupRoute) router.replace("/admin");
      return;
    }

    // Not completed: force into setup (but don't break API calls)
    if (!isSetupRoute && !isAdminApi) {
      router.replace("/admin/setup");
    }
  }, [onboardingCompleted, pathname, router]);

  return null;
}
