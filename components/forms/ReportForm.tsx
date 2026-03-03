'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { BarcodeScanner } from '@/components/ui/BarcodeScanner';
import { useAuth } from '@/lib/auth';
import { API_BASE } from '@/lib/api';

type Grade = 'V1' | 'V2';

interface DamageOption {
  code: string;
  label: string;
}

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

const damageTypes: DamageOption[] = [
  { code: '01', label: 'Doblado | Superficie deformada o parte debido a un impacto' },
  { code: '02', label: 'Inoperable' },
  { code: '03', label: 'Corte | Borde ligeramente aserrado, no partido o resquebrajado' },
  { code: '04', label: 'Aboyadura | Pintura o cromado dañado' },
  { code: '05', label: 'Astillado o esconchado | No aplica a vidrios' },
  { code: '06', label: 'Quebrado | No aplica a vidrios (grieta por impacto, piezas unidas)' },
  { code: '07', label: 'Raspadura | Cavidad o malformación en metal o superficie plástica' },
  { code: '08', label: 'Perdido | Parte o accesorio no presente en inspección' },
  { code: '09', label: 'Raspadura | Marca que no rompe la superficie del material' },
  { code: '10', label: 'Manchado o embarrado | Interior del vehículo (tapicería)' },
  { code: '11', label: 'Perforación | Agujero causado por perforación' },
  { code: '12', label: 'Raspadura | No aplica a vidrios (marca lineal en pintura o cromado)' },
  { code: '13', label: 'Rasgadura | Similar a corte pero bordes rasgados' },
  { code: '14', label: 'Pintura o superficie cromada abollada pero no dañada' },
  { code: '15', label: 'Cobertura completa de protección del vehículo | Dañada' },
  { code: '16', label: 'Evento Térmico/Fuego | Evidencia de incendios o fuego visible' },
  { code: '18', label: 'Moldura/Emblema/Sellos dañados | Por impacto directo o adyacente' },
  { code: '19', label: 'Moldura/Emblema/Sellos sueltos | Por impacto directo o adyacente' },
  { code: '20', label: 'Vidrio agrietado | Por impacto, piezas permanecen unidas' },
  { code: '21', label: 'Vidrio roto | Quebrado por impacto al panel o molduras' },
  { code: '22', label: 'Vidrio astillado | Fragmento removido por impacto' },
  { code: '23', label: 'Vidrio rayado | Raya lineal en el cristal' },
  { code: '24', label: 'Luz de marcado dañada | Lente o montura dañados' },
  { code: '25', label: 'Etiquetas/franjas de pintura/calcomanías dañadas | Exterior' },
  { code: '29', label: 'Contaminación, Exterior | Polvo industrial, óxido, pintura, lluvia ácida' },
  { code: '30', label: 'Derrame de líquido, Exterior | Descoloración por fluido o substancia aerotransportada' },
  { code: '31', label: 'Robo y vandalismo | Remoción no autorizada o destrucción deliberada' },
  { code: '34', label: 'Astillado en el Borde del Panel | Alrededor del borde, ej. borde de puerta' },
  { code: '36', label: 'Parte incorrecta o accesorio no como facturado | No es daño de transportación' },
  { code: '37', label: 'Hardware | Dañado' },
  { code: '38', label: 'Hardware | Suelto o perdido' },
];

const zones: DamageOption[] = [
  { code: '01', label: 'Antena/Antena Base' },
  { code: '02', label: 'Batería' },
  { code: '03', label: 'Parachoques/Cubierta/Exterior | Delantero' },
  { code: '04', label: 'Parachoques/Cubierta/Exterior | Trasero' },
  { code: '05', label: 'Protector de Parachoques/Strip | Delantero' },
  { code: '06', label: 'Parachoques Protector/Strip | Trasero' },
  { code: '07', label: 'Puerta Trasera de Carga | Derecha' },
  { code: '08', label: 'Puerta Trasera de Carga | Izquierda' },
  { code: '09', label: 'Puerta Corrediza Izquierda/Derecha Trasera' },
  { code: '10', label: 'Puerta | Frente Izquierdo' },
  { code: '11', label: 'Puerta | Trasera Izquierda' },
  { code: '12', label: 'Puerta | Frente Derecho' },
  { code: '13', label: 'Puerta | Derecha Trasera' },
  { code: '14', label: 'Salpicadera | Delantero Izquierdo' },
  { code: '15', label: 'Qtr Panel/Pick Up Caja | Izquierda' },
  { code: '16', label: 'Salpicadera | Delantero Derecho' },
  { code: '17', label: 'Qtr Panel/Pick Up Caja | Derecha' },
  { code: '18', label: 'Alfombras de Piso | Delantero' },
  { code: '19', label: 'Alfombras de Piso | Traseras' },
  { code: '20', label: 'Parabrisa' },
  { code: '21', label: 'Vidrio | Trasero' },
  { code: '22', label: 'Rejilla' },
  { code: '23', label: 'Accesorios Sueltos Dentro del Vehículo/Bolsa/Caja' },
  { code: '24', label: 'Faro/Tapa/Señal de Giro' },
  { code: '25', label: 'Lámparas | Niebla/Conducción/Luz Puntual' },
  { code: '26', label: 'Forro o Cobertor Interior de Techo' },
  { code: '27', label: 'Capó' },
  { code: '28', label: 'Llaves' },
  { code: '29', label: 'Control Remoto Sin Llave' },
  { code: '30', label: 'Espejo | Exterior Izquierdo' },
  { code: '31', label: 'Espejo | Exterior Derecho' },
  { code: '32', label: 'Daño Mayor (Para uso del OEM)' },
  { code: '33', label: 'Reproductor Multimedia Frontal' },
  { code: '34', label: 'Reproductor Multimedia Trasero' },
  { code: '35', label: 'Rocker Panel/Solera Exterior | Izquierda' },
  { code: '36', label: 'Rocker Panel/Solera Exterior | Derecha' },
  { code: '37', label: 'Techo' },
  { code: '38', label: 'Carrera/Paso a la Izquierda' },
  { code: '39', label: 'Tablero de Correr/Paso | Derecho' },
  { code: '40', label: 'Neumático de Repuesto' },
  { code: '41', label: 'Cable para Cargar Vehículo/Auto Eléctrico' },
  { code: '42', label: 'Panel Splash/Spoiler | Delantero' },
  { code: '44', label: 'Tanque de Gasolina' },
  { code: '45', label: 'Luz de Cola/Hardware' },
  { code: '46', label: 'Cabina de Camión, Trasera' },
  { code: '48', label: 'Panel de Cubierta de Puerta | Delantero Izquierdo' },
  { code: '50', label: 'Panel de Cubierta de Puerta | Delantero Derecho' },
  { code: '51', label: 'Tonneau' },
  { code: '52', label: 'Tapa de la Cubierta/Portón Trasero/Hatchback' },
  { code: '53', label: 'Techo Corredizo/Techo de Vidrio' },
  { code: '54', label: 'Área Debajo del Vehículo' },
  { code: '55', label: 'Área de Carga | Otros' },
  { code: '56', label: 'Convertible Superior' },
  { code: '57', label: 'Tapas/Gorras de Ruedas' },
  { code: '58', label: 'Altavoces de Radio' },
  { code: '59', label: 'Limpiaparabrisas | Todos' },
  { code: '60', label: 'Chocks Saltado' },
  { code: '61', label: 'Caja de Recogida | Interior' },
  { code: '62', label: 'Todo el Vehículo' },
  { code: '63', label: 'Rieles/Cubierta de Cama del Camión/Barra de Luz' },
  { code: '64', label: 'Spoiler/Deflector | Trasero' },
  { code: '65', label: 'Portaequipajes (Tiras)/Riel de Goteo' },
  { code: '66', label: 'Dash/Panel de Instrumentos' },
  { code: '67', label: 'Encendedor de Cigarrillos/Bandeja de Ceniza' },
  { code: '68', label: 'Alfombra | Delantero' },
  { code: '69', label: 'Poste Central | Derecho' },
  { code: '70', label: 'Poste Central | Izquierda' },
  { code: '71', label: 'Poste de Esquina' },
  { code: '72', label: 'Neumático Delantero Izquierdo' },
  { code: '73', label: 'Rim/Rueda Delantera Izquierda' },
  { code: '74', label: 'Neumático Trasero Izquierdo' },
  { code: '75', label: 'Rim/Rueda Trasera Izquierda' },
  { code: '76', label: 'Neumático Trasero Derecho' },
  { code: '77', label: 'Rim/Rueda Trasera Derecha' },
  { code: '78', label: 'Neumático Delantero Derecho' },
  { code: '79', label: 'Rim/Rueda Delantera Derecha' },
  { code: '80', label: 'Cowl/Cubierta entre el Hood y Cristal Delantero' },
  { code: '81', label: 'Puerta/Tapa de Gasolina/Puerta de Carga de Batería' },
  { code: '82', label: 'Salpicadera | Trasera Izquierda' },
  { code: '83', label: 'Salpicadera | Trasera Derecha' },
  { code: '84', label: 'Herramientas/Jack/Equipo para Cambio de Llantas & Lock' },
  { code: '85', label: 'Kit de Tarjeta Multimedia' },
  { code: '86', label: 'Sensores/Sistema Sonar de Parqueo' },
  { code: '87', label: 'Abierto' },
  { code: '88', label: 'Abierto' },
  { code: '90', label: 'Marco' },
  { code: '91', label: 'Tubo de Escape' },
  { code: '92', label: 'Soporte de Placa de Matrícula del Vehículo' },
  { code: '93', label: 'Volante/Airbag' },
  { code: '94', label: 'Asiento | Delantero Izquierdo' },
  { code: '95', label: 'Asiento | Delantero Derecho' },
  { code: '96', label: 'Asiento | Trasero' },
  { code: '97', label: 'Alfombra | Trasero' },
  { code: '98', label: 'Interior' },
  { code: '99', label: 'Compartimiento del Motor-Otros' },
];
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
  const [newDefect, setNewDefect] = useState<Partial<Defect>>({ type: '09 - Raspadura – Marca que no rompe la superficie del material', zone: '10 - Puerta – Frente Izquierdo', grade: 'V2' });
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
      console.error('Error al cargar proveedores:', error);
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
      setNewDefect({ type: '09 - Raspadura – Marca que no rompe la superficie del material', zone: '10 - Puerta – Frente Izquierdo', grade: 'V2' });
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
        const errorData = await unitResponse.json();
        throw new Error(errorData.error || `Error al crear la unidad (${unitResponse.status})`);
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

    } catch (error: any) {
      alert(`Error al reportar la unidad: ${error.message}`);
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
