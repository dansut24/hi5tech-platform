function fmt(ts?: string | null) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts ?? "—";
  }
}

export default function TicketTimeline({
  items,
}: {
  items: Array<{
    id: string;
    activity_type: string;
    title: string;
    body?: string | null;
    created_at?: string | null;
    created_by?: string | null;
  }>;
}) {
  return (
    <div className="hi5-panel p-5">
      <div className="text-sm font-semibold">Activity timeline</div>
      <p className="text-xs opacity-70 mt-1">
        Key ticket actions, premium attempts and operational events.
      </p>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-current opacity-50" />
            <div className="min-w-0">
              <div className="text-sm font-semibold">{item.title}</div>
              {item.body ? (
                <div className="text-sm opacity-75 mt-1">{item.body}</div>
              ) : null}
              <div className="text-xs opacity-60 mt-1">
                {fmt(item.created_at)}
                {item.created_by ? ` • ${item.created_by}` : ""}
              </div>
            </div>
          </div>
        ))}

        {!items.length ? (
          <div className="text-sm opacity-70">
            No activity has been recorded yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
