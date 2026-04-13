import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { createApiClient } from "../../../lib/api";
import { ApiError } from "../../../lib/api-error";
import { DeleteChannelButton } from "./DeleteChannelButton";
import { CopyButton } from "./CopyButton";
import { DisconnectAllButton } from "./DisconnectAllButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <main className="p-6 max-w-4xl mx-auto">
        <div className="mb-2">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-pastel"
          >
            ← Back to channels
          </Link>
        </div>

        <Card className="mb-6 shadow-soft">
          <CardHeader className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                  {channel.name}
                  {channel.hasSecret && (
                    <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription className="font-mono text-xs mt-2 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    {channel.webhookUrl}
                    <CopyButton text={channel.webhookUrl} />
                  </div>

                  <div className="flex gap-2 items-center">
                    <Badge variant="secondary">
                      {(channel.connectedDevices || 0) === 0
                        ? "No devices connected"
                        : channel.connectedDevices > 1
                          ? `${channel.connectedDevices} devices connected`
                          : "1 device connected"}
                    </Badge>
                    {(channel.connectedDevices || 0) > 0 && (
                      <DisconnectAllButton id={channel.id} />
                    )}
                  </div>
                </CardDescription>
              </div>
              <DeleteChannelButton id={channel.id} name={channel.name} />
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Events <Badge variant="secondary">{events.total}</Badge>
          </h2>

          <div className="space-y-3">
            {events.data.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No events received yet.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Send a webhook to the URL above to see events here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              events.data.map((event) => (
                <Card
                  key={event.id}
                  className="hover:bg-accent/30 transition-pastel"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Badge variant={event.verified ? "success" : "outline"}>
                        {event.verified ? "Verified" : "Unverified"}
                      </Badge>
                      <span className="text-sm font-medium">
                        {event.status}
                      </span>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString()}
                    </time>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={events.total}
            itemsPerPage={limit}
            baseUrl={`/channels/${params.id}?`}
          />
        </div>
      </main>
    );
  } catch (e: any) {
    if (e instanceof ApiError && e.statusCode === 403) {
      redirect("/forbidden");
    }
    notFound();
  }
}
