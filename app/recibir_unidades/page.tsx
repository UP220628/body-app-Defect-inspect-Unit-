'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeadCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { GradeBadge } from '@/components/units/GradeBadge';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { useUnitEvents } from '@/lib/useUnitEvents';
import { API_BASE } from '@/lib/api';

type Defect = { id: number; type: string; zone: string; grade: 'V1'|'V2'|'V3'; photoUrls?: string[] };
type Unit = {
  id: number;
  vin: string;
  market: string;
  lane: string;
  statusName: 'DELIVERED'|'SENT'|'RECEIVED'|'IN_REPAIR'|'RELEASED'|'REPORTED'|'UNAVAILABLE';
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
  const [receptionNote, setReceptionNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/units?status=DELIVERED`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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

  useUnitEvents({
    token,
    onEvent: () => {
      load();
    },
  });

  useEffect(() => {
    if (!token) return;
    load();
  }, [token, load]);

  const sentUnits = useMemo(() => units.filter(u => u.statusName === 'DELIVERED'), [units]);

  const handleViewDefects = (unit: Unit) => {
    setSelectedUnit(unit);
    setReceptionNote('');
    setIsModalOpen(true);
  };

  const handleReceiveUnit = async () => {
    if (!selectedUnit || !user) return;
    try {
      const resp = await fetch(`${API_BASE}/units/${selectedUnit.id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          newStatus: 'RECEIVED', 
          changedById: user.id,
          note: receptionNote || undefined
        })
      });
      const json = await resp.json();
      if (json?.ok) {
        setUnits(prev => prev.filter(u => u.id !== selectedUnit.id));
        setIsModalOpen(false);
        setSelectedUnit(null);
        setReceptionNote('');
        window.dispatchEvent(new CustomEvent('unitStatusChanged'));
      }
    } catch (err) {
      // Error recibiendo
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-red-50">
        <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Recibir Unidades</h1>
            <p className="text-gray-600">Unidades entregadas por WWS, pendientes de confirmar recepción</p>
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
              <p className="text-sm text-gray-600 mb-1">Unidades Pendientes</p>
              <p className="text-3xl font-bold text-gray-900">{sentUnits.length}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 mb-1">Con Defectos V1</p>
              <p className="text-3xl font-bold text-red-600">
                {sentUnits.filter((u) => (u.defects || []).some((d) => d.grade === 'V1')).length}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 mb-1">Antigüedad Promedio</p>
              <p className="text-3xl font-bold text-gray-900">~2h</p>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Listado de Unidades</h2>
          </CardHeader>
          <CardBody>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeadCell>VIN</TableHeadCell>
                  <TableHeadCell>Mercado</TableHeadCell>
                  <TableHeadCell>Carril</TableHeadCell>
                  <TableHeadCell>Defectos</TableHeadCell>
                  <TableHeadCell>Registrado por</TableHeadCell>
                  <TableHeadCell className="text-right">Acciones</TableHeadCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentUnits.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-mono font-semibold">{unit.vin}</TableCell>
                    <TableCell>{unit.market}</TableCell>
                    <TableCell>
                      <Badge variant="info">{unit.lane}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(unit.defects || []).map((defect) => (
                          <GradeBadge key={defect.id} grade={defect.grade as 'V1' | 'V2' | 'V3'}>
                            {defect.grade}
                          </GradeBadge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{unit.registeredBy || '-'}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="sm"
                        onClick={() => handleViewDefects(unit)}
                        className="bg-blue-600 hover:bg-blue-700 text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
                      >
                        <span className="hidden sm:inline">Ver & Recibir</span>
                        <span className="sm:hidden">Recibir</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </main>

      {/* Modal - Defects Detail and Receive */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Recibir Unidad: ${selectedUnit?.vin}`}
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button onClick={() => setIsModalOpen(false)} variant="secondary" className="text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2">
              Cancelar
            </Button>
            <Button onClick={handleReceiveUnit} className="bg-green-600 hover:bg-green-700 text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2">
              <span className="hidden sm:inline">Confirmar Recepción</span>
              <span className="sm:hidden">Confirmar</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Unit Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Mercado</p>
              <p className="font-semibold">{selectedUnit?.market}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Carril</p>
              <p className="font-semibold">{selectedUnit?.lane}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Registrado por</p>
              <p className="font-semibold">{selectedUnit?.registeredBy}</p>
            </div>
          </div>

          {/* Defects Checklist */}
          <div>
            <h3 className="font-semibold mb-4">Defectos Reportados</h3>
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
              {(selectedUnit?.defects || []).map((defect) => (
                <div key={defect.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <GradeBadge grade={defect.grade as 'V1' | 'V2' | 'V3'}>{defect.grade}</GradeBadge>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{defect.type}</p>
                      <p className="text-xs text-gray-600">{defect.zone}</p>
                    </div>
                  </div>
                  {(defect.photoUrls ?? []).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1 font-medium">Evidencia:</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {(defect.photoUrls ?? []).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`Foto ${i + 1}`} className="w-14 h-14 object-cover rounded border border-gray-200 hover:opacity-90 transition" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold mb-2">Notas de Recepción (Opcional)</label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Observaciones adicionales..."
              value={receptionNote}
              onChange={(e) => setReceptionNote(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
    </ProtectedRoute>
  );
}