'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';
import { useUnitEvents } from '@/lib/useUnitEvents';
import { API_BASE } from '@/lib/api';

type UnitInRepair = {
  id: number;
  vin: string;
  estimatedRepairHours: number;
  estimatedCompletionDate: string | null;
  updatedAt: string;
  providerId: number | null;
  providerName: string | null;
};

export const RepairTimelineWidget = () => {
  const { token } = useAuth();
  const [units, setUnits] = useState<UnitInRepair[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const formatMexicoDateTime = (value?: string | null) => {
    if (!value) return 'Sin estimar';

    const date = new Date(value);
    const now = new Date();

    // Si ya pasó
    const diffMs = date.getTime() - now.getTime();
    if (diffMs < 0) {
      return 'Tiempo excedido';
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
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error loading units in repair');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useUnitEvents({
    token,
    onEvent: () => {
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

  // Agrupar unidades por proveedor
  const unitsByProvider = useMemo(() => {
    const grouped = new Map<string, UnitInRepair[]>();
    
    units.forEach(unit => {
      const providerKey = unit.providerName || 'Sin Proveedor';
      if (!grouped.has(providerKey)) {
        grouped.set(providerKey, []);
      }
      grouped.get(providerKey)!.push(unit);
    });

    return Array.from(grouped.entries())
      .map(([provider, units]) => ({ provider, units }))
      .sort((a, b) => a.provider.localeCompare(b.provider));
  }, [units]);

  // Calcular totales
  const totalHours = useMemo(() => {
    return units.reduce((acc, u) => acc + (typeof u.estimatedRepairHours === 'number' ? u.estimatedRepairHours : 0), 0);
  }, [units]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-gray-900">
            Tiempos Aproximados de Reparación
          </h2>
          <p className="text-sm text-gray-600">Por proveedor</p>
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
            Tiempos Aproximados de Reparación
          </h2>
          <p className="text-sm text-gray-600">Por proveedor</p>
        </CardHeader>
        <CardBody>
          <div className="text-center py-8">
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
              Tiempos Aproximados de Reparación
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
        {/* Resumen - Arriba */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-blue-700 mb-1">Total de Unidades</p>
              <p className="text-2xl font-bold text-blue-900">{units.length}</p>
            </div>
            <div>
              <p className="text-xs text-blue-700 mb-1">Total de Horas Estimadas</p>
              <p className="text-2xl font-bold text-blue-900">
                {totalHours.toFixed(1)}h
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
          <p className="text-xs text-yellow-800 font-medium mb-1">
            Nota Importante
          </p>
          <p className="text-xs text-yellow-700">
            Los tiempos mostrados son aproximados y pueden variar según la carga de trabajo actual. 
            Estos estimados no son exactos y están sujetos a cambios.
          </p>
        </div>

        {/* Unidades agrupadas por proveedor */}
        <div className="space-y-6">
          {unitsByProvider.map(({ provider, units: providerUnits }) => (
            <div key={provider} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Header del proveedor */}
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">{provider}</h3>
                  <span className="text-sm text-gray-600">
                    {providerUnits.length} {providerUnits.length === 1 ? 'unidad' : 'unidades'}
                  </span>
                </div>
              </div>

              {/* Lista de unidades del proveedor */}
              <div className="divide-y divide-gray-200">
                {providerUnits.map((unit) => (
                  <div key={unit.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-mono font-bold text-gray-900 mb-2">{unit.vin}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Horas Estimadas</p>
                            <p className="font-semibold text-gray-900">
                              {typeof unit.estimatedRepairHours === 'number' ? unit.estimatedRepairHours.toFixed(1) : '0.0'}h
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Finalización Aproximada</p>
                            <p className="font-semibold text-gray-900">
                              {formatMexicoDateTime(unit.estimatedCompletionDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};
