import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LockKeyhole, Radio } from "lucide-react";
import { createApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";

interface SearchParams {
  page?: string;
  limit?: string;
}

interface Props {
  searchParams?: SearchParams;
}

export default async function Home({ searchParams }: Props) {
  const cookieStore = cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect("/auth/login");
  }

  const page = Math.max(1, parseInt(searchParams?.page || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams?.limit || "10")));

  const api = createApiClient(token, cookieStore.get("refresh_token")?.value);
  const { data: channels, total } = await api.getChannels(page, limit);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[#f7f8f8]">Channels</h1>
          <p className="text-sm text-[#8a8f98] mt-1">{total} webhook endpoints</p>
        </div>
        <Link href="/channels/new" className="inline-flex">
          <Button className="bg-[#6366f1] hover:bg-[#4f46e5] text-white">New Channel</Button>
        </Link>
      </div>

      {/* Empty state */}
      {channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-[rgba(255,255,255,0.08)] rounded-lg">
          <Radio className="h-10 w-10 text-[#6a6b6c] mb-4" />
          <p className="text-[#8a8f98] text-sm">No channels yet</p>
          <p className="text-[#6a6b6c] text-xs mt-1">Create your first channel to receive webhooks</p>
        </div>
      ) : (
        <>
          {/* Table header — uppercase micro label */}
          <div className="flex items-center px-4 py-2 text-[11px] font-medium uppercase tracking-[0.5px] text-[#6a6b6c] border-b border-[rgba(255,255,255,0.05)]">
            <div className="flex-1">Name</div>
            <div className="w-48 font-mono">Endpoint</div>
            <div className="w-24 text-right">Status</div>
          </div>

          {/* Channel rows — whisper hover */}
          {channels.map((channel) => (
            <Link
              key={channel.id}
              href={`/channels/${channel.id}`}
              className="flex items-center px-4 py-3 border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.03)] transition-[background] duration-150 group"
            >
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm font-medium text-[#f7f8f8] group-hover:text-white">{channel.name}</span>
                {channel.hasSecret && <LockKeyhole className="h-3 w-3 text-[#6a6b6c]" />}
              </div>
              <div className="w-48 text-xs font-mono text-[#6a6b6c] truncate">{channel.webhookUrl}</div>
              <div className="w-24 text-right">
                <Badge className="bg-[rgba(255,255,255,0.08)] text-[#d0d6e0] text-[11px]">Active</Badge>
              </div>
            </Link>
          ))}
        </>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        itemsPerPage={limit}
        baseUrl="/?"
      />
    </div>
  );
}
