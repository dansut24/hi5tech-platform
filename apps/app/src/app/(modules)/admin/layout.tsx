// apps/app/src/app/(modules)/admin/layout.tsx
export const dynamic = "force-dynamic";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Route-groups (setup/protected) enforce rules.
  return children;
}
