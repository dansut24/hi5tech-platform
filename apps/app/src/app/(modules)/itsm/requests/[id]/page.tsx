import Link from "next/link";

export default function ServiceRequestsDetail({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">ServiceRequests: {params.id}</h1>
          <p className="opacity-80">Detail page — opens as a tab in the ITSM tab bar.</p>
        </div>
        <Link className="underline" href="/itsm/requests">Back to list</Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="hi5-card p-4 lg:col-span-2">
          <div className="font-semibold">Summary</div>
          <div className="text-sm opacity-70 mt-1">Description / updates / comments will go here.</div>
        </div>
        <div className="hi5-card p-4">
          <div className="font-semibold">Details</div>
          <div className="text-sm opacity-70 mt-1">Status, priority, assignee, requester, SLA.</div>
        </div>
      </div>
    </div>
  );
}