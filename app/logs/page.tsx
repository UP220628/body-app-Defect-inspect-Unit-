'use client';

import {Header} from "@/components/layout/Header";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHeadCell } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { useUnitEvents } from '@/lib/useUnitEvents';


export default function Page (){
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [vin, setVin] = useState('');
  const [market, setMarket] = useState('');
  const [sort, setSort] = useState<'alpha'|'date'>('date');
  const [order, setOrder] = useState<'asc'|'desc'>('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [openOptions, setOpenOptions] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedUnitNotes, setSelectedUnitNotes] = useState<any>(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

  const todayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const dateMinusDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (vin) params.set('vin', vin);
    if (market) params.set('market', market);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('sort', sort);
    params.set('order', order);
    return params.toString();
  }, [vin, market, sort, order, startDate, endDate]);

  const fetchLogs = useCallback(() => {
    if (!token) return;

    fetch(`${API_BASE}/logs?${query}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(async (r) => {
        const data = await r.json();
        if (data?.ok) {
          setItems(data.data);
          setLastUpdate(new Date());
        }
      })
      .catch(() => {});
  }, [query, token, API_BASE]);

  useUnitEvents({
    token,
    onEvent: () => {
      fetchLogs();
    },
  });

  useEffect(() => {
    if (!token) return;
    fetchLogs();
  }, [token, fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const groupedUnits = useMemo(() => {
    const grouped = items.reduce((acc: any, row: any) => {
      if (!acc[row.unitId]) {
        acc[row.unitId] = {
          unitId: row.unitId,
          vin: row.vin,
          market: row.market,
          lane: row.lane,
          registeredByName: row.registeredByName,
          states: {},
          notes: []
        };
      }
      if (row.newStatus) {
        acc[row.unitId].states[row.newStatus] = row.changedAt;
        if (row.note) {
          acc[row.unitId].notes.push({
            status: row.newStatus,
            note: row.note,
            timestamp: row.changedAt
          });
        }
      }
      return acc;
    }, {});

    return Object.values(grouped) as any[];
  }, [items]);

  const sortedUnits = useMemo(() => {
    return [...groupedUnits].sort((a: any, b: any) => {
      if (sort === 'alpha') {
        const comparison = a.vin.localeCompare(b.vin);
        return order === 'asc' ? comparison : -comparison;
      }
      const dateA = a.states.REPORTED ? new Date(a.states.REPORTED).getTime() : 0;
      const dateB = b.states.REPORTED ? new Date(b.states.REPORTED).getTime() : 0;
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [groupedUnits, sort, order]);

  const paginatedUnits = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(sortedUnits.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    return sortedUnits.slice(startIndex, startIndex + pageSize);
  }, [sortedUnits, page, pageSize]);

  const handleViewNotes = (unit: any) => {
    setSelectedUnitNotes(unit);
    setIsNotesModalOpen(true);
  };

  const handleExportToExcel = () => {
    if (!token) return;
    
    const url = `${API_BASE}/logs/export?${query}`;
    
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Error al exportar');
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `historial-unidades-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      })
      .catch((err) => {
        console.error('Error al exportar:', err);
        alert('Error al exportar el archivo');
      });
  };

  const formatTime = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    
    const formatted = new Intl.DateTimeFormat('es-MX', options).format(date);
    return formatted.replace(',', '');
  };

  return(
    <ProtectedRoute>
      <div className="min-h-screen bg-red-50">
        <Header />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Histórico de Unidades</h1>
            <p className="text-gray-600">Visualiza estados y cambios.</p>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Última actualización: {lastUpdate.toLocaleTimeString('es-MX')}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
              <div className="flex-1">
                <Input placeholder="Buscar VIN" value={vin} onChange={(e) => setVin(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExportToExcel}
                  className="bg-green-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-md hover:bg-green-700 flex items-center justify-center gap-1.5 shadow-sm text-xs md:text-sm flex-1 sm:flex-none whitespace-nowrap"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Exportar a Excel</span>
                  <span className="sm:hidden">Excel</span>
                </Button>
              <div className="relative">
                <button
                  aria-label="Opciones"
                  className="p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-100 shadow-sm transition"
                  onClick={() => setOpenOptions(v => !v)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-gray-700">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5h14M3 12h10M3 19h6" />
                    <circle cx="19" cy="5" r="2" strokeWidth="1.5" />
                    <circle cx="15" cy="12" r="2" strokeWidth="1.5" />
                    <circle cx="11" cy="19" r="2" strokeWidth="1.5" />
                  </svg>
                </button>
                {openOptions && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg p-2 z-10">
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500">Orden</div>
                    <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded" onClick={() => { setSort('date'); setOrder('desc'); setOpenOptions(false); }}>Más reciente</button>
                    <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded" onClick={() => { setSort('date'); setOrder('asc'); setOpenOptions(false); }}>Más antiguo</button>
                    <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded" onClick={() => { setSort('alpha'); setOrder('asc'); setOpenOptions(false); }}>A→Z (VIN)</button>
                    <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded" onClick={() => { setSort('alpha'); setOrder('desc'); setOpenOptions(false); }}>Z→A (VIN)</button>

                    <div className="px-2 py-1 mt-2 text-xs font-semibold text-gray-500">Rango de fechas</div>
                    <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded" onClick={() => { const t = todayStr(); setStartDate(t); setEndDate(t); setOpenOptions(false); }}>Hoy</button>
                    <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded" onClick={() => { setStartDate(dateMinusDays(7)); setEndDate(todayStr()); setOpenOptions(false); }}>Últimos 7 días</button>
                    <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded" onClick={() => { setStartDate(dateMinusDays(30)); setEndDate(todayStr()); setOpenOptions(false); }}>Últimos 30 días</button>
                    <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded" onClick={() => { setStartDate(''); setEndDate(''); setOpenOptions(false); }}>Todo</button>
                  </div>
                )}
              </div>
            </div>
            </div>
          </CardHeader>
        </Card>

        <div className="mt-6">
          <Card>
            <CardBody>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell className="px-3 py-2 text-[11px]">VIN</TableHeadCell>
                    {/* Modelo column removed */}
                    <TableHeadCell className="px-3 py-2 text-[11px]">Mercado</TableHeadCell>
                    <TableHeadCell className="px-3 py-2 text-[11px]">Carril</TableHeadCell>
                    <TableHeadCell className="px-3 py-2 text-[11px]">Reportada</TableHeadCell>
                    <TableHeadCell className="px-3 py-2 text-[11px]">Nivelación</TableHeadCell>
                    <TableHeadCell className="px-3 py-2 text-[11px]">Entregada</TableHeadCell>
                    <TableHeadCell className="px-3 py-2 text-[11px]">Recibida</TableHeadCell>
                    <TableHeadCell className="px-3 py-2 text-[11px]">En Reparacion</TableHeadCell>
                    <TableHeadCell className="px-3 py-2 text-[11px]">Liberada Body</TableHeadCell>
                    <TableHeadCell className="px-3 py-2 text-[11px]">Liberada WWS</TableHeadCell>
                    <TableHeadCell className="px-3 py-2 text-[11px]">Aceptada</TableHeadCell>
                    <TableHeadCell className="px-3 py-2 text-[11px]">Registrado por</TableHeadCell>
                    <TableHeadCell className="px-3 py-2 text-[11px]">Notas</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUnits.map((unit: any) => (
                    <TableRow key={unit.unitId}>
                      <TableCell className="font-mono font-semibold px-3 py-2 text-xs">{unit.vin}</TableCell>
                      {/* Modelo removed */}
                      <TableCell className="px-3 py-2 text-xs">{unit.market}</TableCell>
                      <TableCell className="px-3 py-2 text-xs">{unit.lane}</TableCell>
                      <TableCell className="px-3 py-2 text-[11px]">{formatTime(unit.states.REPORTED)}</TableCell>
                      <TableCell className="px-3 py-2 text-[11px]">{formatTime(unit.states.SENT)}</TableCell>
                      <TableCell className="px-3 py-2 text-[11px]">{formatTime(unit.states.DELIVERED)}</TableCell>
                      <TableCell className="px-3 py-2 text-[11px]">{formatTime(unit.states.RECEIVED)}</TableCell>
                      <TableCell className="px-3 py-2 text-[11px]">{formatTime(unit.states.IN_REPAIR)}</TableCell>
                      <TableCell className="px-3 py-2 text-[11px]">{formatTime(unit.states.RELEASED)}</TableCell>
                      <TableCell className="px-3 py-2 text-[11px]">{formatTime(unit.states.WWS_RELEASED)}</TableCell>
                      <TableCell className="px-3 py-2 text-[11px]">{formatTime(unit.states.ACCEPTED)}</TableCell>
                      <TableCell className="px-3 py-2 text-xs">{unit.registeredByName}</TableCell>
                      <TableCell className="px-3 py-2 text-xs">
                        {(() => {
                          const notes = unit.notes || [];
                          return notes.length > 0 ? (
                            <button
                              onClick={() => handleViewNotes(unit)}
                              className="text-blue-600 hover:text-blue-800 font-semibold text-xs underline"
                            >
                              {notes.length} {notes.length === 1 ? 'nota' : 'notas'}
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
            <CardFooter className="items-center justify-between">
              <div className="text-xs text-gray-600">
                {(() => {
                  const total = sortedUnits.length;
                  const totalPages = Math.max(1, Math.ceil(total / pageSize));
                  const safePage = Math.min(page, totalPages);
                  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
                  const end = Math.min(safePage * pageSize, total);
                  return `Mostrando ${start}-${end} de ${total}`;
                })()}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Filas:</label>
                <select
                  className="border border-gray-200 rounded px-2 py-1 text-xs"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <Button
                  size="xs"
                  variant="tertiary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  size="xs"
                  variant="tertiary"
                  onClick={() => {
                    const totalPages = Math.max(1, Math.ceil(sortedUnits.length / pageSize));
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                  disabled={page >= Math.max(1, Math.ceil(sortedUnits.length / pageSize))}
                >
                  Siguiente
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Modal de Notas */}
        <Modal
          isOpen={isNotesModalOpen}
          onClose={() => setIsNotesModalOpen(false)}
          title={`Notas de Unidad: ${selectedUnitNotes?.vin || ''}`}
          size="md"
        >
          {selectedUnitNotes && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">VIN</p>
                  <p className="font-mono font-semibold">{selectedUnitNotes.vin}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Mercado</p>
                  <p className="font-semibold">{selectedUnitNotes.market}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Carril</p>
                  <p className="font-semibold">{selectedUnitNotes.lane}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total de Notas</p>
                  <p className="font-semibold">{selectedUnitNotes.notes?.length || 0}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Historial de Notas</h3>
                {selectedUnitNotes.notes && selectedUnitNotes.notes.length > 0 ? (
                  <div className="space-y-3">
                    {selectedUnitNotes.notes.map((noteItem: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 font-semibold text-xs rounded-full">
                            {noteItem.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTime(noteItem.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                          {noteItem.note}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-8">
                    No hay notas registradas para esta unidad
                  </p>
                )}
              </div>
            </div>
          )}
        </Modal>
      </main>
    </div>
    </ProtectedRoute>
  );
}
