'use client';

import {Header} from "@/components/layout/Header";
import { useCallback, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DefectCounters } from "@/components/dashboards/DefectCounters";
import { ParetoChart } from "@/components/dashboards/ParetoChart";
import { ResumenPanel } from "@/components/dashboards/ResumenPanel";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { useUnitEvents } from "@/lib/useUnitEvents";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_BASE } from '@/lib/api';

type WeeklyRow = { date: string; provider: string; count: number };
type MonthlyRow = { date: string; count: number };
type ProviderTotal = { provider: string; count: number };
type WeeklyChartRow = { date: string; fullDate: string; [key: string]: string | number };

export default function Page (){
  const { token } = useAuth();
  const [filterMode, setFilterMode] = useState<'today' | 'all'>('today');
  const [weeklyData, setWeeklyData] = useState<WeeklyRow[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRow[]>([]);
  const [statusStats, setStatusStats] = useState<Record<string, number>>({});
  const [providerStats, setProviderStats] = useState<ProviderTotal[]>([]);

  const formatChartDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const safeDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return new Intl.DateTimeFormat('es-MX', {
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Mexico_City'
    }).format(safeDate);
  };

  const loadWeeklyData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/dashboard/weekly-by-provider`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data?.ok && Array.isArray(data.data)) {
        setWeeklyData(data.data as WeeklyRow[]);
      }
    } catch {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error loading weekly data');
      }
    }
  }, [token]);

  const loadMonthlyData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/dashboard/monthly-timeline`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data?.ok && Array.isArray(data.data)) {
        setMonthlyData(data.data as MonthlyRow[]);
      }
    } catch {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error loading monthly data');
      }
    }
  }, [token]);

  const loadStatusStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/units/stats/by-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data?.ok) {
        setStatusStats(data.data || {});
      }
    } catch {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error loading status stats');
      }
    }
  }, [token]);

  const loadProviderStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/dashboard/weekly-by-provider`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data?.ok && Array.isArray(data.data)) {
        // Agrupar por proveedor y sumar totales
        const providerMap = new Map<string, number>();
        (data.data as WeeklyRow[]).forEach((item) => {
          // Filtrar "sin proveedor" o valores vacíos
          if (item.provider && item.provider.toLowerCase() !== 'sin proveedor') {
            const current = providerMap.get(item.provider) || 0;
            providerMap.set(item.provider, current + item.count);
          }
        });
        const sorted = Array.from(providerMap.entries())
          .map(([provider, count]) => ({ provider, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setProviderStats(sorted);
      }
    } catch {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error loading provider stats');
      }
    }
  }, [token]);

  useUnitEvents({
    token,
    onEvent: () => {
      loadWeeklyData();
      loadMonthlyData();
      loadStatusStats();
      loadProviderStats();
    },
  });

  useEffect(() => {
    if (!token) return;
    const timeoutId = window.setTimeout(() => {
      void loadWeeklyData();
      void loadMonthlyData();
      void loadStatusStats();
      void loadProviderStats();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [token, loadWeeklyData, loadMonthlyData, loadStatusStats, loadProviderStats]);

  // Agrupar datos semanales por proveedor y fecha
  const weeklyChartData = (() => {
    const dateMap = new Map<string, WeeklyChartRow>();
    
    weeklyData.forEach(item => {
      // Filtrar "sin proveedor" o valores vacíos
      if (item.provider && item.provider.toLowerCase() !== 'sin proveedor') {
        if (!dateMap.has(item.date)) {
          dateMap.set(item.date, {
            date: formatChartDate(item.date),
            fullDate: item.date
          });
        }
        const entry = dateMap.get(item.date);
        if (entry) {
          entry[item.provider] = item.count;
        }
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  })();

  const providers = [...new Set(weeklyData
    .filter(d => d.provider && d.provider.toLowerCase() !== 'sin proveedor')
    .map(d => d.provider))];
  const providerColors = ['#60a5fa', '#34d399', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Formatear datos mensuales
  const monthlyChartData = monthlyData.map((item) => ({
    date: formatChartDate(item.date),
    unidades: item.count
  }));

  const statusConfig: { [key: string]: { label: string; color: string} } = {
    'ACCEPTED': { label: 'Aceptadas', color: 'bg-gray-100 text-gray-700'},
    'REPORTED': { label: 'Reportadas', color: 'bg-blue-100 text-blue-700'},
    'SENT': { label: 'Enviadas a Body', color: 'bg-amber-100 text-amber-700'},
    'RECEIVED': { label: 'Recibidas', color: 'bg-purple-100 text-purple-700'},
    'IN_REPAIR': { label: 'En Reparación', color: 'bg-orange-100 text-orange-700'},
    'RELEASED': { label: 'Liberadas', color: 'bg-green-100 text-green-700'},
    'WWS_RELEASED': { label: 'WWS Liberadas', color: 'bg-emerald-100 text-emerald-700'},
    'UNAVAILABLE': { label: 'No Disponibles', color: 'bg-red-100 text-red-700' },
    'REJECTED': { label: 'Rechazadas', color: 'bg-red-100 text-red-700' },
    'ARCHIVED': { label: 'Archivadas', color: 'bg-gray-200 text-gray-600' },
  };

  return(
    <ProtectedRoute>
      <div className="min-h-screen bg-red-50">
        <Header />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Dashboards</h1>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filterMode === 'today' ? 'primary' : 'secondary'}
              onClick={() => setFilterMode('today')}
              className="text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
            >
              Hoy
            </Button>
            <Button
              size="sm"
              variant={filterMode === 'all' ? 'primary' : 'secondary'}
              onClick={() => setFilterMode('all')}
              className="text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
            >
              Todas
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Defect Grade Counters - V1, V2, V3 */}
          <DefectCounters filterMode={filterMode} />

          {/* Gráfica de Pareto - Defectos V1, V2, V3 */}
          <Card className="col-span-1 lg:col-span-12">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">Pareto de Defectos (V1, V2, V3)</div>
                <span className="text-xs text-gray-400">Barras: cantidad · Línea morada: % acumulado</span>
              </div>
            </CardHeader>
            <CardBody>
              <ParetoChart filterMode={filterMode} />
            </CardBody>
          </Card>

          {/* Line chart - Mensual */}
          <Card className="col-span-1 lg:col-span-7 flex flex-col">
            <CardHeader>
              <div className="text-sm font-medium text-gray-700">Tendencia Mensual (últimos 30 días)</div>
            </CardHeader>
            <CardBody className="flex-1 min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280" 
                    style={{ fontSize: '11px' }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    style={{ fontSize: '11px' }}
                    label={{ value: 'Unidades', angle: -90, position: 'insideLeft', style: { fontSize: '11px' } }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="unidades" 
                    stroke="#60a5fa" 
                    strokeWidth={2}
                    dot={{ fill: '#60a5fa', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Resumen interactivo */}
          <Card className="col-span-1 lg:col-span-5">
            <CardHeader>
              <div className="text-sm font-medium text-gray-700">Resumen {filterMode === 'today' ? 'Hoy' : 'Total'}</div>
            </CardHeader>
            <CardBody className="overflow-y-auto max-h-[580px]">
              <ResumenPanel filterMode={filterMode} />
            </CardBody>
          </Card>

          {/* Gráfica semanal por proveedor */}
          <Card className="col-span-1 lg:col-span-7">
            <CardHeader>
              <div className="text-sm font-medium text-gray-700">Por Proveedor (últimos 7 días)</div>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280" 
                    style={{ fontSize: '11px' }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    style={{ fontSize: '11px' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    iconType="line"
                  />
                  {providers.map((provider, idx) => (
                    <Line 
                      key={provider}
                      type="monotone" 
                      dataKey={provider} 
                      stroke={providerColors[idx % providerColors.length]} 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Flujo de Trabajo - Estados */}
          <Card className="col-span-1 lg:col-span-5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">Flujo de Trabajo</div>
                <Badge variant="info" className="text-xs">En tiempo real</Badge>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {Object.entries(statusStats).map(([status, count]) => {
                  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: '•' };
                  return (
                    <div key={status} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{config.label}</p>
                          <p className="text-xs text-gray-500">{status}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${config.color}`}>
                          {count as number}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(statusStats).length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No hay datos disponibles
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Top Proveedores */}
          <Card className="col-span-1 lg:col-span-12">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">Top 5 Proveedores (últimos 7 días)</div>
                <Badge variant="success" className="text-xs">Más activos</Badge>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {providerStats.map((provider, idx) => {
                  const totalCount = providerStats.reduce((sum, p) => sum + p.count, 0) || 1;
                  const percentage = (provider.count / totalCount) * 100;
                  return (
                    <div key={provider.provider} className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm`} 
                               style={{ backgroundColor: providerColors[idx % providerColors.length] }}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 truncate max-w-[120px]" title={provider.provider}>
                              {provider.provider}
                            </p>
                          </div>
                        </div>
                        <span className="text-xl font-bold text-gray-900">{provider.count}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-500 rounded-full"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: providerColors[idx % providerColors.length]
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {percentage.toFixed(0)}%
                      </p>
                    </div>
                  );
                })}
                {providerStats.length === 0 && (
                  <div className="col-span-5 text-center py-4 text-gray-500 text-sm">
                    No hay datos de proveedores disponibles
                  </div>
                )}
              </div>
            </CardBody>
          </Card>


        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}