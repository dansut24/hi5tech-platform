"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2, Shield, UserCog } from "lucide-react";

type Role = "owner" | "admin" | "agent" | "user" | "viewer";

type Row = {
  membership_id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: Role | string;
  created_at: string;
};

type ListResponse =
  | { ok: true; tenant: { id: string; subdomain: string; domain: string; name: string | null }; rows: Row[] }
  | { ok: false; error: string };

type InviteResponse =
  | { ok: true; invited: boolean; userId: string | null; message: string; tenant: { id: string; subdomain: string; domain: string } }
  | { ok: false; error: string };

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border hi5-border px-2 py-0.5 text-xs opacity-90">
      {children}
    </span>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg hi5-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            className="rounded-xl border hi5-border px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export default function UsersClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [tenantLabel, setTenantLabel] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  // invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("admin");
  const [inviteInfo, setInviteInfo] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const a = (r.email || "").toLowerCase();
      const b = (r.full_name || "").toLowerCase();
      const c = (r.role || "").toLowerCase();
      return a.includes(s) || b.includes(s) || c.includes(s);
    });
  }, [rows, q]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/users/list", { cache: "no-store" });
      const data: ListResponse = await res.json();
      if (!("ok" in data) || !data.ok) throw new Error((data as any).error || "Failed to load users");
      setRows(data.rows);
      const t = data.tenant;
      setTenantLabel(t?.name || `${t.subdomain}.${t.domain}`);
    } catch (e: any) {
      setErr(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateRole(membership_id: string, role: string) {
    setSaving(membership_id);
    setErr(null);
    try {
      const res = await fetch("/api/admin/users/update-role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ membership_id, role }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to update role");
      setRows((prev) => prev.map((r) => (r.membership_id === membership_id ? { ...r, role } : r)));
    } catch (e: any) {
      setErr(e?.message || "Failed to update role");
    } finally {
      setSaving(null);
    }
  }

  async function removeUser(membership_id: string) {
    if (!confirm("Remove this user from the tenant?")) return;

    setSaving(membership_id);
    setErr(null);
    try {
      const res = await fetch("/api/admin/users/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ membership_id }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to remove user");
      setRows((prev) => prev.filter((r) => r.membership_id !== membership_id));
    } catch (e: any) {
      setErr(e?.message || "Failed to remove user");
    } finally {
      setSaving(null);
    }
  }

  async function invite() {
    setInviteInfo(null);
    setErr(null);

    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteInfo("Enter an email address.");
      return;
    }

    setSaving("__invite__");
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });

      const data: InviteResponse = await res.json();
      if (!res.ok || !("ok" in data) || !data.ok) throw new Error((data as any)?.error || "Invite failed");

      setInviteInfo(data.message);

      // refresh list (new membership might have been created)
      await load();

      // keep modal open so they can copy message, or close if you prefer:
      // setInviteOpen(false);
    } catch (e: any) {
      setErr(e?.message || "Invite failed");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="p-4 sm:p-8 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <UserCog className="h-5 w-5 opacity-80" />
            Users
          </h1>
          <p className="text-sm opacity-80 mt-1">
            Manage who can access <span className="font-medium">{tenantLabel || "this tenant"}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-xl border hi5-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition inline-flex items-center gap-2"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <button
            className="rounded-xl border hi5-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition inline-flex items-center gap-2"
            onClick={() => {
              setInviteEmail("");
              setInviteRole("admin");
              setInviteInfo(null);
              setInviteOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add / Invite
          </button>
        </div>
      </div>

      <div className="hi5-panel p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <input
            className="w-full sm:max-w-md rounded-xl border hi5-border px-3 py-2 bg-transparent"
            placeholder="Search by name, email, or role…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="text-xs opacity-70">
            {loading ? "Loading…" : `${filtered.length} of ${rows.length} users`}
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
            {err}
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="opacity-70">
              <tr className="text-left">
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Added</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="py-4 opacity-70" colSpan={5}>
                    Loading users…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="py-4 opacity-70" colSpan={5}>
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.membership_id} className="border-t hi5-divider">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{r.full_name || "—"}</div>
                      <div className="text-xs opacity-70">{r.user_id}</div>
                    </td>

                    <td className="py-3 pr-3">
                      <div>{r.email || "—"}</div>
                    </td>

                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <Badge>
                          <Shield className="h-3.5 w-3.5 mr-1 opacity-80" />
                          {String(r.role)}
                        </Badge>

                        <select
                          className="rounded-xl border hi5-border px-2 py-1 bg-transparent text-xs"
                          value={String(r.role)}
                          disabled={saving === r.membership_id}
                          onChange={(e) => updateRole(r.membership_id, e.target.value)}
                        >
                          <option value="owner">owner</option>
                          <option value="admin">admin</option>
                          <option value="user">user</option>
                          <option value="viewer">viewer</option>
                          <option value="agent">agent</option>
                        </select>
                      </div>
                    </td>

                    <td className="py-3 pr-3 opacity-80">
                      {new Date(r.created_at).toLocaleString()}
                    </td>

                    <td className="py-3 pr-3 text-right">
                      <button
                        className="rounded-xl border hi5-border px-2.5 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition inline-flex items-center gap-2 disabled:opacity-60"
                        disabled={saving === r.membership_id}
                        onClick={() => removeUser(r.membership_id)}
                        title="Remove from tenant"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={inviteOpen} title="Add / Invite user" onClose={() => setInviteOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm opacity-80">
            This will invite the user via Supabase (if service role is configured) and create their tenant membership.
          </p>

          <label className="block text-sm">
            Email
            <input
              className="mt-1 w-full rounded-xl border hi5-border px-3 py-2 bg-transparent"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@company.com"
              inputMode="email"
            />
          </label>

          <label className="block text-sm">
            Role
            <select
              className="mt-1 w-full rounded-xl border hi5-border px-3 py-2 bg-transparent"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
            >
              <option value="admin">admin</option>
              <option value="user">user</option>
              <option value="viewer">viewer</option>
              <option value="agent">agent</option>
            </select>
          </label>

          <button
            className="w-full rounded-xl border hi5-border px-3 py-2 font-medium hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-60"
            disabled={saving === "__invite__"}
            onClick={invite}
          >
            {saving === "__invite__" ? "Inviting…" : "Invite user"}
          </button>

          {inviteInfo && (
            <div className="rounded-xl border hi5-border p-3 text-sm">
              <div className="font-medium">Invite result</div>
              <div className="opacity-80 mt-1">{inviteInfo}</div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
