'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Table, TableBody, TableHeader, TableRow, TableCell, TableHeadCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/units/StatusBadge';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { useUnitEvents } from '@/lib/useUnitEvents';
import type { Plant } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

type Unit = {
  id: number;
  vin: string;
  market: string;
  lane: string;
  statusName: string;
  plant?: Plant;
  providerId?: number;
  providerName?: string;
  createdAt: string;
  defects?: { id: number; type: string; zone: string; grade: string }[];
};

type PlantFilter = 'ALL' | 'A1' | 'A2';

export default function CatalogoNissanPage() {
  const { user, token } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [plantFilter, setPlantFilter] = useState<PlantFilter>('ALL');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Guard for plant-based access
  const canViewAllPlants = user?.roleId === 5; // ADMIN
  const userPlant = user?.plant;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/units?limit=500`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data?.ok && Array.isArray(data.data)) {
        setUnits(data.data);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Error loading units:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useUnitEvents({ token, onEvent: () => load() });

  useEffect(() => {
    load();
  }, [load]);

  // Filter units based on search term, plant filter, and user permissions
  const filteredUnits = useMemo(() => {
    return units.filter(unit => {
      // Plant filter
      if (!canViewAllPlants && userPlant && unit.plant !== userPlant) {
        return false;
      }
      if (plantFilter !== 'ALL' && unit.plant !== plantFilter) {
        return false;
      }
      
      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          unit.vin.toLowerCase().includes(term) ||
          unit.market.toLowerCase().includes(term) ||
          unit.lane.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [units, searchTerm, plantFilter, canViewAllPlants, userPlant]);

  // Stats by plant
  const plantStats = useMemo(() => {
    const stats = { A1: 0, A2: 0, unknown: 0 };
    units.forEach(unit => {
      if (unit.plant === 'A1') stats.A1++;
      else if (unit.plant === 'A2') stats.A2++;
      else stats.unknown++;
    });
    return stats;
  }, [units]);

  // Plant badge component
  const PlantBadge = ({ plant }: { plant?: Plant }) => {
    if (!plant) {
      return <Badge variant="default">Sin planta</Badge>;
    }
    return (
      <Badge variant={plant === 'A1' ? 'info' : 'warning'}>
        {plant}
      </Badge>
    );
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-red-50">
        <Header />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Catálogo Nissan</h1>
              <p className="text-gray-600">
                Consulta de unidades registradas
                {userPlant && !canViewAllPlants && (
                  <span className="ml-2 text-sm">
                    <Badge variant={userPlant === 'A1' ? 'info' : 'warning'}>
                      Planta {userPlant}
                    </Badge>
                  </span>
                )}
              </p>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Última actualización: {lastUpdate.toLocaleTimeString('es-MX')}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardBody>
                <p className="text-sm text-gray-600 mb-1">Total Unidades</p>
                <p className="text-3xl font-bold text-gray-900">{filteredUnits.length}</p>
              </CardBody>
            </Card>
            {canViewAllPlants && (
              <>
                <Card>
                  <CardBody>
                    <p className="text-sm text-gray-600 mb-1">Planta A1</p>
                    <p className="text-3xl font-bold text-blue-600">{plantStats.A1}</p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p className="text-sm text-gray-600 mb-1">Planta A2</p>
                    <p className="text-3xl font-bold text-purple-600">{plantStats.A2}</p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p className="text-sm text-gray-600 mb-1">Sin Asignar</p>
                    <p className="text-3xl font-bold text-gray-500">{plantStats.unknown}</p>
                  </CardBody>
                </Card>
              </>
            )}
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardBody>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    type="text"
                    placeholder="Buscar por VIN, mercado o línea..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                {canViewAllPlants && (
                  <div className="flex gap-2">
                    <Button
                      variant={plantFilter === 'ALL' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setPlantFilter('ALL')}
                    >
                      Todas
                    </Button>
                    <Button
                      variant={plantFilter === 'A1' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setPlantFilter('A1')}
                    >
                      A1
                    </Button>
                    <Button
                      variant={plantFilter === 'A2' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setPlantFilter('A2')}
                    >
                      A2
                    </Button>
                  </div>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={load}
                  disabled={loading}
                >
                  {loading ? 'Cargando...' : 'Actualizar'}
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Units Table */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Unidades Registradas</h2>
            </CardHeader>
            <CardBody className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Cargando unidades...</div>
              ) : filteredUnits.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No se encontraron unidades
                  {searchTerm && ' con los criterios de búsqueda especificados'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHeadCell>VIN</TableHeadCell>
                        <TableHeadCell>Mercado</TableHeadCell>
                        <TableHeadCell>Línea</TableHeadCell>
                        <TableHeadCell>Estado</TableHeadCell>
                        <TableHeadCell>Planta</TableHeadCell>
                        <TableHeadCell>Defectos</TableHeadCell>
                        <TableHeadCell>Fecha Registro</TableHeadCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUnits.map((unit) => (
                        <TableRow key={unit.id}>
                          <TableCell className="font-mono text-sm">{unit.vin}</TableCell>
                          <TableCell>{unit.market}</TableCell>
                          <TableCell>{unit.lane}</TableCell>
                          <TableCell>
                            <StatusBadge status={unit.statusName} />
                          </TableCell>
                          <TableCell>
                            <PlantBadge plant={unit.plant} />
                          </TableCell>
                          <TableCell>
                            {unit.defects && unit.defects.length > 0 ? (
                              <span className="text-sm text-gray-600">
                                {unit.defects.length} defecto(s)
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">Sin defectos</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(unit.createdAt).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Info Note */}
          {!canViewAllPlants && userPlant && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Solo puedes visualizar las unidades de tu planta asignada ({userPlant}). 
                Contacta a un administrador si necesitas acceso a información de otras plantas.
              </p>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
