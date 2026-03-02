'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/units/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/auth';
import { useUnitEvents } from '@/lib/useUnitEvents';
import { API_BASE } from '@/lib/api';
import { ROLES } from '@/lib/permissions';

type Unit = {
  id: number;
  vin: string;
  market: string;
  statusName: string;
  isAvailableToday?: boolean;
  registeredBy?: string;
  scmDecision?: string;
  scmDecisionNote?: string;
  scmDecisionAt?: string;
  scmDecidedBy?: string;
  statusUpdatedAt?: string;
  createdAt: string;
};

const DECISION_LABELS: Record<string, string> = {
  LOAD_WITHOUT: 'Cargar sin esta unidad',
  WAIT: 'Esperar a reparación',
  REORGANIZE: 'Remplazo de unidad',
  NEW_TRIP: 'Nuevo viaje'
};

const DECISION_COLORS: Record<string, string> = {
  LOAD_WITHOUT: 'bg-orange-100 text-orange-800',
  WAIT: 'bg-blue-100 text-blue-800',
  REORGANIZE: 'bg-purple-100 text-purple-800',
  NEW_TRIP: 'bg-green-100 text-green-800'
};

export const DailyTrackingWidget = () => {
  const { user, token } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isDecisionModal, setIsDecisionModal] = useState(false);
  const [decision, setDecision] = useState('');
  const [decisionNote, setDecisionNote] = useState('');

  const formatMexicoDateTime = (value?: string) => {
    if (!value) return '';

    const parts = value.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!parts) return '';
    
    const [, year, month, day, hour24, minute] = parts;
    
    let hour = parseInt(hour24);
    const ampm = hour >= 12 ? 'p.m.' : 'a.m.';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    
    return `${day}/${month}, ${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
  };

  const loadUnits = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/units/today`, {
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
      // Error cargando unidades
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
  }, [token, loadUnits]);

  const unavailableUnits = units.filter(u => !u.isAvailableToday || u.statusName === 'UNAVAILABLE');
  const availableUnits = units.filter(u => u.isAvailableToday && u.statusName !== 'UNAVAILABLE');
  const needsDecision = unavailableUnits.filter(u => !u.scmDecision);

  const handleOpenDecision = (unit: Unit) => {
    setSelectedUnit(unit);
    setDecision('');
    setDecisionNote('');
    setIsDecisionModal(true);
  };

  const handleSubmitDecision = async () => {
    if (!selectedUnit || !decision || !user) return;

    try {
      const response = await fetch(`${API_BASE}/units/${selectedUnit.id}/scm-decision`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision,
          note: decisionNote,
          decidedById: user.id
        })
      });

      if (response.ok) {
        await loadUnits();
        setIsDecisionModal(false);
        setSelectedUnit(null);
        
        // Disparar evento para que NotificationBell se actualice
        window.dispatchEvent(new CustomEvent('unitStatusChanged'));
      }
    } catch (error) {
      alert('Error al guardar decisión');
    }
  };

  const isSCM = user?.roleId === ROLES.SCM;

  return (
    <>
      {/* Alerta urgente para unidades sin decisión */}
      {needsDecision.length > 0 && (
        <div className="mb-6 bg-white border border-orange-200 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-orange-900">Decisión Requerida</h3>
                <p className="text-sm text-gray-700 mt-1">
                  {needsDecision.length} unidad(es) sin decisión de SCM
                </p>
              </div>
            </div>
            {isSCM && (
              <Button variant="secondary" onClick={() => handleOpenDecision(needsDecision[0])}>
                Tomar Decisión
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Resumen del día */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Tracking del Día</h2>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Última actualización: {lastUpdate.toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{units.length}</p>
                <p className="text-sm text-gray-600">Total unidades</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{availableUnits.length}</p>
                <p className="text-sm text-gray-600">Disponibles</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{unavailableUnits.length}</p>
                <p className="text-sm text-gray-600">No disponibles</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{needsDecision.length}</p>
                <p className="text-sm text-gray-600">Requieren decisión</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {unavailableUnits.filter(u => u.scmDecision).length}
                </p>
                <p className="text-sm text-gray-600">Con decisión SCM</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Unidades no disponibles */}
        {unavailableUnits.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full"></span>
                Unidades No Disponibles ({unavailableUnits.length})
              </h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {unavailableUnits.map(unit => (
                  <div key={unit.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{unit.vin}</p>
                        <p className="text-sm text-gray-600">{unit.market}</p>
                      </div>
                      <StatusBadge status={unit.statusName} />
                    </div>
                    
                    {unit.scmDecision ? (
                      <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-center justify-between mb-1">
                          <Badge className={DECISION_COLORS[unit.scmDecision]}>
                            {DECISION_LABELS[unit.scmDecision]}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatMexicoDateTime(unit.scmDecisionAt)}
                          </span>
                        </div>
                        {unit.scmDecisionNote && (
                          <p className="text-xs text-gray-700 mt-1">{unit.scmDecisionNote}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Decidido por: {unit.scmDecidedBy}</p>
                      </div>
                    ) : (
                      <div className="mt-2">
                        {isSCM ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenDecision(unit)}
                            className="w-full"
                          >
                            Asignar Decisión SCM
                          </Button>
                        ) : (
                          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                           Esperando decisión de SCM
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Tabla de todas las unidades del día */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Todas las Unidades del Día ({units.length})
          </h3>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : units.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay unidades registradas hoy
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      VIN
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Mercado
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Estado actual de la unidad
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Unidad disponible para el día de hoy
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Registrado por
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Fecha/Hora
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {units.map(unit => (
                    <tr key={unit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                        {unit.vin}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {unit.market}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <StatusBadge status={unit.statusName} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          {unit.isAvailableToday && unit.statusName !== 'UNAVAILABLE' ? (
                            <Badge className="bg-green-100 text-green-800">
                              Si
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              No
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {unit.registeredBy}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">
                        {formatMexicoDateTime(unit.statusUpdatedAt || unit.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal de decisión SCM */}
      {isDecisionModal && selectedUnit && (
        <Modal
          isOpen={isDecisionModal}
          onClose={() => setIsDecisionModal(false)}
          title="Decisión SCM para Unidad No Disponible"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">VIN:</p>
              <p className="font-semibold text-gray-900">{selectedUnit.vin}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Qué se hará con esta unidad?
              </label>
              <div className="space-y-2">
                {Object.entries(DECISION_LABELS).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="decision"
                      value={value}
                      checked={decision === value}
                      onChange={(e) => setDecision(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas adicionales (opcional)
              </label>
              <textarea
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Detalles adicionales sobre la decisión..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setIsDecisionModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitDecision} disabled={!decision}>
                Guardar Decisión
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
