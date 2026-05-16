"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import CreateIncidentFromDeviceButton from "./create-incident-from-device-button";

type Ticket = {
  id: string;
  number?: string | null;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  triage_status?: string | null;
  category?: string | null;
  asset_id?: string | null;
  device_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  sla_due?: string | null;
  is_breached?: boolean | null;
};

type Device = {
  device_id: string;
  hostname?: string | null;
  os?: string | null;
  online?: boolean | null;
  last_seen_at?: string | null;
};

type Asset = {
  id: string;
  name?: string | null;
  hostname?: string | null;
  control_device_id?: string | null;
};

type ResponseShape = {
  device?: Device | null;
  asset?: Asset | null;
  incidents?: Ticket[];
  summary?: {
    total?: number;
    open?: number;
    breached?: number;
  };
  error?: string;
};

function text(value: any, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function fmt(value: any) {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return String(value);
  }

  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toneForStatus(status?: string | null) {
  if (status === "Open") return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-200";
  if (status === "In Progress") return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200";
  if (status === "Resolved") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  if (status === "Closed") return "border-zinc-500/25 bg-zinc-500/10 text-zinc-700 dark:text-zinc-200";
  return "hi5-border bg-black/5 dark:bg-white/5";
}

function toneForPriority(priority?: string | null) {
  if (priority === "Critical") return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-200";
  if (priority === "High") return "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-200";
  if (priority === "Medium") return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200";
  if (priority === "Low") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  return "hi5-border bg-black/5 dark:bg-white/5";
}

function Pill({
  children,
  className = "hi5-border bg-black/5 dark:bg-white/5",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", className].join(" ")}>
      {children}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: "neutral" | "good" | "warning" | "bad" | "info";
}) {
  const cls =
    tone === "good"
      ? "border-emerald-500/25 bg-emerald-500/10"
      : tone === "warning"
        ? "border-amber-500/25 bg-amber-500/10"
        : tone === "bad"
          ? "border-red-500/25 bg-red-500/10"
          : tone === "info"
            ? "border-sky-500/25 bg-sky-500/10"
            : "hi5-border bg-black/5 dark:bg-white/5";

  return (
    <div className={["rounded-2xl border p-4", cls].join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs opacity-70">{label}</div>
          <div className="text-2xl font-extrabold mt-1">{value}</div>
        </div>
        <div className="opacity-75">{icon}</div>
      </div>
    </div>
  );
}

export default function DeviceTicketsPanel({
  deviceId,
  hostname,
}: {
  deviceId: string;
  hostname?: string | null;
}) {
  const [data, setData] = useState<ResponseShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incidents = data?.incidents ?? [];

  const openTickets = useMemo(
    () => incidents.filter((ticket) => ["Open", "In Progress"].includes(String(ticket.status || ""))),
    [incidents]
  );

  const closedTickets = useMemo(
    () => incidents.filter((ticket) => ["Resolved", "Closed"].includes(String(ticket.status || ""))),
    [incidents]
  );

  async function load(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const res = await fetch(`/api/control/devices/${encodeURIComponent(deviceId)}/tickets`, {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to load tickets (${res.status})`);
      }

      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  if (loading) {
    return (
      <div className="hi5-panel p-5">
        <div className="flex items-center gap-2 text-sm opacity-75">
          <Loader2 size={16} className="animate-spin" />
          Loading device tickets…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hi5-panel p-5">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill>Control tickets</Pill>
              {data?.asset ? <Pill>Asset linked</Pill> : <Pill className="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200">No linked asset</Pill>}
            </div>

            <h2 className="text-2xl font-extrabold mt-3">Tickets for {hostname || data?.device?.hostname || deviceId}</h2>

            <p className="text-sm opacity-75 mt-2 leading-relaxed">
              View incidents raised from this device or linked through its ITSM asset. The full incident workflow remains in ITSM.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button
              type="button"
              className="hi5-btn-ghost text-sm inline-flex w-auto items-center gap-2"
              onClick={() => load(true)}
              disabled={refreshing}
            >
              {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Refresh
            </button>

            <CreateIncidentFromDeviceButton deviceId={deviceId} hostname={hostname || data?.device?.hostname} />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard
          label="Total tickets"
          value={data?.summary?.total ?? incidents.length}
          icon={<FileText size={22} />}
          tone="info"
        />
        <SummaryCard
          label="Open / active"
          value={data?.summary?.open ?? openTickets.length}
          icon={<Clock size={22} />}
          tone={(data?.summary?.open ?? openTickets.length) > 0 ? "warning" : "good"}
        />
        <SummaryCard
          label="SLA breached"
          value={data?.summary?.breached ?? incidents.filter((ticket) => ticket.is_breached).length}
          icon={<AlertTriangle size={22} />}
          tone={(data?.summary?.breached ?? 0) > 0 ? "bad" : "good"}
        />
      </div>

      {data?.asset ? (
        <div className="hi5-card p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-sm font-bold">Linked ITSM asset</div>
              <div className="text-sm opacity-75 mt-1">
                {text(data.asset.name)} {data.asset.hostname ? `· ${data.asset.hostname}` : ""}
              </div>
            </div>

            <Link href={`/itsm/assets/${data.asset.id}`} className="hi5-btn-ghost text-sm w-auto">
              Open asset
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
          <div className="text-sm font-bold text-amber-700 dark:text-amber-200">No ITSM asset linked</div>
          <p className="text-sm opacity-75 mt-1 leading-relaxed">
            Tickets can still be linked by device ID. Linking or creating an ITSM asset improves history, ownership and reporting.
          </p>
        </div>
      )}

      <section className="hi5-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold">Open tickets</div>
            <div className="text-xs opacity-70 mt-1">Active incidents linked to this device or its asset.</div>
          </div>
          <Pill>{openTickets.length}</Pill>
        </div>

        {openTickets.length ? (
          <div className="space-y-2">
            {openTickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4 text-sm opacity-75">
            No open tickets for this device.
          </div>
        )}
      </section>

      <section className="hi5-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold">Recent resolved / closed</div>
            <div className="text-xs opacity-70 mt-1">Recent completed incidents for context.</div>
          </div>
          <Pill>{closedTickets.length}</Pill>
        </div>

        {closedTickets.length ? (
          <div className="space-y-2">
            {closedTickets.slice(0, 12).map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4 text-sm opacity-75">
            No resolved or closed tickets yet.
          </div>
        )}
      </section>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const ticketRef = ticket.number || ticket.id;

  return (
    <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-extrabold break-words">
              {ticket.number ? `${ticket.number} · ` : ""}
              {text(ticket.title, "Untitled incident")}
            </span>

            <Pill className={toneForStatus(ticket.status)}>{text(ticket.status)}</Pill>
            <Pill className={toneForPriority(ticket.priority)}>{text(ticket.priority)}</Pill>

            {ticket.is_breached ? (
              <Pill className="border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-200">
                SLA breached
              </Pill>
            ) : null}
          </div>

          <div className="text-xs opacity-70 mt-2 leading-relaxed">
            Updated {fmt(ticket.updated_at)} · Created {fmt(ticket.created_at)}
            {ticket.sla_due ? ` · SLA ${fmt(ticket.sla_due)}` : ""}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Link href={`/itsm/incidents/${encodeURIComponent(ticketRef)}`} className="hi5-btn-primary text-sm w-auto">
            Open in ITSM
          </Link>

          {ticket.status === "Resolved" || ticket.status === "Closed" ? (
            <span className="hi5-btn-ghost text-sm w-auto opacity-70 inline-flex items-center gap-2">
              <CheckCircle2 size={16} />
              Completed
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
