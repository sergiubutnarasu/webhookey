"use server";

import { revalidatePath } from "next/cache";
import { createApiClient } from "lib/api";
import { cookies } from "next/headers";

export async function createChannelAction(
  name: string,
  generateSecret: boolean,
  retentionDays: number | undefined,
) {
  const cookieStore = cookies();
  const token = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!token) {
    throw new Error("Unauthorized");
  }

  const api = createApiClient(token, refreshToken);
  const channel = await api.createChannel(name, generateSecret, retentionDays);

  // Revalidate the home page to refresh the channel list
  revalidatePath("/");

  return channel;
}
