"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AdminOnboardingGuard({
  onboardingCompleted,
}: {
  onboardingCompleted: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Only guard admin routes; allow the setup page itself
    if (!onboardingCompleted && pathname && !pathname.startsWith("/admin/setup")) {
      router.replace("/admin/setup");
    }
  }, [onboardingCompleted, pathname, router]);

  return null;
}
