import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createApiClient } from "../../../lib/api";
import { ApiError } from "../../../lib/api-error";
import { ChannelDetailClient } from "./ChannelDetailClient";

interface Props {
  params: { id: string };
}

/**
 * Server Component for channel detail page.
 *
 * Handles initial data fetching server-side, then passes data to
 * ChannelDetailClient for real-time updates via SSE.
 */
export default async function ChannelPage({ params }: Props) {
  const cookieStore = cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect("/auth/login");
  }

  const api = createApiClient(token, cookieStore.get("refresh_token")?.value);

  try {
    const [channel, events] = await Promise.all([
      api.getChannel(params.id),
      api.getEvents(params.id),
    ]);

    return (
      <ChannelDetailClient
        channel={channel}
        initialEvents={events.data}
        token={token}
      />
    );
  } catch (e: any) {
    if (e instanceof ApiError && e.statusCode === 403) {
      redirect("/forbidden");
    }
    notFound();
  }
}
