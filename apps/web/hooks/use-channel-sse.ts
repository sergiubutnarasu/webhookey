"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WebhookEvent } from "@webhookey/types";

export interface SseEventMessage {
  type: "event";
  data: WebhookEvent;
}

export interface SseDeviceMessage {
  type: "device";
  count: number;
}

export type SseMessage = SseEventMessage | SseDeviceMessage;

interface UseChannelSSEOptions {
  channelId: string;
  token: string;
  onEvent?: (event: WebhookEvent) => void;
  onDeviceUpdate?: (count: number) => void;
  onError?: (error: Event) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

interface UseChannelSSEReturn {
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
}

const SSE_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const BACKOFF_MULTIPLIER = 2;

/**
 * Custom hook for managing Server-Sent Events connection to a channel.
 *
 * Single Responsibility: Handles SSE connection lifecycle only.
 * Open/Closed: Extensible for new event types via callbacks.
 * Interface Segregation: Minimal public API - callbacks injected, not managed.
 * Dependency Inversion: Hook accepts callbacks, doesn't manage state directly.
 */
export function useChannelSSE(options: UseChannelSSEOptions): UseChannelSSEReturn {
  const { channelId, token, onEvent, onDeviceUpdate, onError, onConnected, onDisconnected } =
    options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryDelayRef = useRef<number>(INITIAL_RETRY_DELAY);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const getSseUrl = useCallback(
    (channelId: string, token: string): string => {
      // SSE doesn't support custom headers, so we pass token via query param
      return `${SSE_BASE_URL}/channels/${encodeURIComponent(channelId)}/events?token=${encodeURIComponent(token)}`;
    },
    []
  );

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (isMountedRef.current) {
      setIsConnected(false);
    }
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as SseMessage;

        switch (data.type) {
          case "event":
            onEvent?.(data.data);
            break;
          case "device":
            onDeviceUpdate?.(data.count);
            break;
          default:
            // Unknown event type - silently ignore per robustness principle
            break;
        }
      } catch {
        // Invalid JSON - silently ignore
      }
    },
    [onEvent, onDeviceUpdate]
  );

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    cleanup();

    try {
      const url = getSseUrl(channelId, token);
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        setError(null);
        retryDelayRef.current = INITIAL_RETRY_DELAY; // Reset backoff on successful connection
        onConnected?.();
      };

      es.onmessage = handleMessage;

      es.onerror = (err) => {
        if (!isMountedRef.current) return;

        setIsConnected(false);
        setError(new Error("SSE connection error"));
        onError?.(err);
        onDisconnected?.();

        // Close current connection
        es.close();
        eventSourceRef.current = null;

        // Schedule reconnection with exponential backoff
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, retryDelayRef.current);

        // Increase backoff for next attempt
        retryDelayRef.current = Math.min(
          retryDelayRef.current * BACKOFF_MULTIPLIER,
          MAX_RETRY_DELAY
        );
      };
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err : new Error("Failed to connect"));
      setIsConnected(false);
    }
  }, [channelId, token, getSseUrl, handleMessage, onConnected, onDisconnected, onError, cleanup]);

  const reconnect = useCallback(() => {
    retryDelayRef.current = INITIAL_RETRY_DELAY;
    connect();
  }, [connect]);

  // Initial connection
  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [connect, cleanup]);

  // Reconnect when channelId or token changes
  useEffect(() => {
    retryDelayRef.current = INITIAL_RETRY_DELAY;
    connect();
  }, [channelId, token, connect]);

  return {
    isConnected,
    error,
    reconnect,
  };
}
