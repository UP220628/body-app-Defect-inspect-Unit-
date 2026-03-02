'use client';

import { useEffect, useRef } from 'react';
import { API_BASE } from '@/lib/api';

type UnitEventHandler = () => void;

type UseUnitEventsOptions = {
  token: string | null;
  onEvent: UnitEventHandler;
};

export const useUnitEvents = ({ token, onEvent }: UseUnitEventsOptions) => {
  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;

    const connect = () => {
      const url = `${API_BASE}/events/units?token=${encodeURIComponent(token)}`;
      const source = new EventSource(url);
      sourceRef.current = source;

      source.addEventListener('unit-update', () => {
        onEvent();
      });

      source.onerror = () => {
        source.close();
        sourceRef.current = null;

        if (!retryRef.current) {
          retryRef.current = setTimeout(() => {
            retryRef.current = null;
            connect();
          }, 5000);
        }
      };
    };

    connect();

    return () => {
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [token, onEvent]);
};
