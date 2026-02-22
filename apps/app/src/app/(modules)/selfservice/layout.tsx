// apps/app/src/app/(modules)/selfservice/layout.tsx
import SelfServiceShell from "./ui/selfservice-shell";

export const dynamic = "force-dynamic";

export default function SelfServiceLayout({ children }: { children: React.ReactNode }) {
  return <SelfServiceShell>{children}</SelfServiceShell>;
}
