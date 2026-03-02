'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';
import { useUnitEvents } from '@/lib/useUnitEvents';
import { API_BASE } from '@/lib/api';

interface DefectStats {
  v1: number;
  v2: number;
  v3: number;
}

interface DefectCountersProps {
  filterMode: 'today' | 'all';
}

export const DefectCounters = ({ filterMode }: DefectCountersProps) => {
  const { token } = useAuth();
  const [stats, setStats] = useState<DefectStats>({ v1: 0, v2: 0, v3: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = filterMode === 'today'
        ? `${API_BASE}/units/stats/defects?filter=today`
        : `${API_BASE}/units/stats/defects`;

      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data?.ok && data.data) {
        setStats({
          v1: data.data.v1 || 0,
          v2: data.data.v2 || 0,
          v3: data.data.v3 || 0
        });
      }
    } catch (error) {
      // Error cargando estadísticas
    } finally {
      setLoading(false);
    }
  }, [filterMode, token]);

  useUnitEvents({
    token,
    onEvent: () => {
      fetchStats();
    },
  });

  useEffect(() => {
    if (!token) return;
    fetchStats();
  }, [token, fetchStats]);

  return (
    <>
      {/* V1 - Grave */}
      <Card className="col-span-1 lg:col-span-4">
        <CardBody>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <span className="text-xl md:text-2xl font-bold text-red-600">V1</span>
            </div>
            <div className="flex-1">
              <p className="text-xs md:text-sm text-gray-500">Defectos Graves (V1)</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{loading ? '-' : stats.v1}</p>
              <p className="text-xs text-gray-400">Reparación extensa</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* V2 - Moderado */}
      <Card className="col-span-1 lg:col-span-4">
        <CardBody>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <span className="text-xl md:text-2xl font-bold text-amber-600">V2</span>
            </div>
            <div className="flex-1">
              <p className="text-xs md:text-sm text-gray-500">Defectos Moderados (V2)</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{loading ? '-' : stats.v2}</p>
              <p className="text-xs text-gray-400">Reparación media</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* V3 - Leve */}
      <Card className="col-span-1 lg:col-span-4">
        <CardBody>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-xl md:text-2xl font-bold text-blue-600">V3</span>
            </div>
            <div className="flex-1">
              <p className="text-xs md:text-sm text-gray-500">Defectos Leves (V3)</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{loading ? '-' : stats.v3}</p>
              <p className="text-xs text-gray-400">Reparación rápida</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
};
