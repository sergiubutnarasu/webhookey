import { ApiError } from "./api-error";
import { Channel, WebhookEvent, PaginatedResponse } from "@webhookey/types";

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000";

export interface ApiClient {
  getChannels(): Promise<Channel[]>;
  getChannel(id: string): Promise<Channel>;
  createChannel(
    name: string,
    generateSecret?: boolean,
    retentionDays?: number,
  ): Promise<Channel & { secret: string }>;
  deleteChannel(id: string): Promise<void>;
  disconnectAll(id: string): Promise<void>;
  getEvents(
    channelId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponse<WebhookEvent>>;
  login(
    email: string,
    password: string,
  ): Promise<{ access_token: string; refresh_token: string }>;
  logout(refreshToken: string): Promise<void>;
  signup(
    email: string,
    password: string,
    name: string,
  ): Promise<{ access_token: string; refresh_token: string }>;
  activateDevice(userCode: string): Promise<{ approved: boolean }>;
  getMe(): Promise<{ id: string; email: string; name: string }>;
  updateProfile(name: string): Promise<{ id: string; email: string; name: string }>;
  updatePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }>;
}

export function createApiClient(token?: string, refreshToken?: string): ApiClient {
  let accessToken = token;

  const doFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      credentials: "include",
    });
  };

  const fetchJson = async <T = unknown>(path: string, options: RequestInit = {}): Promise<T> => {
    let res = await doFetch(path, options);

    if (res.status === 401) {
      let refreshRes: Response | null = null;

      if (typeof window !== "undefined") {
        // Client-side: use cookies
        refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
      } else if (refreshToken) {
        // SSR: use refresh token from body
        refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      }

      if (refreshRes?.ok) {
        const tokens = await refreshRes.json() as { access_token: string };
        accessToken = tokens.access_token;
        res = await doFetch(path, options);
      } else if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
        throw new Error("Session expired");
      }
    }

    if (!res.ok) {
      const error: any = await res
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new ApiError(error.message || error.error || "Request failed", res.status);
    }

    return res.json() as Promise<T>;
  };

  return {
    getChannels: () => fetchJson<Channel[]>("/channels"),
    getChannel: (id) => fetchJson<Channel>(`/channels/${id}`),
    createChannel: (name, generateSecret = true, retentionDays) =>
      fetchJson<Channel & { secret: string }>("/channels", {
        method: "POST",
        body: JSON.stringify({ name, generateSecret, retentionDays }),
      }),
    deleteChannel: (id) => fetchJson<void>(`/channels/${id}`, { method: "DELETE" }),
    disconnectAll: (id) => fetchJson<void>(`/channels/${id}/connections`, { method: "DELETE" }),
    getEvents: (channelId, page = 1, limit = 20) =>
      fetchJson<PaginatedResponse<WebhookEvent>>(`/channels/${channelId}/events?page=${page}&limit=${limit}`),
    login: (email, password) =>
      fetchJson<{ access_token: string; refresh_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    logout: (refreshToken) =>
      fetchJson<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),
    signup: (email, password, name) =>
      fetchJson<{ access_token: string; refresh_token: string }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      }),
    activateDevice: (userCode) =>
      fetchJson<{ approved: boolean }>("/auth/activate", {
        method: "POST",
        body: JSON.stringify({ user_code: userCode }),
      }),
    getMe: () => fetchJson<{ id: string; email: string; name: string }>("/auth/me"),
    updateProfile: (name) =>
      fetchJson<{ id: string; email: string; name: string }>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    updatePassword: (currentPassword, newPassword) =>
      fetchJson<{ success: boolean }>("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  };
}
