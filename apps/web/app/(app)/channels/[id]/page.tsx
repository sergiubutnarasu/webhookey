import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { createApiClient } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { DeleteChannelButton } from "./DeleteChannelButton";
import { CopyButton } from "./CopyButton";
import { DisconnectAllButton } from "./DisconnectAllButton";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";

interface SearchParams {
  page?: string;
  limit?: string;
}

interface Props {
  params: { id: string };
  searchParams?: SearchParams;
}

export default async function ChannelPage({ params, searchParams }: Props) {
  const cookieStore = cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect("/auth/login");
  }

  const page = Math.max(1, parseInt(searchParams?.page || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams?.limit || "20")));

  const api = createApiClient(token, cookieStore.get("refresh_token")?.value);

  try {
    const [channel, events] = await Promise.all([
      api.getChannel(params.id),
      api.getEvents(params.id, page, limit),
    ]);

    const totalPages = Math.ceil(events.total / limit);

    return (
      <div>
        {/* Back link */}
        <Link href="/" className="text-[13px] text-[#8a8f98] hover:text-[#f7f8f8] transition-[color] duration-150">
          &larr; Channels
        </Link>

        {/* Channel header card */}
        <div className="mt-4 p-6 bg-[#101111] border border-[rgba(255,255,255,0.08)] rounded-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[#f7f8f8] flex items-center gap-2">
                {channel.name}
                {channel.hasSecret && (
                  <LockKeyhole className="h-4 w-4 text-[#6a6b6c]" />
                )}
              </h1>
              <div className="flex items-center gap-2 mt-3">
                <code className="text-[13px] font-mono text-[#8a8f98]">{channel.webhookUrl}</code>
                <CopyButton text={channel.webhookUrl} />
              </div>
              <div className="flex gap-2 items-center mt-3">
                <Badge className="bg-[rgba(16,185,129,0.15)] text-[#3ecf8e] text-[11px]">
                  {(channel.connectedDevices || 0) === 0
                    ? "No devices"
                    : channel.connectedDevices > 1
                      ? `${channel.connectedDevices} connected`
                      : "1 connected"}
                </Badge>
                {(channel.connectedDevices || 0) > 0 && (
                  <DisconnectAllButton id={channel.id} />
                )}
              </div>
            </div>
            <DeleteChannelButton id={channel.id} name={channel.name} />
          </div>
        </div>

        {/* Events section */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold tracking-[-0.3px] text-[#f7f8f8]">Events</h2>
            <Badge className="bg-[rgba(255,255,255,0.08)] text-[#d0d6e0] text-[11px]">{events.total}</Badge>
          </div>

          {events.data.length === 0 ? (
            <div className="flex flex-col items-center py-12 border border-[rgba(255,255,255,0.08)] rounded-lg border-dashed">
              <p className="text-[#8a8f98] text-sm">No events received yet</p>
              <p className="text-[#6a6b6c] text-xs mt-1">Send a webhook to the URL above</p>
            </div>
          ) : (
            <>
              {/* Event table header */}
              <div className="flex items-center px-4 py-2 text-[11px] font-medium uppercase tracking-[0.5px] text-[#6a6b6c] border-b border-[rgba(255,255,255,0.05)]">
                <div className="w-24">Status</div>
                <div className="flex-1">Response</div>
                <div className="w-44 text-right">Time</div>
              </div>
              {/* Event rows */}
              {events.data.map((event) => (
                <div key={event.id} className="flex items-center px-4 py-3 border-b border-[rgba(255,255,255,0.05)]">
                  <div className="w-24">
                    <Badge className={event.verified ? "bg-[rgba(16,185,129,0.15)] text-[#3ecf8e] text-[11px]" : "bg-[rgba(255,255,255,0.08)] text-[#8a8f98] text-[11px]"}>
                      {event.verified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                  <div className="flex-1 text-sm font-medium text-[#d0d6e0]">{event.status}</div>
                  <div className="w-44 text-right text-xs text-[#6a6b6c] font-mono">
                    {new Date(event.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </>
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={events.total}
            itemsPerPage={limit}
            baseUrl={`/channels/${params.id}?`}
          />
        </div>
      </div>
    );
  } catch (e: any) {
    if (e instanceof ApiError && e.statusCode === 403) {
      redirect("/forbidden");
    }
    notFound();
  }
}
