'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Table, TableBody, TableHeader, TableRow, TableCell, TableHeadCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { GradeBadge } from '@/components/units/GradeBadge';
import { StatusBadge } from '@/components/units/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { ReportForm } from '@/components/forms/ReportForm';
import { SearchableSelect, type SearchableOption } from '@/components/ui/SearchableSelect';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { useUnitEvents } from '@/lib/useUnitEvents';
import { API_BASE } from '@/lib/api';
import { damageTypes, zones as componentZones, DEFAULT_DEFECT_TYPE, DEFAULT_ZONE } from '@/lib/defectCatalog';

const defectTypes = damageTypes.map((item) => `${item.code} - ${item.label}`);
const zones = componentZones.map((item) => `${item.code} - ${item.label}`);
const grades = ['V1', 'V2', 'V3'] as const;

type Defect = { id: number; type: string; zone: string; grade: 'V1'|'V2'|'V3'; updatedById?: number; updatedAt?: string };
type Unit = {
  id: number;
  vin: string;
  market: string;
  lane: string;
  statusName: string;
  defects?: Defect[];
};

type TabKey = 'nivelacion' | 'entregar' | 'liberar' | 'Reportar unidad';

const splitCatalogValue = (value: string) => {
  const [code, ...rest] = value.split(' - ');
  return {
    code: code ?? value,
    label: rest.length > 0 ? rest.join(' - ') : '',
  };
};

export default function Page() {
  const { user, token } = useAuth();
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [selected, setSelected] = useState<Unit | null>(null);
  const [isAddDefectFormOpen, setIsAddDefectFormOpen] = useState(false);
  const [newDefect, setNewDefect] = useState({ type: DEFAULT_DEFECT_TYPE, zone: DEFAULT_ZONE, grade: 'V2' as 'V1'|'V2'|'V3' });
  const [editingDefect, setEditingDefect] = useState<Defect | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('nivelacion');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [wtyUnit, setWtyUnit] = useState<Unit | null>(null);
  const [wtyComment, setWtyComment] = useState('');

  // Unidades por pestaña
  const reportedUnits = useMemo(() => allUnits.filter(u => u.statusName === 'REPORTED'), [allUnits]);
  const sentUnits = useMemo(() => allUnits.filter(u => u.statusName === 'SENT' || u.statusName === 'REJECTED'), [allUnits]);
  const releasedUnits = useMemo(() => allUnits.filter(u => u.statusName === 'RELEASED' || u.statusName === 'WTY_RELEASED'), [allUnits]);

  const defectTypeOptions = useMemo<SearchableOption[]>(() => defectTypes.map((item) => {
    const { code, label } = splitCatalogValue(item);
    return {
      value: item,
      label: item,
      searchText: `${code} ${label}`,
    };
  }), []);

  const zoneOptions = useMemo<SearchableOption[]>(() => zones.map((item) => {
    const { code, label } = splitCatalogValue(item);
    return {
      value: item,
      label: item,
      searchText: `${code} ${label}`,
    };
  }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statuses = ['REPORTED', 'SENT', 'RELEASED', 'WTY_RELEASED', 'REJECTED'];
      const statusResponses = await Promise.all(
        statuses.map(async (status) => {
          const response = await fetch(`${API_BASE}/units?status=${status}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (!response.ok) {
            return [] as Unit[];
          }

          const payload = await response.json();
          return payload?.ok && Array.isArray(payload.data) ? (payload.data as Unit[]) : [];
        }),
      );

      const byUnitId = new Map<number, Unit>();
      for (const unitsByStatus of statusResponses) {
        for (const unit of unitsByStatus) {
          byUnitId.set(unit.id, unit);
        }
      }

      setAllUnits(Array.from(byUnitId.values()));
      setLastUpdate(new Date());
    } catch {
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

  const openInspect = (unit: Unit) => {
    setSelected(unit);
    setIsAddDefectFormOpen(false);
  };

  const handleAddDefect = async () => {
    if (!selected || !newDefect.type || !newDefect.zone || !newDefect.grade) return;
    try {
      const resp = await fetch(`${API_BASE}/units/${selected.id}/defects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ defectType: newDefect.type, zone: newDefect.zone, grade: newDefect.grade, registeredById: user?.id })
      });
      const json = await resp.json();
      if (json?.ok) {
        const updatedUnit = json.data;
        setAllUnits(prev => prev.map(u => u.id === updatedUnit.id ? { ...u, defects: updatedUnit.defects } : u));
        setSelected(updatedUnit);
        setNewDefect({ type: DEFAULT_DEFECT_TYPE, zone: DEFAULT_ZONE, grade: 'V2' });
      }
    } catch { /* Error */ }
  };

  const handleEditDefect = async (defectId: number, newGrade: 'V1'|'V2'|'V3') => {
    if (!selected || !user) return;
    try {
      const resp = await fetch(`${API_BASE}/units/${selected.id}/defects/${defectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ grade: newGrade, updatedById: user.id })
      });
      const json = await resp.json();
      if (json?.ok) {
        const updatedUnit = json.data;
        setAllUnits(prev => prev.map(u => u.id === updatedUnit.id ? { ...u, defects: updatedUnit.defects } : u));
        setSelected(updatedUnit);
        setEditingDefect(null);
      }
    } catch { /* Error */ }
  };

  const hasV1V2 = (unit: Unit) => (unit.defects||[]).some(d => d.grade === 'V1' || d.grade === 'V2');

  const updateStatus = async (unitId: number, newStatus: string, extraBody?: Record<string, unknown>) => {
    if (!user) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/units/${unitId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newStatus, changedById: user.id, ...extraBody })
      });
      const json = await resp.json();
      if (json?.ok) {
        setAllUnits(prev => prev.filter(u => u.id !== unitId));
        setSelected(null);
        setIsAddDefectFormOpen(false);
        window.dispatchEvent(new CustomEvent('unitStatusChanged'));
      }
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'Reportar unidad', label: 'Reportar Unidad' },
    { key: 'nivelacion', label: 'Nivelación', count: reportedUnits.length },
    { key: 'entregar', label: 'Entregar a Body', count: sentUnits.length },
    { key: 'liberar', label: 'Liberar WWS', count: releasedUnits.length },
  ];

  const currentUnits = activeTab === 'nivelacion' ? reportedUnits : activeTab === 'entregar' ? sentUnits : releasedUnits;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-red-50">
        <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión WWS</h1>
            <p className="text-gray-600">Nivelación de defectos, entrega a Body y liberación de unidades.</p>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Última actualización: {lastUpdate.toLocaleTimeString('es-MX')}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 mb-1">Pendientes Nivelación</p>
              <p className="text-3xl font-bold text-gray-900">{reportedUnits.length}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 mb-1">Por Entregar a Body</p>
              <p className="text-3xl font-bold text-blue-600">{sentUnits.length}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 mb-1">Por Liberar (WWS)</p>
              <p className="text-3xl font-bold text-green-600">{releasedUnits.length}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 mb-1">Con V1/V2</p>
              <p className="text-3xl font-bold text-red-600">{reportedUnits.filter(hasV1V2).length}</p>
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
              <span className="block">{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`inline-block mt-0.5 md:ml-2 md:mt-0 px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs ${
                  activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenido por tab */}
        {activeTab === 'Reportar unidad' ? (
          <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Reportar Unidad con Daño Detectado</h2>
              <p className="text-sm text-gray-600">
                Usa este formulario cuando WWS detecte un daño antes que el carrier. 
                Se notificará al proveedor seleccionado para el tracking de la unidad.
              </p>
            </div>
            <div className="flex justify-center">
              <ReportForm includeProvider={true} />
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">
                {activeTab === 'nivelacion' && 'Unidades Reportadas — Nivelación de Defectos'}
                {activeTab === 'entregar' && 'Unidades Niveladas — Confirmar Entrega a Body'}
                {activeTab === 'liberar' && 'Unidades Liberadas por Body — Confirmar Liberación WWS'}
              </h2>
            </CardHeader>
            <CardBody>
            {currentUnits.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <p className="text-lg">No hay unidades en esta sección</p>
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
                  {currentUnits.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono font-semibold">{u.vin}</TableCell>
                      <TableCell>{u.market}</TableCell>
                      <TableCell><Badge variant="info">{u.lane}</Badge></TableCell>
                      <TableCell><StatusBadge status={u.statusName} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(u.defects||[]).length === 0 ? (
                            <span className="text-xs text-gray-500">Sin asignar</span>
                          ) : (
                            (u.defects || []).map(d => (
                              <GradeBadge key={d.id} grade={d.grade}>{d.grade}</GradeBadge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell align="right">
                        {activeTab === 'nivelacion' && (
                          <Button size="sm" onClick={() => openInspect(u)} className="bg-blue-600 hover:bg-blue-700 text-xs md:text-sm px-2 md:px-3 py-1 md:py-2">
                            <span className="hidden sm:inline">Nivelación</span>
                            <span className="sm:hidden">Nivelar</span>
                          </Button>
                        )}
                        {activeTab === 'entregar' && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(u.id, 'DELIVERED')}
                            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
                            disabled={loading}
                          >
                            <span className="hidden sm:inline">Confirmar Entrega</span>
                            <span className="sm:hidden">Entregar</span>
                          </Button>
                        )}
                        {activeTab === 'liberar' && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(u.id, 'WWS_RELEASED')}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
                            disabled={loading}
                          >
                            <span className="hidden sm:inline">Liberar WWS</span>
                            <span className="sm:hidden">Liberar</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>
        )}
      </main>

      {/* Modal - Asignar defectos y decidir acción (solo tab nivelación) */}
      <Modal
        isOpen={!!selected}
        onClose={() => {
          setSelected(null);
          setIsAddDefectFormOpen(false);
        }}
        title={`Inspeccionar: ${selected?.vin ?? ''}`}
        size="lg"
        footer={
          <div className="flex gap-3 justify-end items-center">
            <div className="flex gap-2">
              {(selected?.defects||[]).length > 0 && (
                <>
                  {/* V1 presente: obligatorio a Body */}
                  {(selected!.defects||[]).some(d => d.grade === 'V1') && (
                    <Button
                      onClick={() => updateStatus(selected!.id, 'SENT')}
                      size="sm"
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium shadow-sm transition-all text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
                      disabled={loading}
                    >
                      <span className="hidden sm:inline">Enviar a Body</span>
                      <span className="sm:hidden">Body</span>
                    </Button>
                  )}
                  {/* Solo V2/V3 (sin V1): WWS decide si Body o pide validación WTY */}
                  {!(selected!.defects||[]).some(d => d.grade === 'V1') && (
                    <>
                      <Button
                        onClick={() => updateStatus(selected!.id, 'SENT')}
                        size="sm"
                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium shadow-sm transition-all text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
                        disabled={loading}
                      >
                        <span className="hidden sm:inline">Enviar a Body</span>
                        <span className="sm:hidden">Body</span>
                      </Button>
                      <Button
                        onClick={() => {
                          setSelected(null);
                          setIsAddDefectFormOpen(false);
                          setWtyUnit(selected!);
                          setWtyComment('');
                        }}
                        size="sm"
                        className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium shadow-sm transition-all text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
                        disabled={loading}
                      >
                        <span className="hidden sm:inline">Solicitar WTY</span>
                        <span className="sm:hidden">WTY</span>
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        }
      >
        {selected && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Mercado</p>
                <p className="font-semibold text-sm sm:text-base">{selected.market}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">VIN</p>
                <p className="font-mono font-semibold text-xs sm:text-sm break-all">{selected.vin}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Carril</p>
                <p className="font-semibold text-sm sm:text-base">{selected.lane}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h3 className="font-semibold text-sm sm:text-base text-gray-900">Defectos Asignados ({(selected.defects||[]).length})</h3>
                <Button
                  size="sm"
                  onClick={() => setIsAddDefectFormOpen((prev) => !prev)}
                  className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700"
                >
                  {isAddDefectFormOpen ? 'Ocultar formulario' : 'Agregar Defecto'}
                </Button>
              </div>
              {(selected.defects||[]).length > 0 ? (
                <div className="space-y-2 p-2 sm:p-4 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
                  {(selected.defects || []).map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded hover:border-blue-300 hover:bg-blue-50 transition">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-semibold text-xs sm:text-sm truncate">
                          <span className="font-mono bg-gray-100 text-gray-700 px-1 py-0.5 rounded mr-1">{splitCatalogValue(d.type).code}</span>
                          {splitCatalogValue(d.type).label || d.type}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                          <span className="font-mono text-gray-500">{splitCatalogValue(d.zone).code}</span>
                          {splitCatalogValue(d.zone).label ? ` - ${splitCatalogValue(d.zone).label}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <GradeBadge grade={d.grade}>{d.grade}</GradeBadge>
                        <button onClick={() => setEditingDefect(d)} className="text-blue-600 hover:text-blue-800 font-bold text-sm transition" title="Editar severidad">✎</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs sm:text-sm text-yellow-800">Sin defectos asignados aún. Agrega al menos uno para continuar.</p>
                </div>
              )}
            </div>

            {isAddDefectFormOpen && (
              <div className="border-t pt-3 sm:pt-4">
                <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base text-gray-900">Agregar Defecto</h3>
                <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-1 sm:mb-2">Tipo de Defecto</label>
                    <SearchableSelect
                      options={defectTypeOptions}
                      value={newDefect.type}
                      onChange={(value) => setNewDefect({ ...newDefect, type: value })}
                      searchPlaceholder="Buscar por codigo o descripcion"
                      placeholder="Selecciona tipo de defecto"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-1 sm:mb-2">Zona</label>
                    <SearchableSelect
                      options={zoneOptions}
                      value={newDefect.zone}
                      onChange={(value) => setNewDefect({ ...newDefect, zone: value })}
                      searchPlaceholder="Buscar por codigo o descripcion"
                      placeholder="Selecciona zona"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-1 sm:mb-2">Severidad</label>
                    <div className="grid grid-cols-3 gap-2">
                      {grades.map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setNewDefect({...newDefect, grade: g})}
                          className={`py-2 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all shadow-md ${
                            newDefect.grade === g
                              ? g === 'V1' ? 'bg-red-500 text-white border-2 border-red-600 shadow-lg scale-105' : g === 'V2' ? 'bg-amber-500 text-white border-2 border-amber-600 shadow-lg scale-105' : 'bg-blue-500 text-white border-2 border-blue-600 shadow-lg scale-105'
                              : 'bg-gray-200 text-gray-700 border-2 border-gray-300 hover:bg-gray-300'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-600 mt-2 sm:mt-3 p-2 bg-blue-50 rounded leading-relaxed">V1=Grave (obligatorio Body) | V2/V3=Leve/Moderado (Body o solicitar validación WTY para liberar directo)</p>
                  </div>
                  <Button onClick={handleAddDefect} className="w-full px-3 py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-md transition-all rounded-lg">
                    +{' '}
                    <span className="hidden sm:inline">Agregar Defecto</span>
                    <span className="sm:hidden">Agregar</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal - Editar severidad del defecto */}
      <Modal
        isOpen={!!editingDefect}
        onClose={() => setEditingDefect(null)}
        title={`Editar Severidad: ${editingDefect?.type ?? ''}`}
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button onClick={() => setEditingDefect(null)} variant="secondary" className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm">Cancelar</Button>
            <Button onClick={() => editingDefect && handleEditDefect(editingDefect.id, editingDefect.grade)} className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-md">
              <span className="hidden sm:inline">Guardar Cambio</span>
              <span className="sm:hidden">Guardar</span>
            </Button>
          </div>
        }
      >
        {editingDefect && (
          <div className="space-y-3 sm:space-y-4">
            <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Defecto</p>
              <p className="font-semibold text-sm sm:text-base">{editingDefect.type}</p>
              <p className="text-[10px] sm:text-xs text-gray-600">Zona: {editingDefect.zone}</p>
              <p className="text-[10px] sm:text-xs text-gray-600">Severidad actual: <span className="font-bold text-blue-600">{editingDefect.grade}</span></p>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Nueva Severidad</label>
              <div className="grid grid-cols-3 gap-2">
                {grades.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setEditingDefect({ ...editingDefect, grade: g })}
                    className={`py-2 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all shadow-md ${
                      editingDefect.grade === g
                        ? g === 'V1' ? 'bg-red-500 text-white border-2 border-red-600 shadow-lg scale-105' : g === 'V2' ? 'bg-amber-500 text-white border-2 border-amber-600 shadow-lg scale-105' : 'bg-blue-500 text-white border-2 border-blue-600 shadow-lg scale-105'
                        : 'bg-gray-200 text-gray-700 border-2 border-gray-300 hover:bg-gray-300'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
      {/* Modal - WTY: comentario y confirmación de solicitud */}
      <Modal
        isOpen={!!wtyUnit}
        onClose={() => { setWtyUnit(null); setWtyComment(''); }}
        title={`Solicitar validación WTY: ${wtyUnit?.vin ?? ''}`}
        size="md"
        footer={
          <div className="flex gap-3 justify-between items-center">
            <Button
              onClick={() => { setWtyUnit(null); setWtyComment(''); }}
              variant="secondary"
              size="sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!wtyUnit) return;
                await updateStatus(wtyUnit.id, 'WTY_PENDING', { wtyComment: wtyComment.trim() || null });
                setWtyUnit(null);
                setWtyComment('');
              }}
              size="sm"
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold text-xs px-4 py-2"
              disabled={loading}
            >
              Enviar a WTY
            </Button>
          </div>
        }
      >
        {wtyUnit && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg text-sm">
              <div>
                <p className="text-xs text-gray-500">VIN</p>
                <p className="font-mono font-semibold text-xs break-all">{wtyUnit.vin}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Mercado</p>
                <p className="font-semibold">{wtyUnit.market}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Carril</p>
                <p className="font-semibold">{wtyUnit.lane}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Defectos</p>
              <div className="flex gap-1 flex-wrap">
                {(wtyUnit.defects || []).map(d => (
                  <GradeBadge key={d.id} grade={d.grade}>
                    {d.grade} - {splitCatalogValue(d.type).code} {splitCatalogValue(d.type).label || d.type}
                  </GradeBadge>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Comentario para WTY <span className="font-normal text-gray-500">(opcional)</span>
              </label>
              <textarea
                value={wtyComment}
                onChange={e => setWtyComment(e.target.value)}
                placeholder="Ej: WTY ya realizó revisión presencial, defecto V3 aceptado..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              />
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-xs text-purple-700">
                Al confirmar, la unidad pasará a <strong>Pendiente WTY</strong>. Si WTY
                valida que el defecto no requiere reparación, se liberará directamente. Si
                WTY rechaza, la unidad se enviará a <strong>Body</strong> para reparación.
              </p>
            </div>
          </div>
        )}
      </Modal>

    </div>
    </ProtectedRoute>
  );
}