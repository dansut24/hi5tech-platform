// apps/app/src/app/(modules)/control/page.tsx
import ControlHomeClient from "./ui/control-home-client";

export default async function ControlHomePage() {
  // server-safe only: fetch data here later if needed
  return <ControlHomeClient />;
}
