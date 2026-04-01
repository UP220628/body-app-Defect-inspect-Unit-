'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeadCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { GradeBadge } from '@/components/units/GradeBadge';
import { StatusBadge } from '@/components/units/StatusBadge';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { useUnitEvents } from '@/lib/useUnitEvents';
import { API_BASE } from '@/lib/api';

type Defect = { id: number; type: string; zone: string; grade: 'V1'|'V2'|'V3'; resolved?: boolean };
type Unit = {
  id: number;
  vin: string;
  statusName: 'RECEIVED'|'IN_REPAIR'|'RELEASED'|'UNAVAILABLE';
  priorityRank?: number;
  priorityNote?: string;
  estimatedRepairHours?: number;
  estimatedCompletionDate?: string;
  defects?: Defect[];
  isAvailableToday?: boolean;
};

type StatusUpdatePayload = {
  newStatus: 'IN_REPAIR' | 'RELEASED' | 'UNAVAILABLE';
  changedById: number;
  estimatedRepairHours?: number;
  note?: string;
  isAvailableToday?: boolean;
};

type PriorityUnitApi = { id: number; priorityRank?: number };

const repairCatalog = [
  { grade: 'V1', hours: 8, label: 'Grave - 8h' },
  { grade: 'V2', hours: 4, label: 'Moderado - 4h' },
  { grade: 'V3', hours: 2, label: 'Leve - 2h' },
];

export default function Page() {
  const { user, token } = useAuth();
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isRepairModal, setIsRepairModal] = useState(false);
  const [isEditTimeModal, setIsEditTimeModal] = useState(false);
  const [isUnavailableModal, setIsUnavailableModal] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string>('');
  const [estimatedHours, setEstimatedHours] = useState<string>('');
  const [repairNote, setRepairNote] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pending' | 'inProgress' | 'unavailable'>('pending');
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statuses = ['RECEIVED', 'IN_REPAIR', 'UNAVAILABLE'];
      const results: Unit[] = [];
      for (const st of statuses) {
        const r = await fetch(`${API_BASE}/units?status=${st}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const j = await r.json();
        if (j?.ok && Array.isArray(j.data)) {
          results.push(...j.data);
        }
      }
      setAllUnits(results);
      setLastUpdate(new Date());
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
    load();
  }, [load]);

  const handleStartRepair = (unit: Unit) => {
    setSelectedUnit(unit);
    const suggestedHours = (unit.defects || []).reduce((acc, defect) => {
      const catalogItem = repairCatalog.find((item) => item.grade === defect.grade);
      return acc + (catalogItem?.hours || 0);
    }, 0);
    setEstimatedHours(suggestedHours.toString());
    setRepairNote('');
    setIsRepairModal(true);
  };

  const handleConfirmRepair = async () => {
    if (!selectedUnit || !user) return;
    
    // Si la unidad está IN_REPAIR, liberar (RELEASED)
    // Si está RECEIVED, iniciar reparación (IN_REPAIR)
    const newStatus = selectedUnit.statusName === 'IN_REPAIR' ? 'RELEASED' : 'IN_REPAIR';
    
    try {
      // Preparar el body, incluyendo horas estimadas solo cuando se inicia reparación
      const body: StatusUpdatePayload = { newStatus, changedById: user.id };
      if (newStatus === 'IN_REPAIR' && estimatedHours) {
        body.estimatedRepairHours = parseFloat(estimatedHours);
      }
      if (repairNote) {
        body.note = repairNote;
      }
      
      const resp = await fetch(`${API_BASE}/units/${selectedUnit.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const json = await resp.json();
      if (json?.ok) {
        // Actualizar estado de la unidad con los datos del backend
        const updatedUnit = json.data;
        setAllUnits(prev => prev.map(u => 
          u.id === selectedUnit.id 
            ? { 
                ...u, 
                statusName: newStatus,
                priorityRank: undefined,
                estimatedRepairHours: updatedUnit.estimatedRepairHours 
              } 
            : u
        ));
        
        // Si se está iniciando reparación y la unidad tenía ranking, recalcular orden
        if (newStatus === 'IN_REPAIR' && selectedUnit.priorityRank != null) {
          const remainingUnits = allUnits
            .filter(u => u.id !== selectedUnit.id && u.priorityRank != null && u.statusName === 'RECEIVED')
            .sort((a, b) => (a.priorityRank || 9999) - (b.priorityRank || 9999));
          
          if (remainingUnits.length > 0) {
            const unitIds = remainingUnits.map(u => u.id);
            await fetch(`${API_BASE}/units/priority/order`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ 
                unitIds, 
                assignedById: user.id 
              })
            });
            
            // Recargar datos para obtener los nuevos ranks
            const r = await fetch(`${API_BASE}/units?status=RECEIVED`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            const j = await r.json();
            if (j?.ok) {
              setAllUnits(prev => prev.map(u => {
                if (u.statusName !== 'RECEIVED') return u;
                const updated = (j.data as PriorityUnitApi[]).find((nu) => nu.id === u.id);
                return updated ? { ...u, priorityRank: updated.priorityRank } : u;
              }));
            }
          }
        }
        
        setIsRepairModal(false);
        setSelectedUnit(null);
      }
    } catch (err) {
      // Error confirmando reparación
    }
  };

  const handleMarkUnavailable = (unit: Unit) => {
    setSelectedUnit(unit);
    setUnavailableReason('');
    setIsUnavailableModal(true);
  };

  const handleConfirmUnavailable = async () => {
    if (!selectedUnit || !user) return;
    
    try {
      const body: StatusUpdatePayload = {
        newStatus: 'UNAVAILABLE', 
        changedById: user.id,
        isAvailableToday: false 
      };
      if (unavailableReason) {
        body.note = unavailableReason;
      }
      
      const resp = await fetch(`${API_BASE}/units/${selectedUnit.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const json = await resp.json();
      if (json?.ok) {
        // Actualizar estado de la unidad
        setAllUnits(prev => prev.map(u => 
          u.id === selectedUnit.id 
            ? { ...u, statusName: 'UNAVAILABLE', isAvailableToday: false, priorityRank: undefined }
            : u
        ));
        
        // Recalcular orden si la unidad tenía ranking
        if (selectedUnit.priorityRank != null) {
          const remainingUnits = allUnits
            .filter(u => u.id !== selectedUnit.id && u.priorityRank != null && u.statusName === 'RECEIVED')
            .sort((a, b) => (a.priorityRank || 9999) - (b.priorityRank || 9999));
          
          if (remainingUnits.length > 0) {
            const unitIds = remainingUnits.map(u => u.id);
            await fetch(`${API_BASE}/units/priority/order`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ 
                unitIds, 
                assignedById: user.id 
              })
            });
            
            // Recargar datos para obtener los nuevos ranks
            const r = await fetch(`${API_BASE}/units?status=RECEIVED`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            const j = await r.json();
            if (j?.ok) {
              setAllUnits(prev => prev.map(u => {
                if (u.id === selectedUnit.id) return { ...u, statusName: 'UNAVAILABLE', isAvailableToday: false };
                const updated = (j.data as PriorityUnitApi[]).find((nu) => nu.id === u.id);
                return updated ? { ...u, priorityRank: updated.priorityRank } : u;
              }));
            }
          }
        }
        
        setIsUnavailableModal(false);
        setSelectedUnit(null);
        setUnavailableReason('');
      }
    } catch (err) {
      // Error marcando no disponible
    }
  };

  const handleReactivateUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    const suggestedHours = (unit.defects || []).reduce((acc, defect) => {
      const catalogItem = repairCatalog.find((item) => item.grade === defect.grade);
      return acc + (catalogItem?.hours || 0);
    }, 0);
    setEstimatedHours(suggestedHours.toString());
    setIsRepairModal(true);
  };

  const handleEditTime = (unit: Unit) => {
    setSelectedUnit(unit);
    setEstimatedHours(unit.estimatedRepairHours?.toString() || '');
    setIsEditTimeModal(true);
  };

  const handleConfirmEditTime = async () => {
    if (!selectedUnit || !user || !estimatedHours) return;
    
    try {
      const resp = await fetch(`${API_BASE}/units/${selectedUnit.id}/estimated-time`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          estimatedRepairHours: parseFloat(estimatedHours), 
          updatedById: user.id 
        })
      });
      const json = await resp.json();
      if (json?.ok) {
        const updatedUnit = json.data;
        setAllUnits(prev => prev.map(u => 
          u.id === selectedUnit.id 
            ? { ...u, estimatedRepairHours: updatedUnit.estimatedRepairHours }
            : u
        ));
        setIsEditTimeModal(false);
        setSelectedUnit(null);
        setEstimatedHours('');
      }
    } catch (err) {
      // Error actualizando tiempo
    }
  };

  const handleConfirmReactivate = async () => {
    if (!selectedUnit || !user) return;
    
    try {
      const body: StatusUpdatePayload = {
        newStatus: 'IN_REPAIR', 
        changedById: user.id,
        isAvailableToday: true
      };
      if (estimatedHours) {
        body.estimatedRepairHours = parseFloat(estimatedHours);
      }
      
      const resp = await fetch(`${API_BASE}/units/${selectedUnit.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const json = await resp.json();
      if (json?.ok) {
        const updatedUnit = json.data;
        setAllUnits(prev => prev.map(u => 
          u.id === selectedUnit.id 
            ? { 
                ...u, 
                statusName: 'IN_REPAIR', 
                isAvailableToday: true,
                estimatedRepairHours: updatedUnit.estimatedRepairHours
              }
            : u
        ));
        setIsRepairModal(false);
        setSelectedUnit(null);
      }
    } catch (err) {
      // Error reactivando
    }
  };

  const pendingUnits = useMemo(() => 
    allUnits
      .filter((u) => u.statusName === 'RECEIVED')
      .sort((a, b) => {
        const ar = a.priorityRank || 9999;
        const br = b.priorityRank || 9999;
        return ar - br;
      }),
    [allUnits]
  );

  const inRepairUnits = useMemo(() => 
    allUnits
      .filter((u) => u.statusName === 'IN_REPAIR')
      .sort((a, b) => {
        const ar = a.priorityRank || 9999;
        const br = b.priorityRank || 9999;
        return ar - br;
      }),
    [allUnits]
  );

  const unavailableUnits = useMemo(() => 
    allUnits.filter((u) => u.statusName === 'UNAVAILABLE'),
    [allUnits]
  );

  const displayUnits = activeTab === 'pending' ? pendingUnits : activeTab === 'inProgress' ? inRepairUnits : unavailableUnits;

  const tabs: { key: 'pending' | 'inProgress' | 'unavailable'; label: string; count: number }[] = [
    { key: 'pending', label: 'Pendientes', count: pendingUnits.length },
    { key: 'inProgress', label: 'En Reparacion', count: inRepairUnits.length },
    { key: 'unavailable', label: 'No Disponibles', count: unavailableUnits.length },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-red-50">
        <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Reparar Unidades</h1>
            <p className="text-sm sm:text-base text-gray-600">Gestiona el proceso de reparación</p>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Actualizado: {lastUpdate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card>
            <CardBody>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Pendientes</p>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{pendingUnits.length}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">En Reparación</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">{inRepairUnits.length}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">No Disponibles</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-600">{unavailableUnits.length}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Horas Estimadas</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {allUnits.reduce((acc, u) => {
                  const hours = Number(u.estimatedRepairHours) || 0;
                  return acc + hours;
                }, 0).toFixed(1)}h
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Defectos</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600">
                {allUnits.reduce((acc, u) => acc + (u.defects || []).filter((d) => !d.resolved).length, 0)}
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-2 md:py-2.5 md:px-4 rounded-md text-xs md:text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              <span className={`ml-1 md:ml-2 px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs ${
                activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardBody>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell className="hidden sm:table-cell">Orden</TableHeadCell>
                    <TableHeadCell>VIN</TableHeadCell>
                    <TableHeadCell className="hidden md:table-cell">Defectos</TableHeadCell>
                    <TableHeadCell>Estimado</TableHeadCell>
                    <TableHeadCell className="hidden sm:table-cell">Estado</TableHeadCell>
                    <TableHeadCell className="text-right">Acciones</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayUnits.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="hidden sm:table-cell">
                        {unit.priorityRank ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-bold text-sm">
                            {unit.priorityRank}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-xs sm:text-sm">{unit.vin}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex gap-1 flex-wrap max-w-xs">
                          {(unit.defects || []).map((defect) => (
                            <GradeBadge
                              key={defect.id}
                              grade={defect.grade as 'V1' | 'V2' | 'V3'}
                              resolved={defect.resolved}
                            >
                              {defect.type} ({defect.grade})
                            </GradeBadge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">{unit.estimatedRepairHours ? `${Number(unit.estimatedRepairHours).toFixed(1)}h` : '-'}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <StatusBadge status={unit.statusName} />
                      </TableCell>
                      <TableCell align="right">
                        {unit.statusName === 'RECEIVED' ? (
                          <div className="flex gap-1 sm:gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleStartRepair(unit)}
                              className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1 sm:px-3 sm:py-2 whitespace-nowrap"
                            >
                              Iniciar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleMarkUnavailable(unit)}
                              className="bg-gray-600 hover:bg-gray-700 text-xs px-2 py-1 sm:px-3 sm:py-2 whitespace-nowrap"
                            >
                              <span className="hidden sm:inline">No Disponible</span>
                              <span className="sm:hidden">N/D</span>
                            </Button>
                          </div>
                        ) : unit.statusName === 'UNAVAILABLE' ? (
                          <Button
                            size="sm"
                            onClick={() => handleReactivateUnit(unit)}
                            className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1 sm:px-3 sm:py-2 whitespace-nowrap"
                          >
                            <span className="hidden md:inline">Reactivar para Reparar</span>
                            <span className="md:hidden">Reactivar</span>
                          </Button>
                        ) : (
                          <div className="flex gap-1 sm:gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleEditTime(unit)}
                              className="bg-yellow-600 hover:bg-yellow-700 text-xs px-2 py-1 sm:px-3 sm:py-2 whitespace-nowrap"
                            >
                              <span className="hidden md:inline">Editar Tiempo</span>
                              <span className="md:hidden">⏱️</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleStartRepair(unit)}
                              className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1 sm:px-3 sm:py-2 whitespace-nowrap"
                            >
                              Liberar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </CardBody>
          </Card>
      </main>

      {/* Modal - Repair Details */}
      <Modal
        isOpen={isRepairModal}
        onClose={() => setIsRepairModal(false)}
        title={`${
          selectedUnit?.statusName === 'UNAVAILABLE' 
            ? 'Reactivar y Reparar' 
            : activeTab === 'pending' 
            ? 'Iniciar' 
            : 'Liberar'
        } Reparación: ${selectedUnit?.vin}`}
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button onClick={() => setIsRepairModal(false)} variant="secondary" className="text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2">
              Cancelar
            </Button>
            <Button
              onClick={selectedUnit?.statusName === 'UNAVAILABLE' ? handleConfirmReactivate : handleConfirmRepair}
              className={`text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 ${
                selectedUnit?.statusName === 'UNAVAILABLE' 
                  ? 'bg-green-600 hover:bg-green-700'
                  : activeTab === 'pending' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              <span className="hidden sm:inline">
                {selectedUnit?.statusName === 'UNAVAILABLE' 
                  ? 'Reactivar y Comenzar Reparación' 
                  : activeTab === 'pending' 
                  ? 'Iniciar Reparación' 
                  : 'Liberar Unidad'}
              </span>
              <span className="sm:hidden">
                {selectedUnit?.statusName === 'UNAVAILABLE' 
                  ? 'Reactivar' 
                  : activeTab === 'pending' 
                  ? 'Iniciar' 
                  : 'Liberar'}
              </span>
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Alert for reactivation */}
          {selectedUnit?.statusName === 'UNAVAILABLE' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Reactivando Unidad:</strong> Esta unidad estaba marcada como no disponible y será reactivada para iniciar su reparación.
              </p>
            </div>
          )}

          {/* Unit Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">VIN</p>
              <p className="font-mono font-semibold text-sm">{selectedUnit?.vin}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estado Actual</p>
              <StatusBadge status={selectedUnit?.statusName || 'RECEIVED'} />
            </div>
          </div>

          {/* Defects Management */}
          <div>
            <h3 className="font-semibold mb-4">Defectos a Reparar</h3>
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
              {(selectedUnit?.defects || []).map((defect) => (
                <div key={defect.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                  <GradeBadge grade={defect.grade as 'V1' | 'V2' | 'V3'}>{defect.grade}</GradeBadge>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{defect.type}</p>
                    <p className="text-xs text-gray-600">{defect.zone}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated Hours */}
          {(activeTab === 'pending' || selectedUnit?.statusName === 'UNAVAILABLE') && (
            <div>
              <label className="block text-sm font-semibold mb-2">Horas Estimadas de Reparación</label>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="Horas estimadas"
                    step="0.5"
                    min="0"
                  />
                </div>
                <p className="text-sm text-gray-600 mb-2">horas</p>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Sugerencia: Revisa el catálogo de reparaciones para valores de referencia
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold mb-2">Notas {activeTab === 'pending' ? 'Iniciales' : 'Finales'}</label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder={
                activeTab === 'pending'
                  ? 'Observaciones antes de iniciar reparación...'
                  : 'Resultado de la reparación...'
              }
              value={repairNote}
              onChange={(e) => setRepairNote(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Modal - Mark as Unavailable */}
      <Modal
        isOpen={isUnavailableModal}
        onClose={() => setIsUnavailableModal(false)}
        title={`Marcar Unidad como No Disponible: ${selectedUnit?.vin}`}
        size="md"
        footer={
          <div className="flex gap-2">
            <Button onClick={() => setIsUnavailableModal(false)} variant="secondary" className="text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmUnavailable}
              className="bg-gray-600 hover:bg-gray-700 text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2"
            >
              <span className="hidden sm:inline">Marcar como No Disponible</span>
              <span className="sm:hidden">Confirmar</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Atención:</strong> Esta unidad será marcada como no disponible para hoy y no aparecerá en las listas de trabajo activo.
            </p>
          </div>

          {/* Unit Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">VIN</p>
              <p className="font-mono font-semibold text-sm">{selectedUnit?.vin}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estado Actual</p>
              <StatusBadge status={selectedUnit?.statusName || 'RECEIVED'} />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold mb-2">Motivo (Opcional)</label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
              rows={3}
              value={unavailableReason}
              onChange={(e) => setUnavailableReason(e.target.value)}
              placeholder="Ej: Falta de materiales, personal insuficiente, etc..."
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              Nota: La unidad podrá ser reactivada posteriormente desde el dashboard de administración.
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal - Edit Estimated Time */}
      <Modal
        isOpen={isEditTimeModal}
        onClose={() => setIsEditTimeModal(false)}
        title={`Editar Tiempo Estimado: ${selectedUnit?.vin}`}
        size="md"
        footer={
          <div className="flex gap-2">
            <Button onClick={() => setIsEditTimeModal(false)} variant="secondary" className="text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmEditTime}
              className="bg-yellow-600 hover:bg-yellow-700 text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2"
            >
              <span className="hidden sm:inline">Actualizar Tiempo</span>
              <span className="sm:hidden">Actualizar</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Editar Tiempo Estimado:</strong> Modifica el tiempo estimado de reparación de esta unidad. El sistema recalculará las fechas de finalización considerando las demás unidades en reparación.
            </p>
          </div>

          {/* Unit Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">VIN</p>
              <p className="font-mono font-semibold text-sm">{selectedUnit?.vin}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estado Actual</p>
              <StatusBadge status={selectedUnit?.statusName || 'IN_REPAIR'} />
            </div>
          </div>

          {/* Current Estimated Hours */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Tiempo estimado actual:</p>
            <p className="text-lg font-bold text-gray-900">
              {selectedUnit?.estimatedRepairHours ? `${Number(selectedUnit.estimatedRepairHours).toFixed(1)} horas` : 'No especificado'}
            </p>
          </div>

          {/* New Estimated Hours */}
          <div>
            <label className="block text-sm font-semibold mb-2">Nuevo Tiempo Estimado</label>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="Horas estimadas"
                  step="0.5"
                  min="0"
                />
              </div>
              <p className="text-sm text-gray-600 mb-2">horas</p>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Sugerencia: Considera el progreso actual de la reparación
            </p>
          </div>
        </div>
      </Modal>
    </div>
    </ProtectedRoute>
  );
}