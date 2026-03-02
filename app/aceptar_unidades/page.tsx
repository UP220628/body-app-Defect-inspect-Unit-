'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeadCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { GradeBadge } from '@/components/units/GradeBadge';
import { StatusBadge } from '@/components/units/StatusBadge';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { useUnitEvents } from '@/lib/useUnitEvents';
import { API_BASE } from '@/lib/api';

type Defect = { id: number; type: string; zone: string; grade: 'V1'|'V2'|'V3' };
type Unit = {
  id: number;
  vin: string;
  market: string;
  lane: string;
  statusName: string;
  defects?: Defect[];
  registeredBy?: string;
  createdAt?: string;
};

export default function Page() {
  const { user, token } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/units?status=WWS_RELEASED`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await r.json();
      if (data?.ok && Array.isArray(data.data)) {
        setUnits(data.data);
        setLastUpdate(new Date());
      }
    } catch (err) {
      // Error cargando unidades
    } finally {
      setLoading(false);
    }
  }, [token]);

  useUnitEvents({ token, onEvent: () => load() });

  useEffect(() => {
    if (!token) return;
    load();
  }, [token, load]);

  const pendingUnits = useMemo(() => units.filter(u => u.statusName === 'WWS_RELEASED'), [units]);

  const handleViewUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsModalOpen(true);
  };

  const handleAcceptUnit = async () => {
    if (!selectedUnit || !user) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/units/${selectedUnit.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ newStatus: 'ACCEPTED', changedById: user.id })
      });
      const json = await resp.json();
      if (json?.ok) {
        setUnits(prev => prev.filter(u => u.id !== selectedUnit.id));
        setIsModalOpen(false);
        setSelectedUnit(null);
        window.dispatchEvent(new CustomEvent('unitStatusChanged'));
      }
    } catch (err) {
      // Error aceptando unidad
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-red-50">
        <Header />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Aceptar Unidades</h1>
              <p className="text-gray-600">Unidades liberadas por WWS pendientes de aceptación por Carrier.</p>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Última actualización: {lastUpdate.toLocaleTimeString('es-MX')}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardBody>
                <p className="text-sm text-gray-600 mb-1">Pendientes de Aceptación</p>
                <p className="text-3xl font-bold text-gray-900">{pendingUnits.length}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-sm text-gray-600 mb-1">Con Defectos V1</p>
                <p className="text-3xl font-bold text-red-600">
                  {pendingUnits.filter(u => (u.defects || []).some(d => d.grade === 'V1')).length}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-sm text-gray-600 mb-1">Con Defectos V2/V3</p>
                <p className="text-3xl font-bold text-amber-600">
                  {pendingUnits.filter(u => (u.defects || []).some(d => d.grade === 'V2' || d.grade === 'V3')).length}
                </p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Unidades Liberadas por WWS</h2>
            </CardHeader>
            <CardBody>
              {pendingUnits.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <p className="text-lg">No hay unidades pendientes de aceptación</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeadCell>VIN</TableHeadCell>
                      <TableHeadCell>Mercado</TableHeadCell>
                      <TableHeadCell>Carril</TableHeadCell>
                      <TableHeadCell>Estado</TableHeadCell>
                      <TableHeadCell>Defectos</TableHeadCell>
                      <TableHeadCell className="text-right">Acciones</TableHeadCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUnits.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-mono font-semibold">{unit.vin}</TableCell>
                        <TableCell>{unit.market}</TableCell>
                        <TableCell>
                          <Badge variant="info">{unit.lane}</Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={unit.statusName} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(unit.defects || []).map((defect) => (
                              <GradeBadge key={defect.id} grade={defect.grade}>
                                {defect.grade}
                              </GradeBadge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="sm"
                            onClick={() => handleViewUnit(unit)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
                          >
                            <span className="hidden sm:inline">Ver y Aceptar</span>
                            <span className="sm:hidden">Aceptar</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </main>

        {/* Modal - Ver detalles y aceptar */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Aceptar Unidad: ${selectedUnit?.vin}`}
          size="lg"
          footer={
            <div className="flex gap-2">
              <Button onClick={() => setIsModalOpen(false)} variant="secondary" className="text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2">
                Cancelar
              </Button>
              <Button
                onClick={handleAcceptUnit}
                disabled={loading}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium shadow-sm text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2"
              >
                <span className="hidden sm:inline">Confirmar Aceptación</span>
                <span className="sm:hidden">Confirmar</span>
              </Button>
            </div>
          }
        >
          {selectedUnit && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">VIN</p>
                  <p className="font-mono font-semibold">{selectedUnit.vin}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mercado</p>
                  <p className="font-semibold">{selectedUnit.market}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Carril</p>
                  <p className="font-semibold">{selectedUnit.lane}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estado</p>
                  <StatusBadge status={selectedUnit.statusName} />
                </div>
              </div>

              {/* Defectos */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Defectos ({(selectedUnit.defects||[]).length})</h3>
                {(selectedUnit.defects||[]).length > 0 ? (
                  <div className="space-y-2 p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                    {(selectedUnit.defects || []).map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded">
                        <div>
                          <p className="font-semibold text-sm">{d.type}</p>
                          <p className="text-xs text-gray-600">{d.zone}</p>
                        </div>
                        <GradeBadge grade={d.grade}>{d.grade}</GradeBadge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">Sin defectos registrados</p>
                )}
              </div>

              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-sm text-emerald-800">
                  Al aceptar esta unidad, confirmas que la recibes de vuelta tras el proceso de reparación y liberación por WWS.
                </p>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
