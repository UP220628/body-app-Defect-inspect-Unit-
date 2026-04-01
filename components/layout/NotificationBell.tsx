'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dropdown } from '@/components/ui/Dropdown';
import { useAuth } from '@/lib/auth';
import { API_BASE } from '@/lib/api';

const WS_BASE = API_BASE.replace(/^http/, 'ws');

type NotificationItem = {
  id: number;
  userId: number;
  unitId: number;
  type: 'UNIT_REPORTED' | 'UNIT_RELEASED' | 'UNIT_DELIVERED' | 'UNIT_WWS_RELEASED' | 'UNIT_ACCEPTED' | 'UNIT_REJECTED' | 'UNIT_RETURNED_TO_SENT' | 'UNIT_ARCHIVED' | 'UNIT_DELETION_REQUESTED' | 'UNIT_DELETION_APPROVED' | 'UNIT_DELETION_REJECTED' | 'STATUS_CHANGED' | 'DEFECT_ADDED' | 'REPAIR_ESTIMATED' | 'WTY_PENDING' | 'WTY_RELEASED';
  message: string | null;
  isRead: boolean;
  createdAt: Date;
};

type NotificationApiItem = {
  id: number;
  userId: number;
  unitId: number;
  type: NotificationItem['type'];
  message: string | null;
  isRead: boolean;
  createdAt: string;
};

const notificationMeta: Record<NotificationItem['type'], { title: string; tone: 'high' | 'medium' | 'low' }> = {
  UNIT_REPORTED: { title: 'Unidad reportada por carrier', tone: 'high' },
  UNIT_RELEASED: { title: 'Unidad liberada en BODY', tone: 'medium' },
  UNIT_DELIVERED: { title: 'Unidad entregada a Body', tone: 'medium' },
  UNIT_WWS_RELEASED: { title: 'Unidad liberada por WWS', tone: 'medium' },
  UNIT_ACCEPTED: { title: 'Unidad aceptada por Carrier', tone: 'medium' },
  UNIT_REJECTED: { title: 'Unidad rechazada por Carrier', tone: 'high' },
  UNIT_RETURNED_TO_SENT: { title: 'Unidad rechazada regresada a WWS', tone: 'high' },
  UNIT_ARCHIVED: { title: 'Unidad archivada', tone: 'low' },
  UNIT_DELETION_REQUESTED: { title: 'Solicitud de borrado recibida', tone: 'high' },
  UNIT_DELETION_APPROVED: { title: 'Solicitud de borrado aprobada', tone: 'medium' },
  UNIT_DELETION_REJECTED: { title: 'Solicitud de borrado rechazada', tone: 'high' },
  STATUS_CHANGED: { title: 'Cambio de estado', tone: 'low' },
  DEFECT_ADDED: { title: 'Defecto agregado', tone: 'low' },
  REPAIR_ESTIMATED: { title: 'Reparación estimada', tone: 'low' },
  WTY_PENDING: { title: 'Validación WTY requerida', tone: 'high' },
  WTY_RELEASED: { title: 'Unidad aprobada por WTY', tone: 'medium' },
};

const toneColor = (tone: 'high' | 'medium' | 'low') => {
  switch (tone) {
    case 'high':
      return 'border-orange-600 bg-orange-50';
    case 'medium':
      return 'border-orange-500 bg-orange-50';
    default:
      return 'border-orange-400 bg-gray-50';
  }
};

const toneDot = (tone: 'high' | 'medium' | 'low') => {
  switch (tone) {
    case 'high':
      return 'bg-orange-600';
    case 'medium':
      return 'bg-orange-500';
    default:
      return 'bg-orange-400';
  }
};

export const NotificationBell = () => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const hasHydratedRef = useRef(false);
  const pendingSoundRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications]
  );

  const mergeNotifications = useCallback((existing: NotificationItem[], incoming: NotificationItem[]) => {
    const map = new Map<number, NotificationItem>();
    for (const item of existing) map.set(item.id, item);
    for (const item of incoming) map.set(item.id, item);

    return Array.from(map.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }, []);

  const handleDeleteNotification = async (id: number) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      setNotifications(prev => prev.filter(item => item.id !== id));
      seenIdsRef.current.delete(id);
    } catch {
      // Error eliminando notificacion
    }
  };

  const tryPlaySound = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      pendingSoundRef.current = true;
    });
  }, []);

  const registerSeen = (items: NotificationItem[]) => {
    items.forEach(item => seenIdsRef.current.add(item.id));
  };

  const playIfNew = (items: NotificationItem[]) => {
    const hasNew = items.some(item => !seenIdsRef.current.has(item.id));
    if (hasNew) {
      tryPlaySound();
    }
    registerSeen(items);
  };

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (!data?.ok) return;

      const sourceItems: NotificationApiItem[] = Array.isArray(data.data)
        ? (data.data as NotificationApiItem[])
        : [];

      const items: NotificationItem[] = sourceItems.map((item) => ({
        id: item.id,
        userId: item.userId,
        unitId: item.unitId,
        type: item.type,
        message: item.message,
        isRead: item.isRead,
        createdAt: new Date(item.createdAt),
      }));

      setNotifications(prev => mergeNotifications(prev, items));

      if (!hasHydratedRef.current) {
        registerSeen(items);
        hasHydratedRef.current = true;
      } else {
        playIfNew(items);
      }
    } catch {
      // Error cargando notificaciones
    }
  }, [mergeNotifications, token, tryPlaySound]);

  const markAllRead = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
    } catch {
      // Error marcando notificaciones
    }
  };

  const handleOpen = async () => {
    setIsOpen(true);
    await markAllRead();
  };

  useEffect(() => {
    const audio = new Audio();
    audio.src = `/sounds/notification.mp3?v=${Date.now()}`;
    audio.preload = 'auto';
    audio.onerror = () => {
      // Silenciar error si no se carga el archivo
      console.warn('No se pudo cargar el archivo de sonido de notificación');
    };
    audioRef.current = audio;
  }, [tryPlaySound]);

  useEffect(() => {
    const unlockAudio = () => {
      if (!audioRef.current) return;
      audioRef.current.volume = 0;
      audioRef.current.play().then(() => {
        audioRef.current?.pause();
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.volume = 0.2;
        }
        if (pendingSoundRef.current) {
          pendingSoundRef.current = false;
          tryPlaySound();
        }
      }).catch(() => {
        // Autoplay bloqueado hasta que haya interaccion
      });
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!user || !token) return;

    const timeoutId = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);

    const handleUnitChange = () => {
      void fetchNotifications();
    };
    window.addEventListener('unitStatusChanged', handleUnitChange);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('unitStatusChanged', handleUnitChange);
    };
  }, [user, token, fetchNotifications]);

  useEffect(() => {
    if (!token) return;

    const socket = new WebSocket(`${WS_BASE}/ws/notifications?token=${encodeURIComponent(token)}`);
    let isConnected = false;

    socket.onopen = () => {
      isConnected = true;
    };

    socket.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'notification' || !Array.isArray(data.payload)) return;

        const payload = data.payload as NotificationApiItem[];
        const incoming: NotificationItem[] = payload
          .filter((item) => !user || item.userId === user.id)
          .map((item) => ({
            id: item.id,
            userId: item.userId,
            unitId: item.unitId,
            type: item.type,
            message: item.message,
            isRead: item.isRead,
            createdAt: new Date(item.createdAt),
          }));

        if (incoming.length === 0) return;

        setNotifications(prev => mergeNotifications(prev, incoming));
        playIfNew(incoming);
      } catch {
        // Error parseando mensaje
      }
    };

    socket.onerror = () => {
      // Error de conexión - no hacer nada, se reintentará
      isConnected = false;
    };

    return () => {
      if (isConnected) {
        socket.close();
      }
    };
  }, [token, user, mergeNotifications, playIfNew]);

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleOpen}
          className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>

          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-gray-400 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>

        <Dropdown
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Notificaciones del Sistema"
          anchorRef={buttonRef}
        >
          <div className="space-y-3 p-4">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No hay notificaciones nuevas</p>
              </div>
            ) : (
              notifications.map(notification => {
                const meta =
                  notificationMeta[notification.type] ||
                  { title: 'Notificacion', tone: 'low' };
                return (
                  <div
                    key={notification.id}
                    className={`border-l-4 ${toneColor(meta.tone)} p-3 sm:p-4 rounded-r-lg relative`}
                  >
                    <button
                      type="button"
                      aria-label="Eliminar notificacion"
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-700 w-6 h-6 flex items-center justify-center text-lg"
                      onClick={() => handleDeleteNotification(notification.id)}
                    >
                      ✕
                    </button>
                    <div className="flex items-start justify-between pr-8">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">
                          {meta.title}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-700">
                          {notification.message || 'Sin detalle'}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {notification.createdAt.toLocaleTimeString('es-MX')}
                        </p>
                      </div>
                      <span
                        className={`inline-block w-3 h-3 rounded-full flex-shrink-0 ${toneDot(meta.tone)}`}
                      ></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Dropdown>
      </div>
    </>
  );
};

