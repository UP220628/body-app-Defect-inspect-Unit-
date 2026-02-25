'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useUnitEvents } from '@/lib/useUnitEvents';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ─── Costants ────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

/** Mapeo dígito 5-6 del VIN → nombre del modelo */
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

const MODEL_COLORS = ['#6366f1', '#10b981', '#f97316', '#e11d48'];

// ─── Utilities ────────────────────────────────────────────────────────────────

function getModelFromVin(vin: string): string {
  if (!vin || vin.length < 6) return 'Otro';
  const key = vin.substring(4, 6).toUpperCase();
  return MODEL_MAP[key] ?? 'Otro';
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DefectView = 'defects' | 'models' | 'time';
type TimeRange = 'today' | 'week' | 'month';

interface UnitRaw {
  id: number;
  vin: string;
  createdAt: string;
  defects?: Array<{ grade: string; type?: string; defectType?: string }>;
}

interface ModelDefectRow {
  model: string;
  V1: number;
  V2: number;
  V3: number;
  total: number;
}

interface DefectTypeRow {
  type: string;
  count: number;
}

// ─── Sub-charts ───────────────────────────────────────────────────────────────

const GradeBarChart = ({ data }: { data: Array<{ grade: string; count: number }> }) => (
  <ResponsiveContainer width="100%" height={180}>
    <BarChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
      <XAxis dataKey="grade" stroke="#6b7280" style={{ fontSize: '12px' }} />
      <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} allowDecimals={false} />
      <Tooltip
        formatter={(v) => [v ?? 0, 'Cantidad']}
        contentStyle={{ fontSize: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
      />
      <Bar dataKey="count" name="Cantidad" radius={[4, 4, 0, 0]}>
        {data.map(d => (
          <Cell key={d.grade} fill={GRADE_COLORS[d.grade] ?? '#94a3b8'} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

const ModelStackedChart = ({ data }: { data: ModelDefectRow[] }) => {
  const models = data.map(d => d.model);
  const colors = models.reduce<Record<string, string>>((acc, m, i) => {
    acc[m] = MODEL_COLORS[i % MODEL_COLORS.length];
    return acc;
  }, {});

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="model" stroke="#6b7280" style={{ fontSize: '11px' }} />
        <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
        />
        {data.map((d, i) => (
          <Bar
            key={d.model}
            dataKey="total"
            name={d.model}
            stackId="a"
            fill={MODEL_COLORS[i % MODEL_COLORS.length]}
            radius={i === data.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ResumenPanel = ({ filterMode }: { filterMode: 'today' | 'all' }) => {
  const { token } = useAuth();

  // view tabs
  const [view, setView] = useState<DefectView>('defects');

  // time-range filter (for "time" view)
  const [timeRange, setTimeRange] = useState<TimeRange>('today');

  // grade filter chips (multi-select) for "defects" view
  const [activeGrades, setActiveGrades] = useState<Set<string>>(new Set(['V1', 'V2', 'V3']));

  // model filter chips for "models" view
  const [activeModels, setActiveModels] = useState<Set<string>>(
    new Set(['Versa', 'March', 'Kicks', 'New Kicks', 'Otro'])
  );

  // raw data
  const [units, setUnits] = useState<UnitRaw[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch a generous limit so we can process client-side
      const res = await fetch(`${API_BASE}/units?limit=2000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setUnits(data);
      } else if (data?.data && Array.isArray(data.data)) {
        setUnits(data.data);
      } else if (data?.ok && Array.isArray(data.data)) {
        setUnits(data.data);
      }
    } catch {/* silencioso */} finally {
      setLoading(false);
    }
  }, [token]);

  useUnitEvents({ token, onEvent: fetchUnits });
  useEffect(() => { if (token) fetchUnits(); }, [token, fetchUnits]);

  // ── Derived data ────────────────────────────────────────────────────────────

  /** Filtra por filterMode global (hoy / todas) */
  const baseUnits = useMemo(() => {
    if (filterMode !== 'today') return units;
    const todayStr = new Date().toISOString().slice(0, 10);
    return units.filter(u => u.createdAt?.slice(0, 10) === todayStr);
  }, [units, filterMode]);

  /** Filtra por rango de tiempo (usado en la vista "time") */
  const timeFilteredUnits = useMemo(() => {
    const now = new Date();
    return baseUnits.filter(u => {
      const d = new Date(u.createdAt);
      if (timeRange === 'today') {
        return d.toDateString() === now.toDateString();
      } else if (timeRange === 'week') {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 7);
        return d >= cutoff;
      } else {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 30);
        return d >= cutoff;
      }
    });
  }, [baseUnits, timeRange]);

  /** Datos para la vista "defects" – conteo por grado filtrado */
  const defectGradeData = useMemo(() => {
    const counts: Record<string, number> = { V1: 0, V2: 0, V3: 0 };
    baseUnits.forEach(u =>
      u.defects?.forEach(d => {
        const g = d.grade?.toUpperCase();
        if (g && g in counts) counts[g]++;
      })
    );
    return (['V1', 'V2', 'V3'] as const)
      .filter(g => activeGrades.has(g))
      .map(g => ({ grade: g, count: counts[g] }));
  }, [baseUnits, activeGrades]);

  /** Tipos de defecto más repetidos (top 8) */
  const defectTypeData = useMemo((): DefectTypeRow[] => {
    const map = new Map<string, number>();
    baseUnits.forEach(u =>
      u.defects?.forEach(d => {
        if (!activeGrades.has(d.grade?.toUpperCase() ?? '')) return;
        const t = d.defectType ?? d.type ?? 'Sin tipo';
        map.set(t, (map.get(t) ?? 0) + 1);
      })
    );
    return Array.from(map.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [baseUnits, activeGrades]);

  /** Datos para la vista "models" */
  const modelData = useMemo((): ModelDefectRow[] => {
    const map = new Map<string, ModelDefectRow>();
    const allModels = [...Object.values(MODEL_MAP), 'Otro'];
    allModels.forEach(m => map.set(m, { model: m, V1: 0, V2: 0, V3: 0, total: 0 }));

    baseUnits.forEach(u => {
      const model = getModelFromVin(u.vin);
      if (!activeModels.has(model)) return;
      const row = map.get(model)!;
      u.defects?.forEach(d => {
        const g = d.grade?.toUpperCase();
        if (g === 'V1') { row.V1++; row.total++; }
        else if (g === 'V2') { row.V2++; row.total++; }
        else if (g === 'V3') { row.V3++; row.total++; }
      });
    });
    return Array.from(map.values()).filter(r => r.total > 0);
  }, [baseUnits, activeModels]);

  /** Datos para la vista "time" – modelos afectados en el rango */
  const timeModelData = useMemo((): ModelDefectRow[] => {
    const map = new Map<string, ModelDefectRow>();
    const allModels = [...Object.values(MODEL_MAP), 'Otro'];
    allModels.forEach(m => map.set(m, { model: m, V1: 0, V2: 0, V3: 0, total: 0 }));

    timeFilteredUnits.forEach(u => {
      const model = getModelFromVin(u.vin);
      const row = map.get(model)!;
      u.defects?.forEach(d => {
        const g = d.grade?.toUpperCase();
        if (g === 'V1') { row.V1++; row.total++; }
        else if (g === 'V2') { row.V2++; row.total++; }
        else if (g === 'V3') { row.V3++; row.total++; }
      });
    });
    return Array.from(map.values()).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
  }, [timeFilteredUnits]);

  // ── Toggle helpers ──────────────────────────────────────────────────────────

  const toggleGrade = (g: string) => {
    setActiveGrades(prev => {
      const next = new Set(prev);
      if (next.has(g)) { if (next.size > 1) next.delete(g); } else next.add(g);
      return next;
    });
  };

  const toggleModel = (m: string) => {
    setActiveModels(prev => {
      const next = new Set(prev);
      if (next.has(m)) { if (next.size > 1) next.delete(m); } else next.add(m);
      return next;
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Tab selectors ── */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'defects', label: 'Por Defecto' },
          { key: 'models', label: 'Por Modelo' },
          { key: 'time', label: 'Por Tiempo' },
        ] as { key: DefectView; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              view === tab.key
                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-300 hover:border-red-400 hover:text-red-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Cargando datos...
        </div>
      ) : (
        <>
          {/* ═══════════ VISTA: DEFECTOS ═══════════ */}
          {view === 'defects' && (
            <div className="flex flex-col gap-3">
              {/* Grade filter chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">Grado:</span>
                {(['V1', 'V2', 'V3'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => toggleGrade(g)}
                    className={`px-2.5 py-0.5 text-xs font-bold rounded-full border transition-all ${
                      activeGrades.has(g)
                        ? g === 'V1'
                          ? 'bg-red-100 text-red-700 border-red-300'
                          : g === 'V2'
                          ? 'bg-amber-100 text-amber-700 border-amber-300'
                          : 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-gray-100 text-gray-400 border-gray-200 opacity-50'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Gráfica por grado */}
              <GradeBarChart data={defectGradeData} />

              {/* Top tipos de defecto */}
              {defectTypeData.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Defectos más frecuentes</p>
                  <div className="space-y-1.5">
                    {defectTypeData.map((row, i) => {
                      const maxCount = defectTypeData[0].count || 1;
                      const pct = (row.count / maxCount) * 100;
                      return (
                        <div key={row.type} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-4 text-right">{i + 1}</span>
                          <span className="text-xs text-gray-700 w-28 truncate" title={row.type}>{row.type}</span>
                          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-red-400 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-6 text-right">{row.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {defectGradeData.every(d => d.count === 0) && (
                <p className="text-center text-sm text-gray-400 py-4">Sin defectos registrados</p>
              )}
            </div>
          )}

          {/* ═══════════ VISTA: MODELOS ═══════════ */}
          {view === 'models' && (
            <div className="flex flex-col gap-3">
              {/* Model filter chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">Modelo:</span>
                {[...Object.values(MODEL_MAP), 'Otro'].map((m, i) => (
                  <button
                    key={m}
                    onClick={() => toggleModel(m)}
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border transition-all ${
                      activeModels.has(m)
                        ? 'text-white border-transparent'
                        : 'bg-gray-100 text-gray-400 border-gray-200 opacity-50'
                    }`}
                    style={activeModels.has(m) ? { backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length] } : {}}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {modelData.length > 0 ? (
                <>
                  {/* Gráfica */}
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={modelData} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="model" stroke="#6b7280" style={{ fontSize: '11px' }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }} />
                      <Bar dataKey="V1" name="V1 Grave" stackId="s" fill="#ef4444" />
                      <Bar dataKey="V2" name="V2 Moderado" stackId="s" fill="#f59e0b" />
                      <Bar dataKey="V3" name="V3 Leve" stackId="s" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Tabla resumen */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500 border-b border-gray-100">
                          <th className="text-left py-1 pr-2">Modelo</th>
                          <th className="text-center px-1"><span className="text-red-600 font-bold">V1</span></th>
                          <th className="text-center px-1"><span className="text-amber-600 font-bold">V2</span></th>
                          <th className="text-center px-1"><span className="text-blue-600 font-bold">V3</span></th>
                          <th className="text-right pl-2 font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modelData.map(row => (
                          <tr key={row.model} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-1 pr-2 font-medium text-gray-800">{row.model}</td>
                            <td className="text-center px-1 text-red-600">{row.V1}</td>
                            <td className="text-center px-1 text-amber-600">{row.V2}</td>
                            <td className="text-center px-1 text-blue-600">{row.V3}</td>
                            <td className="text-right pl-2 font-bold text-gray-900">{row.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-center text-sm text-gray-400 py-6">Sin unidades con defectos</p>
              )}
            </div>
          )}

          {/* ═══════════ VISTA: POR TIEMPO ═══════════ */}
          {view === 'time' && (
            <div className="flex flex-col gap-3">
              {/* Time-range selector */}
              <div className="flex gap-2">
                {([
                  { key: 'today', label: 'Hoy' },
                  { key: 'week', label: 'Últimos 7 días' },
                  { key: 'month', label: 'Últimos 30 días' },
                ] as { key: TimeRange; label: string }[]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setTimeRange(opt.key)}
                    className={`px-3 py-1 text-xs rounded-full border transition-all ${
                      timeRange === opt.key
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {timeModelData.length > 0 ? (
                <>
                  <p className="text-xs text-gray-500">
                    Modelos afectados –{' '}
                    <span className="font-semibold text-gray-700">
                      {timeFilteredUnits.length} unidades
                    </span>{' '}
                    en{' '}
                    {timeRange === 'today' ? 'hoy' : timeRange === 'week' ? 'los últimos 7 días' : 'los últimos 30 días'}
                  </p>

                  {/* Gráfica apilada por modelo */}
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={timeModelData} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="model" stroke="#6b7280" style={{ fontSize: '11px' }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }} />
                      <Bar dataKey="V1" name="V1 Grave" stackId="s" fill="#ef4444" />
                      <Bar dataKey="V2" name="V2 Moderado" stackId="s" fill="#f59e0b" />
                      <Bar dataKey="V3" name="V3 Leve" stackId="s" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Cards por modelo */}
                  <div className="grid grid-cols-2 gap-2">
                    {timeModelData.map((row, i) => (
                      <div
                        key={row.model}
                        className="border border-gray-100 rounded-lg p-2 bg-white flex items-center gap-2 shadow-sm"
                      >
                        <div
                          className="w-2 h-10 rounded-full shrink-0"
                          style={{ backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length] }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{row.model}</p>
                          <div className="flex gap-2 mt-0.5">
                            <span className="text-xs text-red-600">{row.V1} V1</span>
                            <span className="text-xs text-amber-600">{row.V2} V2</span>
                            <span className="text-xs text-blue-600">{row.V3} V3</span>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-gray-900 shrink-0">{row.total}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-sm text-gray-400 py-6">Sin unidades en este período</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
