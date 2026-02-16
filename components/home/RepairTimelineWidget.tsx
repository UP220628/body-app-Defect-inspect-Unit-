'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/units/StatusBadge';
import { useAuth } from '@/lib/auth';
import { useUnitEvents } from '@/lib/useUnitEvents';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

type UnitInRepair = {
  id: number;
  vin: string;
  estimatedRepairHours: number;
  estimatedCompletionDate: string | null;
  updatedAt: string;
};

export const RepairTimelineWidget = () => {
  const { token } = useAuth();
  const [units, setUnits] = useState<UnitInRepair[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const formatMexicoDateTime = (value?: string | null) => {
    if (!value) return 'Calculando...';

    const date = new Date(value);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    // Si ya pasó
    if (diffMs < 0) {
      return 'Completado';
    }

    // Si es hoy
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      const hour = date.getHours();
      const minute = date.getMinutes();
      const ampm = hour >= 12 ? 'p.m.' : 'a.m.';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `Hoy ${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;
    }

    // Si es mañana
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
      const hour = date.getHours();
      const minute = date.getMinutes();
      const ampm = hour >= 12 ? 'p.m.' : 'a.m.';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `Mañana ${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;
    }

    // Formato completo
    const parts = value.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!parts) return value;
    
    const [, year, month, day, hour24, minute] = parts;
    
    let hour = parseInt(hour24);
    const ampm = hour >= 12 ? 'p.m.' : 'a.m.';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    
    return `${day}/${month} ${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
  };

  const getRemainingTime = (estimatedCompletionDate: string | null): string => {
    if (!estimatedCompletionDate) return '-';

    const now = new Date();
    const completionDate = new Date(estimatedCompletionDate);
    const diffMs = completionDate.getTime() - now.getTime();

    if (diffMs < 0) return 'Completado';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      const hours = diffHours % 24;
      return `${days}d ${hours}h`;
    }

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }

    return `${diffMinutes}m`;
  };

  const loadUnits = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/units/in-repair`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data?.ok) {
        setUnits(data.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error loading units in repair:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useUnitEvents({
    token,
    onEvent: () => {
      // Recargar cuando cambia el estado o se actualiza el tiempo
      loadUnits();
    },
  });

  useEffect(() => {
    if (!token) return;
    loadUnits();
    
    // Actualizar cada minuto para mantener los tiempos relativos actualizados
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [token, loadUnits]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-gray-900">
            <span className="mr-2">⏱️</span>
            Línea de Tiempo de Reparaciones
          </h2>
          <p className="text-sm text-gray-600">Tiempos estimados de finalización</p>
        </CardHeader>
        <CardBody>
          <p className="text-gray-600 text-center py-8">Cargando...</p>
        </CardBody>
      </Card>
    );
  }

  if (units.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-gray-900">
            <span className="mr-2">⏱️</span>
            Línea de Tiempo de Reparaciones
          </h2>
          <p className="text-sm text-gray-600">Tiempos estimados de finalización</p>
        </CardHeader>
        <CardBody>
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-gray-600 font-medium">No hay unidades en reparación actualmente</p>
            <p className="text-sm text-gray-500 mt-2">Las unidades en proceso aparecerán aquí</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              <span className="mr-2">⏱️</span>
              Línea de Tiempo de Reparaciones
            </h2>
            <p className="text-sm text-gray-600">
              {units.length} {units.length === 1 ? 'unidad' : 'unidades'} en reparación
            </p>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            {lastUpdate.toLocaleTimeString('es-MX')}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-3">
          {units.map((unit, index) => {
            const remaining = getRemainingTime(unit.estimatedCompletionDate);
            const isCompleted = remaining === 'Completado';

            return (
              <div
                key={unit.id}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isCompleted
                    ? 'bg-green-50 border-green-300'
                    : index === 0
                    ? 'bg-blue-50 border-blue-300 shadow-md'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                {/* Order indicator */}
                <div className={`absolute -left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : index === 0
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-400 text-white'
                }`}>
                  {index + 1}
                </div>

                <div className="ml-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono font-bold text-gray-900 mb-1">{unit.vin}</p>
                      <StatusBadge status="IN_REPAIR" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600 mb-1">Tiempo restante</p>
                      <p className={`text-lg font-bold ${
                        isCompleted ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {remaining}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Horas Estimadas</p>
                      <p className="font-semibold text-gray-900">
                        {unit.estimatedRepairHours.toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Finalización Estimada</p>
                      <p className="font-semibold text-gray-900">
                        {formatMexicoDateTime(unit.estimatedCompletionDate)}
                      </p>
                    </div>
                  </div>

                  {index === 0 && !isCompleted && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="flex items-center gap-2 text-blue-700 text-xs font-medium">
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        En proceso - Próxima en completarse
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-600 mb-1">Total de Horas</p>
              <p className="text-2xl font-bold text-gray-900">
                {units.reduce((acc, u) => acc + u.estimatedRepairHours, 0).toFixed(1)}h
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Última Finalización</p>
              <p className="text-sm font-bold text-gray-900">
                {units.length > 0 && units[units.length - 1].estimatedCompletionDate
                  ? formatMexicoDateTime(units[units.length - 1].estimatedCompletionDate)
                  : '-'}
              </p>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
