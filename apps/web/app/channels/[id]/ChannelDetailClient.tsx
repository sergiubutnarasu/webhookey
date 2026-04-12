"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Channel, WebhookEvent } from "@webhookey/types";
import { useChannelSSE } from "../../../hooks/use-channel-sse";
import { CopyButton } from "./CopyButton";
import { DeleteChannelButton } from "./DeleteChannelButton";
import { DisconnectAllButton } from "./DisconnectAllButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ChannelDetailClientProps {
  channel: Channel;
  initialEvents: WebhookEvent[];
  token: string;
}

/**
 * Client component for real-time channel updates via SSE.
 *
 * Single Responsibility: Manages client-side state and SSE integration.
 * Dependency Inversion: Uses useChannelSSE hook with callbacks for updates.
 */
export function ChannelDetailClient({
  channel: initialChannel,
  initialEvents,
  token,
}: ChannelDetailClientProps) {
  const [channel, setChannel] = useState<Channel>(initialChannel);
  const [events, setEvents] = useState<WebhookEvent[]>(initialEvents);

  const handleEvent = useCallback((newEvent: WebhookEvent) => {
    setEvents((prev) => [newEvent, ...prev]);
  }, []);

  const handleDeviceUpdate = useCallback((count: number) => {
    setChannel((prev) => ({
      ...prev,
      connectedDevices: count,
    }));
  }, []);

  const { isConnected, error } = useChannelSSE({
    channelId: channel.id,
    token,
    onEvent: handleEvent,
    onDeviceUpdate: handleDeviceUpdate,
  });

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
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Events
          </h2>
          <Badge variant="secondary">{events.length}</Badge>
          {isConnected ? (
            <Badge variant="success" className="text-xs">
              Live
            </Badge>
          ) : error ? (
            <Badge variant="destructive" className="text-xs">
              Disconnected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Connecting...
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {events.length === 0 ? (
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
            events.map((event) => (
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
      </div>
    </main>
  );
}
