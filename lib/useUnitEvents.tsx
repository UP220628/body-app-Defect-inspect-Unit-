'use client';

import { useEffect, useRef } from 'react';
import { API_BASE } from '@/lib/api';

type UnitEventHandler = () => void;

type UseUnitEventsOptions = {
  token: string | null;
  onEvent: UnitEventHandler;
};

export const useUnitEvents = ({ token, onEvent }: UseUnitEventsOptions) => {
  const abortRef = useRef<AbortController | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;

    let closed = false;

    const scheduleRetry = () => {
      if (!closed && !retryRef.current) {
        retryRef.current = setTimeout(() => {
          retryRef.current = null;
          if (!closed) {
            void connect();
          }
        }, 5000);
      }
    };

    const handleEventChunk = (chunk: string) => {
      if (chunk.startsWith(':')) {
        return;
      }

      let eventName = 'message';
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        }
      }

      if (eventName === 'unit-update') {
        onEvent();
      }
    };

    const connect = async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(`${API_BASE}/events/units`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error('SSE connection failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!closed) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() ?? '';

          for (const chunk of chunks) {
            handleEventChunk(chunk);
          }
        }

        scheduleRetry();
      } catch (_error) {
        scheduleRetry();
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    };

    void connect();

    return () => {
      closed = true;
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [token, onEvent]);
};
