'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useUnitEvents } from '@/lib/useUnitEvents';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TowTruckLoader } from '@/components/ui/TowTruckLoader';
import { API_BASE } from '@/lib/api';

/** Extracts the short keyword from a defect catalog name.
 *  "07 - Raspadura | Cavidad o malformación..." → "07 - Raspadura"
 *  "14 - Pintura o superficie cromada abollada..." → "14 - Pintura" */
const shortType = (name: string) => {
  const base = name.split('|')[0].trim();
  const match = base.match(/^(\d+\s*-\s*\S+)/);
  return match ? match[1] : base;
};

const MODEL_MAP: Record<string, string> = {
  N8: 'Versa',
  K3: 'March',
  P5: 'Kicks',
  P6: 'New Kicks',
};

const GRADE_COLORS: Record<string, string> = {
  V1: '#ef4444',
  V2: '#f59e0b',
  V3: '#60a5fa',
};

const MODEL_COLORS = ['#6366f1', '#10b981', '#f97316', '#e11d48', '#94a3b8'];
const TYPE_COLORS = ['#8b5cf6', '#06b6d4', '#84cc16', '#f43f5e', '#fb923c', '#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#f472b6'];

type DefectView = 'defects' | 'models' | 'time';
type TimeRange = 'today' | 'week' | 'month';

interface ModelRow { model_code: string; grade: string; count: number; }
interface TypeRow { type: string; grade: string; count: number; }
interface PieEntry { name: string; value: number; color: string; }

const RADIAN = Math.PI / 180;
type PieLabelArgs = {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
};

const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelArgs) => {
  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    typeof midAngle !== 'number' ||
    typeof innerRadius !== 'number' ||
    typeof outerRadius !== 'number' ||
    typeof percent !== 'number' ||
    percent < 0.05
  ) {
    return null;
  }

  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: '11px', fontWeight: 700, pointerEvents: 'none' }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const DonutChart = ({ data, title }: { data: PieEntry[]; title?: string }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div className="flex items-center justify-center h-[180px] text-gray-400 text-sm">Sin datos</div>
  );
  return (
    <div>
      {title && <p className="text-xs font-medium text-gray-500 mb-1 text-center">{title}</p>}
      <ResponsiveContainer width="100%" height={190}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={78}
            paddingAngle={2} dataKey="value" labelLine={false} label={renderLabel}>
            {data.map(e => <Cell key={e.name} fill={e.color} />)}
          </Pie>
          <Tooltip formatter={(val, name) => [val ?? 0, name]}
            contentStyle={{ fontSize: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }}
            formatter={(v) => <span className="text-gray-700">{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ResumenPanel = ({ filterMode }: { filterMode: 'today' | 'all' }) => {
  const { token } = useAuth();

  const [view, setView] = useState<DefectView>('defects');
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [activeGrades, setActiveGrades] = useState<Set<string>>(new Set(['V1', 'V2', 'V3']));
  const [modelRows, setModelRows] = useState<ModelRow[]>([]);
  const [typeRows, setTypeRows] = useState<TypeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const effectiveFilter = view === 'time' ? timeRange : (filterMode === 'today' ? 'today' : 'all');

  const fetchData = useCallback(async (filter: string) => {
    if (!token) return;
    try {
      setLoading(true);
      const param = filter === 'all' ? '' : `?filter=${filter}`;
      const [mr, tr] = await Promise.all([
        fetch(`${API_BASE}/dashboard/defects-by-model${param}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/dashboard/defects-by-type${param}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [md, td] = await Promise.all([mr.json(), tr.json()]);
      if (md?.ok) setModelRows(md.data ?? []);
      if (td?.ok) setTypeRows(td.data ?? []);
    } catch { /* silencioso */ } finally { setLoading(false); }
  }, [token]);

  useUnitEvents({ token, onEvent: () => fetchData(effectiveFilter) });
  useEffect(() => { fetchData(effectiveFilter); }, [fetchData, effectiveFilter]);

  const modelName = (code: string) => MODEL_MAP[code?.toUpperCase()] ?? `[${code}]`;

  const filteredModelRows = useMemo(
    () => modelRows.filter(r => activeGrades.has(r.grade?.toUpperCase())),
    [modelRows, activeGrades]
  );
  const filteredTypeRows = useMemo(
    () => typeRows.filter(r => activeGrades.has(r.grade?.toUpperCase())),
    [typeRows, activeGrades]
  );

  const gradesPieData = useMemo((): PieEntry[] => {
    const c: Record<string, number> = { V1: 0, V2: 0, V3: 0 };
    modelRows.forEach(r => { const g = r.grade?.toUpperCase(); if (g in c && activeGrades.has(g)) c[g] += r.count; });
    return (['V1', 'V2', 'V3'] as const).filter(g => c[g] > 0 && activeGrades.has(g))
      .map(g => ({ name: g, value: c[g], color: GRADE_COLORS[g] }));
  }, [modelRows, activeGrades]);

  const modelsPieData = useMemo((): PieEntry[] => {
    const map = new Map<string, number>();
    filteredModelRows.forEach(r => {
      const n = modelName(r.model_code);
      map.set(n, (map.get(n) ?? 0) + r.count);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: MODEL_COLORS[i % MODEL_COLORS.length] }));
  }, [filteredModelRows]);

  const typesPieData = useMemo((): PieEntry[] => {
    const map = new Map<string, number>();
    filteredTypeRows.forEach(r => {
      const key = shortType(r.type ?? 'Sin tipo');
      map.set(key, (map.get(key) ?? 0) + r.count);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value], i) => ({ name, value, color: TYPE_COLORS[i % TYPE_COLORS.length] }));
  }, [filteredTypeRows]);

  const totalDefects = gradesPieData.reduce((s, d) => s + d.value, 0);

  const toggleGrade = (g: string) =>
    setActiveGrades(prev => {
      const next = new Set(prev);
      if (next.has(g)) { if (next.size > 1) next.delete(g); } else next.add(g);
      return next;
    });

  const GradeChips = () => (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-400">Grado:</span>
      {(['V1', 'V2', 'V3'] as const).map(g => (
        <button key={g} onClick={() => toggleGrade(g)}
          className={`px-2.5 py-0.5 text-xs font-bold rounded-full border transition-all ${activeGrades.has(g)
            ? g === 'V1' ? 'bg-red-100 text-red-700 border-red-300'
              : g === 'V2' ? 'bg-amber-100 text-amber-700 border-amber-300'
                : 'bg-blue-100 text-blue-700 border-blue-300'
            : 'bg-gray-100 text-gray-300 border-gray-200 line-through opacity-50'
            }`}>
          {g}
        </button>
      ))}
      {totalDefects > 0 && (
        <span className="ml-auto text-xs text-gray-400">
          Total: <span className="font-bold text-gray-700">{totalDefects}</span>
        </span>
      )}
    </div>
  );

  const ModelCards = ({ data }: { data: PieEntry[] }) => {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    return data.length > 0 ? (
      <div className="grid grid-cols-2 gap-2 mt-1">
        {data.map(row => (
          <div key={row.name} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
            <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{row.name}</p>
              <p className="text-xs text-gray-400">{((row.value / total) * 100).toFixed(1)}%</p>
            </div>
            <span className="text-base font-bold text-gray-900 shrink-0">{row.value}</span>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-center text-sm text-gray-400 py-4">Sin datos en este período</p>
    );
  };

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'defects', label: 'Por Defecto' },
          { key: 'models', label: 'Por Modelo' },
          { key: 'time', label: 'Por Tiempo' },
        ] as { key: DefectView; label: string }[]).map(tab => (
          <button key={tab.key} onClick={() => setView(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${view === tab.key
              ? 'bg-red-600 text-white border-red-600 shadow-sm'
              : 'bg-white text-gray-600 border-gray-300 hover:border-red-400 hover:text-red-600'
              }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <GradeChips />

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-6 px-3">
          <TowTruckLoader label="Loading..." size="md" className="w-full max-w-xs" />
        </div>
      ) : (
        <>
          {/* ══ DEFECTOS ══ */}
          {view === 'defects' && (
            <div className="flex flex-col gap-3">
              <DonutChart data={gradesPieData} title="Distribución por grado (V1 / V2 / V3)" />
              {typesPieData.length > 0 && (
                <>
                  <p className="text-xs font-medium text-gray-500">Tipos de defecto más frecuentes</p>
                  <DonutChart data={typesPieData} />
                  <div className="space-y-1.5">
                    {typesPieData.map((row, i) => {
                      const maxVal = typesPieData[0]?.value || 1;
                      return (
                        <div key={row.name} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                          <span className="text-xs text-gray-700 flex-1 truncate" title={row.name}>{row.name}</span>
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${(row.value / maxVal) * 100}%`, backgroundColor: row.color }} />
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-5 text-right">{row.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {gradesPieData.length === 0 && typesPieData.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">Sin defectos registrados</p>
              )}
            </div>
          )}

          {/* ══ MODELOS ══ */}
          {view === 'models' && (
            <div className="flex flex-col gap-3">
              <DonutChart data={modelsPieData} title="Defectos por modelo" />
              <ModelCards data={modelsPieData} />
            </div>
          )}

          {/* ══ POR TIEMPO ══ */}
          {view === 'time' && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 flex-wrap">
                {([
                  { key: 'today', label: 'Hoy' },
                  { key: 'week', label: '7 días' },
                  { key: 'month', label: '30 días' },
                ] as { key: TimeRange; label: string }[]).map(opt => (
                  <button key={opt.key} onClick={() => setTimeRange(opt.key)}
                    className={`px-3 py-1 text-xs rounded-full border transition-all ${timeRange === opt.key
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                      }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <DonutChart data={modelsPieData} title="Modelos afectados en el período" />
              <ModelCards data={modelsPieData} />
            </div>
          )}
        </>
      )}
    </div>
  );
};
