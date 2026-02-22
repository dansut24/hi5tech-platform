"use client";

import { useState, useTransition } from "react";

export default function InviteUserClient({
  tenantLabel,
  action,
}: {
  tenantLabel: string;
  action: (formData: FormData) => Promise<any>;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await action(formData);
      if (res?.ok) {
        setMsg({ type: "ok", text: "Invite sent and Self Service access added." });
      } else {
        setMsg({ type: "err", text: res?.error || "Something went wrong." });
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs opacity-70">Email</label>
          <input
            name="email"
            type="email"
            required
            className="hi5-input mt-1"
            placeholder="user@company.com"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs opacity-70">Full name (optional)</label>
          <input
            name="full_name"
            type="text"
            className="hi5-input mt-1"
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label className="text-xs opacity-70">Role</label>
          <select name="role" className="hi5-input mt-1" defaultValue="user">
            <option value="user">user (recommended)</option>
            {/* Keep options in case you want to grant higher later */}
            <option value="agent">agent</option>
          </select>
          <div className="text-[11px] opacity-60 mt-1">
            Role is stored in <code>memberships.role</code>
          </div>
        </div>

        <div>
          <label className="text-xs opacity-70">Module</label>
          <select name="module" className="hi5-input mt-1" defaultValue="selfservice" disabled>
            <option value="selfservice">Self Service</option>
          </select>
          <div className="text-[11px] opacity-60 mt-1">
            This invite flow currently provisions Self Service only.
          </div>
        </div>
      </div>

      {msg ? (
        <div
          className={[
            "rounded-2xl border hi5-border px-3 py-2 text-sm",
            msg.type === "ok"
              ? "bg-[rgba(34,197,94,0.10)]"
              : "bg-[rgba(244,63,94,0.10)]",
          ].join(" ")}
        >
          {msg.text}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="text-xs opacity-60">
          Tenant: <span className="font-medium">{tenantLabel}</span>
        </div>

        <button
          type="submit"
          className="hi5-btn-primary text-sm"
          disabled={pending}
        >
          {pending ? "Inviting..." : "Send invite"}
        </button>
      </div>
    </form>
  );
}
