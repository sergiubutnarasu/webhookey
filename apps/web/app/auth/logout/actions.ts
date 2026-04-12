"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createApiClient } from "../../../lib/api";

export async function logout(): Promise<void> {
  const cookieStore = cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (refreshToken) {
    const api = createApiClient(undefined, refreshToken);
    try {
      await api.logout(refreshToken);
    } catch (e) {
      // Ignore errors - still clear local tokens
    }
  }

  // Clear cookies
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");

  redirect("/auth/login");
}
