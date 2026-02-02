// apps/app/src/app/(modules)/control/page.tsx
import { redirect } from "next/navigation";

export default function ControlIndex() {
  redirect("/control/devices");
}
