'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { BarcodeScanner } from '@/components/ui/BarcodeScanner';
import { useAuth } from '@/lib/auth';
import { API_BASE } from '@/lib/api';
import { damageTypes, zones, DEFAULT_DEFECT_TYPE, DEFAULT_ZONE } from '@/lib/defectCatalog';

type Grade = 'V1' | 'V2';

interface Defect {
  id: number;
  type: string;
  zone: string;
  grade: Grade;
}

interface Provider {
  id: number;
  name: string;
  code?: string;
}

interface ReportFormProps {
  includeProvider?: boolean;
}

const grades: Grade[] = ['V1', 'V2'];

const mercados = ['Domestico', 'Exportacion', 'Traslado'];

const gradeColors: Record<Grade, string> = {
  V1: 'bg-red-100 text-red-800',
  V2: 'bg-yellow-100 text-yellow-800',
};

export const ReportForm = ({ includeProvider = false }: ReportFormProps) => {
  const { user } = useAuth();
  const [vin, setVin] = useState('');
  const [mercado, setMercado] = useState('');
  const [carril, setCarril] = useState('');
  const [carrilError, setCarrilError] = useState('');
  const [providerId, setProviderId] = useState<number | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(includeProvider);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [newDefect, setNewDefect] = useState<Partial<Defect>>({ type: DEFAULT_DEFECT_TYPE, zone: DEFAULT_ZONE, grade: 'V2' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Cargar proveedores si es necesario
  useEffect(() => {
    if (includeProvider) {
      fetchProviders();
    }
  }, [includeProvider]);

  const fetchProviders = async () => {
    try {
      const response = await fetch(`${API_BASE}/providers`);
      const data = await response.json();
      if (data.ok) {
        setProviders(data.data);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error al cargar proveedores');
      }
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const handleCarrilChange = (value: string) => {
    setCarril(value);
    
    // Validar si es un carril válido
    if (value) {
      const match = value.match(/Carril (\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        if (num < 1 || num > 100) {
          setCarrilError('El carril debe estar entre 1 y 100');
        } else {
          setCarrilError('');
        }
      } else {
        setCarrilError('Formato inválido. Use "Carril [número]"');
      }
    } else {
      setCarrilError('');
    }
  };

  const handleAddDefect = () => {
    if (newDefect.type && newDefect.zone && newDefect.grade) {
      setDefects([...defects, { id: Date.now(), ...newDefect } as Defect]);
      setNewDefect({ type: DEFAULT_DEFECT_TYPE, zone: DEFAULT_ZONE, grade: 'V2' });
      setIsDefectModalOpen(false);
    }
  };

  const handleRemoveDefect = (id: number) => {
    setDefects(defects.filter(d => d.id !== id));
  };

  const handleScanComplete = (code: string) => {
    setVin(code);
    setIsScannerOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vin || !mercado || !carril) {
      alert('Por favor completa todos los campos de la unidad');
      return;
    }

    if (vin.length !== 17) {
      alert('El VIN debe tener exactamente 17 caracteres');
      return;
    }

    if (carrilError) {
      alert('Por favor corrige el error en el campo de carril');
      return;
    }

    if (includeProvider && !providerId) {
      alert('Por favor selecciona un proveedor');
      return;
    }

    if (defects.length === 0) {
      alert('Por favor agrega al menos un defecto');
      return;
    }

    if (!user) {
      alert('Error: Usuario no autenticado');
      return;
    }

    setIsSubmitting(true);

    try {
      // Obtener token de autenticación
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Crear la unidad
      const unitPayload: any = {
        vin,
        market: mercado,
        lane: carril,
        registeredById: user.id,
      };

      // Agregar proveedor si es necesario (para WWS)
      if (includeProvider && providerId) {
        unitPayload.providerId = providerId;
      }
      
      const unitResponse = await fetch(`${API_BASE}/units`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(unitPayload),
      });

      if (!unitResponse.ok) {
        throw new Error(`Error al crear la unidad (${unitResponse.status})`);
      }
      
      const unitData = await unitResponse.json();
      const unitId = unitData.data.id;

      // Paso 2: Agregar cada defecto a la unidad
      for (const defect of defects) {
        const defectResponse = await fetch(`${API_BASE}/units/${unitId}/defects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            defectType: defect.type,
            zone: defect.zone,
            grade: defect.grade,
            registeredById: user.id,
            description: `${defect.type} en ${defect.zone}`,
          }),
        });

        if (!defectResponse.ok) {
          // Error al agregar defecto
        }
      }

      // Éxito: Limpiar formulario
      alert(`Unidad reportada exitosamente`);
      setVin('');
      setMercado('');
      setCarril('');
      setCarrilError('');
      setProviderId(null);
      setDefects([]);

      // Disparar evento para actualizar listas en otras páginas
      window.dispatchEvent(new CustomEvent('unitStatusChanged'));

    } catch {
      alert('Error al reportar la unidad. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full max-w-4xl space-y-8">
        <div>
          <h2 className="text-3xl font-bold mb-2 text-gray-900">
            {includeProvider ? 'Reportar Unidad - WWS' : 'Reportar Unidad con Daño'}
          </h2>
          <p className="text-gray-600 text-sm">
            {includeProvider ? 'WWS - Asigna el proveedor de reparación y los daños detectados' : 'WWS - Asigna los daños detectados a la unidad'}
          </p>
        </div>

        {/* Sección de datos de unidad */}
        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Datos de la Unidad</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-lg font-normal mb-2 text-gray-800">VIN</label>
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                placeholder="Ej: JN1AB7C33L0123456"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition font-mono text-sm"
                required
                maxLength={17}
              />
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="w-full mt-2 px-2 py-1.5 md:px-3 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition flex items-center justify-center gap-1.5 md:gap-2 shadow-sm hover:shadow-md group"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span className="text-xs md:text-sm font-medium">Escanear VIN</span>
              </button>
              {vin.length > 0 && vin.length !== 17 && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  VIN debe tener 17 caracteres ({vin.length}/17)
                </p>
              )}
            </div>
            <div>
              <label className="block text-lg font-normal mb-2 text-gray-800">Mercado</label>
              <select
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                value={mercado}
                onChange={(e) => setMercado(e.target.value)}
                required
              >
                <option value="">Selecciona...</option>
                {mercados.map(market => (
                  <option key={market} value={market}>{market}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-lg font-normal mb-2 text-gray-800">Carril</label>
              <input
                list="lanes"
                className={`w-full px-4 py-2 border-2 rounded-md focus:outline-none transition ${
                  carrilError 
                    ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                }`}
                value={carril}
                onChange={(e) => handleCarrilChange(e.target.value)}
                placeholder="Escribe o selecciona un carril (1-100)"
                required
              />
              <datalist id="lanes">
                {Array.from({ length: 100 }, (_, i) => {
                  const lane = `Carril ${i + 1}`;
                  return <option key={lane} value={lane} />;
                })}
              </datalist>
              {carrilError && (
                <p className="text-red-600 text-sm mt-1">{carrilError}</p>
              )}
            </div>
            {includeProvider && (
              <div>
                <label className="block text-lg font-normal mb-2 text-gray-800">Proveedor</label>
                <select
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  value={providerId || ''}
                  onChange={(e) => setProviderId(e.target.value ? Number(e.target.value) : null)}
                  required={includeProvider}
                  disabled={isLoadingProviders}
                >
                  <option value="">{isLoadingProviders ? 'Cargando...' : 'Selecciona...'}</option>
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} {provider.code ? `(${provider.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Sección de defectos */}
        <div className="bg-gray-50 p-3 sm:p-4 md:p-6 rounded-lg space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Defectos Detectados</h3>
              <p className="text-gray-600 text-xs sm:text-sm">Total: <span className="font-semibold text-gray-900">{defects.length}</span></p>
            </div>
            <Button
              type="button"
              onClick={() => setIsDefectModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all flex items-center gap-1 sm:gap-2 text-xs sm:text-sm md:text-base px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Agregar</span>
            </Button>
          </div>

          {/* Lista de defectos */}
          {defects.length > 0 ? (
            <div className="space-y-3">
              {defects.map((defect) => (
                <div key={defect.id} className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="font-mono text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-semibold">
                          {defect.type.split(' - ')[0]}
                        </span>
                        <p className="font-semibold text-gray-900 text-sm">{defect.type.split(' - ').slice(1).join(' - ')}</p>
                      </span>
                      <Badge variant={defect.grade === 'V1' ? 'danger' : 'warning'}>
                        {defect.grade}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      <span className="font-mono font-semibold">{defect.zone.split(' - ')[0]}</span>
                      {' – '}{defect.zone.split(' - ').slice(1).join(' - ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDefect(defect.id)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition font-medium flex items-center gap-2 group"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white border-2 border-dashed border-gray-300 rounded-lg">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <p className="text-gray-500 font-medium mb-2">No hay defectos agregados</p>
              <p className="text-gray-400 text-sm">Haz clic en "Agregar Defecto" para comenzar</p>
            </div>
          )}
        </div>

        {/* Botón de envío */}
        <div className="flex justify-center gap-4">
          <Button
            type="submit"
            disabled={defects.length === 0 || isSubmitting || (vin.length > 0 && vin.length !== 17)}
            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 md:px-8 md:py-3 text-base md:text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2 md:gap-3">
                <svg className="animate-spin h-4 w-4 md:h-5 md:w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 md:gap-2">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">Reportar Unidad ({defects.length} defecto{defects.length !== 1 ? 's' : ''})</span>
                <span className="sm:hidden">Reportar ({defects.length})</span>
              </span>
            )}
          </Button>
        </div>
      </form>

      {/* Modal para agregar defecto */}
      <Modal
        isOpen={isDefectModalOpen}
        onClose={() => setIsDefectModalOpen(false)}
        title="Agregar Defecto"
        size="md"
        footer={
          <div className="flex gap-2">
            <Button onClick={() => setIsDefectModalOpen(false)} variant="secondary">
              Cancelar
            </Button>
            <Button
              onClick={handleAddDefect}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Agregar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Tipo de Daño <span className="text-gray-400 font-normal">(AIAG)</span></label>
            <select
              value={newDefect.type || ''}
              onChange={(e) => setNewDefect({ ...newDefect, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Selecciona...</option>
              {damageTypes.map(dt => (
                <option key={dt.code} value={`${dt.code} - ${dt.label}`}>
                  {dt.code} – {dt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Zona del Daño <span className="text-gray-400 font-normal">(AIAG)</span></label>
            <select
              value={newDefect.zone || ''}
              onChange={(e) => setNewDefect({ ...newDefect, zone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Selecciona...</option>
              {zones.map(z => (
                <option key={z.code} value={`${z.code} - ${z.label}`}>
                  {z.code} – {z.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Severidad del Defecto</label>
            <div className="grid grid-cols-2 gap-2">
              {grades.map(grade => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setNewDefect({ ...newDefect, grade })}
                  className={`py-3 rounded-lg font-semibold transition ${
                    newDefect.grade === grade
                      ? `${gradeColors[grade]} border-2 border-current`
                      : `bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent`
                  }`}
                >
                  <div className="font-bold text-lg">{grade}</div>
                  <div className="text-xs">
                    {grade === 'V1' ? 'Grave' : 'Moderado'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-900">
            <p className="font-semibold mb-1">Guía de Severidad:</p>
            <ul className="space-y-1 text-xs">
              <li><strong>V1 (Grave):</strong> Reparación extensa, reemplazo de panel</li>
              <li><strong>V2 (Moderado):</strong> Reparación media, pintura/desabollado</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Modal para escáner de código de barras */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanComplete}
        title="Escanear VIN"
      />
    </>
  );
};
