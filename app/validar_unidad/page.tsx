'use client';

import { useCallback, useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Table, TableBody, TableHeader, TableRow, TableCell, TableHeadCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { GradeBadge } from '@/components/units/GradeBadge';
import { Badge } from '@/components/ui/Badge';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { useUnitEvents } from '@/lib/useUnitEvents';
import { API_BASE } from '@/lib/api';

type Defect = {
  id: number;
  type: string;
  zone: string;
  grade: 'V1' | 'V2' | 'V3';
};

type Unit = {
  id: number;
  vin: string;
  market: string;
  lane: string;
  statusName: string;
  wtyComment?: string | null;
  defects?: Defect[];
};

const ValidarUnidadPage = () => {
  const { user, token } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [selected, setSelected] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/units?status=WTY_PENDING`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (data?.ok && Array.isArray(data.data)) {
        setUnits(data.data);
      }
    } finally {
      setLoading(false);
      setLastUpdate(new Date());
    }
  }, [token]);

  useUnitEvents({ token, onEvent: () => load() });

  useEffect(() => {
    if (!token) return;
    load();
  }, [token, load]);

  const updateStatus = async (unitId: number, newStatus: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/units/${unitId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newStatus, changedById: user.id }),
      });
      const json = await resp.json();
      if (json?.ok) {
        setUnits(prev => prev.filter(u => u.id !== unitId));
        setSelected(null);
        window.dispatchEvent(new CustomEvent('unitStatusChanged'));
      }
    } finally {
      setLoading(false);
    }
  };

  const defectSummary = (defects: Defect[]) => {
    return defects.reduce((acc, d) => {
      acc[d.grade] = (acc[d.grade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-red-50">
        <Header />

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Header */}
          <div className="mb-6 md:mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">
                Validación WTY - SCM_Quality
              </h1>
              <p className="text-sm md:text-base text-gray-600">
                Confirma la liberación de unidades enviadas por WWS con defectos V2/V3.
              </p>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {lastUpdate.toLocaleTimeString('es-MX')}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardBody>
                <p className="text-sm text-gray-600 mb-1">Pendientes de Validar</p>
                <p className="text-3xl font-bold text-purple-600">{units.length}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-sm text-gray-600 mb-1">Con defecto V2</p>
                <p className="text-3xl font-bold text-amber-600">
                  {units.filter(u => (u.defects || []).some(d => d.grade === 'V2')).length}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-sm text-gray-600 mb-1">Solo V3</p>
                <p className="text-3xl font-bold text-blue-600">
                  {units.filter(u =>
                    (u.defects || []).length > 0 &&
                    (u.defects || []).every(d => d.grade === 'V3')
                  ).length}
                </p>
              </CardBody>
            </Card>
          </div>

          {/* Tabla */}
          <Card>
            <CardHeader>
              <h2 className="text-base md:text-lg font-semibold">
                Unidades Pendientes de Validación
              </h2>
            </CardHeader>
            <CardBody>
              {units.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <p className="text-lg font-medium mb-1">No hay unidades pendientes</p>
                  <p className="text-sm">Cuando WWS solicite validación, aparecerán aquí.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeadCell>VIN</TableHeadCell>
                      <TableHeadCell>Mercado</TableHeadCell>
                      <TableHeadCell>Carril</TableHeadCell>
                      <TableHeadCell>Defectos</TableHeadCell>
                      <TableHeadCell>Comentario WWS</TableHeadCell>
                      <TableHeadCell className="text-right">Acciones</TableHeadCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map(u => {
                      const summary = defectSummary(u.defects || []);
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-mono font-semibold text-xs md:text-sm">
                            {u.vin}
                          </TableCell>
                          <TableCell>{u.market}</TableCell>
                          <TableCell>
                            <Badge variant="info">{u.lane}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {Object.entries(summary).map(([grade, count]) => (
                                <GradeBadge key={grade} grade={grade as 'V1' | 'V2' | 'V3'}>
                                  {grade} ×{count}
                                </GradeBadge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {u.wtyComment ? (
                              <span className="text-xs text-gray-700 italic max-w-[150px] block truncate">
                                &quot;{u.wtyComment}&quot;
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="sm"
                              onClick={() => setSelected(u)}
                              className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5"
                            >
                              Revisar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </main>

        {/* Modal de revisión */}
        <Modal
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          title={`Validar: ${selected?.vin ?? ''}`}
          size="lg"
          footer={
            <div className="flex gap-3 justify-between items-center w-full">
              <Button
                onClick={() => setSelected(null)}
                variant="secondary"
                size="sm"
              >
                Cerrar
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => selected && updateStatus(selected.id, 'SENT')}
                  size="sm"
                  className="bg-red-500 hover:bg-red-200 text-red-700 border border-red-300 text-xs px-3 py-1.5"
                  disabled={loading}
                >
                  Rechazar — Enviar a Body
                </Button>
                <Button
                  onClick={() => selected && updateStatus(selected.id, 'WTY_RELEASED')}
                  size="sm"
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold text-xs px-3 py-1.5"
                  disabled={loading}
                >
                  ✓ Confirmar Liberación WTY
                </Button>
              </div>
            </div>
          }
        >
          {selected && (
            <div className="space-y-5">
              {/* Info general */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">VIN</p>
                  <p className="font-mono font-semibold text-sm break-all">{selected.vin}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Mercado</p>
                  <p className="font-semibold text-sm">{selected.market}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Carril</p>
                  <p className="font-semibold text-sm">{selected.lane}</p>
                </div>
              </div>

              {/* Comentario de WWS */}
              {selected.wtyComment && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-semibold text-blue-700 mb-1"> Comentario de WWS</p>
                  <p className="text-sm text-blue-900 italic">&quot;{selected.wtyComment}&quot;</p>
                </div>
              )}

              {/* Lista de defectos */}
              <div>
                <h3 className="font-semibold text-sm text-gray-900 mb-2">
                  Defectos ({(selected.defects || []).length})
                </h3>
                {(selected.defects || []).length === 0 ? (
                  <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                    Sin defectos registrados.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(selected.defects || []).map(d => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                      >
                        <div>
                          <p className="font-semibold text-sm">{d.type}</p>
                          <p className="text-xs text-gray-500">{d.zone}</p>
                        </div>
                        <GradeBadge grade={d.grade}>{d.grade}</GradeBadge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Criterio */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-800 mb-1">Criterio de validación</p>
                <p className="text-xs text-amber-700">
                  Revisa los defectos con base en el criterio WTY. Si cumplen el estándar de
                  calidad, confirma la liberación. Si no, rechaza para que Body retome la
                  reparación.
                </p>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ProtectedRoute>
  );
};

export default ValidarUnidadPage;
