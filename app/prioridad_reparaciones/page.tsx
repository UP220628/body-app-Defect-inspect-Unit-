"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeadCell,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { GradeBadge } from "@/components/units/GradeBadge";
import { StatusBadge } from "@/components/units/StatusBadge";
import ProtectedRoute from "@/components/layout/ProtectedRoute";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

// Tipos locales para manejar unidades

type UnitStatus = "RECEIVED" | "IN_REPAIR";

type Defect = {
  id: number;
  type: string;
  zone: string;
  grade: "V1" | "V2" | "V3";
};

type Unit = {
  id: number;
  vin: string;
  market: string;
  lane: string;
  status: UnitStatus;
  reportedAt: string;
  defects: Defect[];
  priorityNote?: string;
  priorityRank?: number;
};

export default function Page() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const [note, setNote] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    // Load RECEIVED units from backend, include priority fields
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/units?status=RECEIVED`);
        const j = await r.json();
        if (j?.ok) {
          const results: Unit[] = [];
          for (const u of j.data as any[]) {
            results.push({
              id: u.id,
              vin: u.vin,
              market: u.market,
              lane: u.lane,
              status: 'RECEIVED' as UnitStatus,
              reportedAt: u.createdAt,
              defects: u.defects || [],
              priorityNote: u.priorityNote ?? undefined,
              priorityRank: u.priorityRank ?? undefined,
            });
          }
          setUnits(results);
        }
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const pendingToPrioritize = useMemo(
    () =>
      units.filter(
        (u) => u.priorityRank == null && (u.status === "RECEIVED")
      ),
    [units]
  );

  const prioritizedUnits = useMemo(
    () => units.filter((u) => u.priorityRank != null),
    [units]
  );

  const bodyViewQueue = useMemo(
    () =>
      [...prioritizedUnits].sort((a, b) => {
        // Ordenar por priorityRank
        const rankA = a.priorityRank ?? 9999;
        const rankB = b.priorityRank ?? 9999;
        return rankA - rankB;
      }),
    [prioritizedUnits]
  );

  const openPriorityModal = (unit: Unit) => {
    setSelectedUnit(unit);
    setNote(unit.priorityNote ?? "");
  };

  const closeModal = () => {
    setSelectedUnit(null);
    setNote("");
  };

  const savePriority = () => {
    if (!selectedUnit) return;

    // Agregar a la cola asignando nota
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/units/${selectedUnit.id}/priority`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note, assignedById: 1 })
        });
        const json = await resp.json();
        if (json?.ok) {
          // Update the unit with the response data which includes priorityRank
          setUnits(prev => prev.map(u => 
            u.id === selectedUnit.id 
              ? { ...u, priorityNote: note.trim() || undefined, priorityRank: json.data.priorityRank }
              : u
          ));
        }
      } finally {
        closeModal();
      }
    })();
  };



  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    setUnits(prev => {
      const ordered = [...bodyViewQueue];
      const [draggedItem] = ordered.splice(draggedIndex, 1);
      ordered.splice(dropIndex, 0, draggedItem);
      
      // Update priorityRank based on new order
      const updatedUnits = [...prev];
      ordered.forEach((unit, idx) => {
        const unitIndex = updatedUnits.findIndex(u => u.id === unit.id);
        if (unitIndex !== -1) {
          updatedUnits[unitIndex] = { ...updatedUnits[unitIndex], priorityRank: idx + 1 };
        }
      });
      
      return updatedUnits;
    });
    
    setDraggedIndex(null);
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    try {
      // Enviar el orden completo
      const unitIds = bodyViewQueue.map(u => u.id);
      if (unitIds.length > 0) {
        await fetch(`${API_BASE}/units/priority/order`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unitIds, assignedById: 1 })
        });
      }
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-red-50">
        <Header />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <header>
          <p className="text-sm text-gray-600 mb-2">Logística · Body</p>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestor de Cola de Reparación
          </h1>
          <p className="text-gray-600 mt-1">
            Organiza el orden de reparación de las unidades recibidas. BODY trabajará según el orden establecido aquí.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 mb-1">Pendientes de Agregar</p>
              <p className="text-3xl font-bold text-gray-900">
                {pendingToPrioritize.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Sin posición asignada</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 mb-1">En Cola de Reparación</p>
              <p className="text-3xl font-bold text-blue-600">
                {bodyViewQueue.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Ordenadas por posición</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600 mb-1">Total Recibidas</p>
              <p className="text-3xl font-bold text-green-600">
                {units.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Unidades en taller</p>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Logística</p>
                <h2 className="text-lg font-semibold">Unidades Pendientes de Agregar</h2>
              </div>
              <Badge variant="warning">
                {pendingToPrioritize.length} unidades sin posición
              </Badge>
            </div>
          </CardHeader>
          <CardBody>
            {pendingToPrioritize.length === 0 ? (
              <div className="text-sm text-gray-600">No hay unidades pendientes.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell>VIN</TableHeadCell>
                    <TableHeadCell>Mercado</TableHeadCell>
                    <TableHeadCell>Carril</TableHeadCell>
                    <TableHeadCell>Defectos</TableHeadCell>
                    <TableHeadCell>Estado</TableHeadCell>
                    <TableHeadCell className="text-right">Acciones</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingToPrioritize.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-mono font-semibold">
                        {unit.vin}
                      </TableCell>
                      <TableCell>{unit.market}</TableCell>
                      <TableCell>
                        <Badge variant="info">{unit.lane}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {unit.defects.map((defect) => (
                            <GradeBadge key={defect.id} grade={defect.grade}>
                              {defect.type}
                            </GradeBadge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={unit.status} />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="sm"
                          onClick={() => openPriorityModal(unit)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
                        >
                          <span className="hidden sm:inline">Agregar a Cola</span>
                          <span className="sm:hidden">Agregar</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Body</p>
                <h2 className="text-lg font-semibold">Cola de Reparación Ordenada</h2>
              </div>
              <Badge variant="info">Arrastra para reordenar</Badge>
            </div>
          </CardHeader>
          <CardBody>
            {bodyViewQueue.length === 0 ? (
              <div className="text-sm text-gray-600">Aún no hay prioridades asignadas.</div>
            ) : (
              <>
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Arrastra las filas para cambiar el orden. El número de posición se actualizará automáticamente.
                  </p>
                </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell>VIN</TableHeadCell>
                    <TableHeadCell>Defectos</TableHeadCell>
                    <TableHeadCell>Estado</TableHeadCell>
                    <TableHeadCell>Notas</TableHeadCell>
                    <TableHeadCell>Posición</TableHeadCell>
                    <TableHeadCell className="text-right">Acciones</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bodyViewQueue.map((unit, index) => (
                    <tr 
                      key={unit.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`border-b border-gray-200 cursor-move transition-colors ${draggedIndex === index ? 'opacity-50 bg-gray-100' : 'hover:bg-blue-50'}`}
                    >
                      <TableCell className="font-mono font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-lg">⋮⋮</span>
                          {unit.vin}
                        </div>
                      </TableCell>
                        {/* model removed */}
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {unit.defects.map((defect) => (
                            <GradeBadge key={defect.id} grade={defect.grade}>
                              {defect.type}
                            </GradeBadge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={unit.status} />
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-gray-700">
                        {unit.priorityNote ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{unit.priorityRank ?? '-'}</Badge>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="sm"
                          onClick={() => openPriorityModal(unit)}
                          className="bg-gray-900 hover:bg-gray-800 text-white text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </tr>
                  ))}
                </TableBody>
              </Table>
              </>
            )}
            {bodyViewQueue.length > 0 && (
              <div className="mt-4 flex justify-end gap-2 items-center">
                <Button onClick={saveOrder} className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2" disabled={savingOrder}>
                  <span className="hidden sm:inline">{savingOrder ? 'Guardando...' : 'Guardar Orden Final'}</span>
                  <span className="sm:hidden">{savingOrder ? 'Guardando...' : 'Guardar'}</span>
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </main>

      <Modal
        isOpen={!!selectedUnit}
        onClose={closeModal}
        title={`Agregar a Cola: ${selectedUnit?.vin ?? ""}`}
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button onClick={closeModal} variant="secondary" className="text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2">
              Cancelar
            </Button>
            <Button
              onClick={savePriority}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2"
            >
              <span className="hidden sm:inline">Agregar a Cola de Reparación</span>
              <span className="sm:hidden">Agregar</span>
            </Button>
          </div>
        }
      >
        {selectedUnit && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Agregar a la cola:</strong> Esta unidad se agregará automáticamente al final de la cola de reparación con la siguiente posición disponible.
              </p>
            </div>

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
                <p className="text-sm text-gray-600">Posición que tendrá</p>
                <p className="text-2xl font-bold text-blue-600">#{bodyViewQueue.length + 1}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Defectos Identificados</p>
              <div className="space-y-2">
                {selectedUnit.defects.map((defect) => (
                  <div key={defect.id} className="p-3 bg-white border rounded-lg flex items-center gap-3">
                    <GradeBadge grade={defect.grade}>{defect.grade}</GradeBadge>
                    <div className="flex-1">
                      <p className="font-medium">{defect.type}</p>
                      <p className="text-sm text-gray-600">Zona: {defect.zone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Notas Adicionales (Opcional)</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Unidad prioritaria, urgente de reparación, etc."
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
    </ProtectedRoute>
  );
}
