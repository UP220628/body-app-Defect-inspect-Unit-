'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useUnitEvents } from '@/lib/useUnitEvents';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DefectStats {
  v1: number;
  v2: number;
  v3: number;
}

interface ParetoDataPoint {
  name: string;
  count: number;
  cumulative: number;
  color: string;
}

interface ParetoChartProps {
  filterMode: 'today' | 'all';
}

import { API_BASE } from '@/lib/api';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-xs">
        <p className="font-semibold text-gray-800 mb-1">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name === '% Acumulado'
              ? `${entry.name}: ${entry.value.toFixed(1)}%`
              : `${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const ParetoChart = ({ filterMode }: ParetoChartProps) => {
  const { token } = useAuth();
  const [stats, setStats] = useState<DefectStats>({ v1: 0, v2: 0, v3: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint =
        filterMode === 'today'
          ? `${API_BASE}/units/stats/defects?filter=today`
          : `${API_BASE}/units/stats/defects`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data?.ok && data.data) {
        setStats({
          v1: data.data.v1 || 0,
          v2: data.data.v2 || 0,
          v3: data.data.v3 || 0,
        });
      }
    } catch {
      // Error cargando estadísticas
    } finally {
      setLoading(false);
    }
  }, [filterMode, token]);

  useUnitEvents({ token, onEvent: fetchStats });

  useEffect(() => {
    if (!token) return;
    fetchStats();
  }, [token, fetchStats]);

  // Construir datos para la gráfica de Pareto
  const rawData = [
    { name: 'V1 – Grave', count: stats.v1, color: '#ef4444' },
    { name: 'V2 – Moderado', count: stats.v2, color: '#f59e0b' },
    { name: 'V3 – Leve', count: stats.v3, color: '#60a5fa' },
  ].sort((a, b) => b.count - a.count);

  const total = rawData.reduce((sum, d) => sum + d.count, 0) || 1;
  let cumSum = 0;
  const paretoData: ParetoDataPoint[] = rawData.map((d) => {
    cumSum += d.count;
    return { ...d, cumulative: parseFloat(((cumSum / total) * 100).toFixed(1)) };
  });

  return (
    <div className="w-full h-full">
      {loading ? (
        <div className="flex items-center justify-center h-full min-h-[220px] text-gray-400 text-sm">
          Cargando...
        </div>
      ) : total === 0 ? (
        <div className="flex items-center justify-center h-full min-h-[220px] text-gray-400 text-sm">
          Sin datos disponibles
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart
            data={paretoData}
            margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              style={{ fontSize: '11px' }}
              tick={{ fill: '#374151' }}
            />
            {/* Eje izquierdo – conteo */}
            <YAxis
              yAxisId="left"
              stroke="#6b7280"
              style={{ fontSize: '11px' }}
              label={{
                value: 'Cantidad',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: '11px', fill: '#6b7280' },
              }}
              allowDecimals={false}
            />
            {/* Eje derecho – porcentaje acumulado */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              stroke="#6b7280"
              style={{ fontSize: '11px' }}
              label={{
                value: '% Acum.',
                angle: 90,
                position: 'insideRight',
                style: { fontSize: '11px', fill: '#6b7280' },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
              iconType="square"
            />

            {/* Barras */}
            <Bar yAxisId="left" dataKey="count" name="Defectos" radius={[4, 4, 0, 0]}>
              {paretoData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>

            {/* Línea acumulada */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              name="% Acumulado"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={{ fill: '#7c3aed', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
