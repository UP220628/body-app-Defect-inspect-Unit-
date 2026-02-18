'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dropdown } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001';

const WS_BASE = API_BASE.replace(/^http/, 'ws');

type NotificationItem = {
  id: number;
  userId: number;
  unitId: number;
  type: 'UNIT_REPORTED' | 'UNIT_RELEASED' | 'STATUS_CHANGED' | 'DEFECT_ADDED' | 'REPAIR_ESTIMATED';
  message: string | null;
  isRead: boolean;
  createdAt: Date;
};

const notificationMeta: Record<NotificationItem['type'], { title: string; tone: 'high' | 'medium' | 'low' }> = {
  UNIT_REPORTED: { title: 'Unidad reportada por carrier', tone: 'high' },
  UNIT_RELEASED: { title: 'Unidad liberada en BODY', tone: 'medium' },
  STATUS_CHANGED: { title: 'Cambio de estado', tone: 'low' },
  DEFECT_ADDED: { title: 'Defecto agregado', tone: 'low' },
  REPAIR_ESTIMATED: { title: 'Reparacion estimada', tone: 'low' },
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

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications]
  );

  const mergeNotifications = (existing: NotificationItem[], incoming: NotificationItem[]) => {
    const map = new Map<number, NotificationItem>();
    for (const item of existing) map.set(item.id, item);
    for (const item of incoming) map.set(item.id, item);

    return Array.from(map.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  };

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
    } catch (error) {
      // Error eliminando notificacion
    }
  };

  const tryPlaySound = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      pendingSoundRef.current = true;
    });
  };

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

  const fetchNotifications = async () => {
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

      const items: NotificationItem[] = (data.data || []).map((item: any) => ({
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
    } catch (error) {
      // Error cargando notificaciones
    }
  };

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
    } catch (error) {
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
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      if (!audioRef.current) return;
      audioRef.current.volume = 0;
      audioRef.current.play().then(() => {
        audioRef.current?.pause();
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.volume = 1;
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

    fetchNotifications();

    const handleUnitChange = () => {
      fetchNotifications();
    };
    window.addEventListener('unitStatusChanged', handleUnitChange);

    return () => {
      window.removeEventListener('unitStatusChanged', handleUnitChange);
    };
  }, [user, token]);

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

        const incoming: NotificationItem[] = data.payload
          .filter((item: any) => !user || item.userId === user.id)
          .map((item: any) => ({
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
      } catch (error) {
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
  }, [token, user]);

  return (
    <>
      <div className="relative">
        <button
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

          <div className="mt-4 flex justify-end px-4 pb-4 border-t border-gray-100">
            <Button onClick={() => setIsOpen(false)} className="mt-3">Cerrar</Button>
          </div>
        </Dropdown>
      </div>
    </>
  );
};
