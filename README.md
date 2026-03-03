# Nissan Body App — Frontend

Aplicación web diseñada para dar visibilidad en la parte de planchas para madrinas, enfocada en la detección y trazabilidad de defectos y reparaciones de unidades vehiculares.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS · MUI · Recharts

---

## Cómo correr

```bash
npm install
npm run dev       # desarrollo en http://localhost:3000
npm run build     # build de producción
npm start         # servidor de producción
```

La app espera que el backend esté corriendo en el puerto configurado en `lib/api.ts` (`API_BASE`).

---

## Estructura de carpetas

```
body-app/
├── app/                        # Rutas y páginas (Next.js App Router)
│   ├── layout.tsx              # Layout raíz: fuentes, providers globales
│   ├── page.tsx                # Redirect a /home o /login
│   ├── providers.tsx           # React context providers (auth, theme)
│   ├── emotion-registry.tsx    # Registro de Emotion para SSR con MUI
│   │
│   ├── home/                   # Panel principal (tracking del día)
│   ├── reportar_unidad/        # Carrier reporta una unidad nueva
│   ├── aceptar_unidades/       # Carrier acepta o rechaza unidades liberdas
│   ├── gestion_wws/            # WWS: nivelar, entregar a Body, liberar
│   ├── recibir_unidades/       # Body recibe unidades entregadas
│   ├── reparar_unidades/       # Body gestiona reparaciones e indisponibles
│   ├── prioridad_reparaciones/ # SCM ordena la cola de reparación
│   ├── validar_unidad/         # VQA valida unidades con solo defectos V2/V3
│   ├── dashboards/             # Gráficas y KPIs (Pareto, contadores, mensual)
│   ├── logs/                   # Historial completo de todas las unidades
│   ├── profile/                # Perfil del usuario autenticado
│   └── api/blob/               # Route handler para blobs (imágenes evidencia)
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # Barra de navegación principal con menú por rol
│   │   ├── NotificationBell.tsx # Campana de notificaciones en tiempo real (WebSocket)
│   │   └── ProtectedRoute.tsx  # HOC que redirige si no hay sesión activa
│   │
│   ├── forms/
│   │   ├── LoginForm.tsx       # Formulario de inicio de sesión
│   │   └── ReportForm.tsx      # Formulario para reportar una unidad (VIN, mercado, defectos)
│   │
│   ├── home/
│   │   ├── DailyTrackingWidget.tsx   # Tracking del día: disponibles, no disponibles, decisión SCM
│   │   └── RepairTimelineWidget.tsx  # Timeline de unidades en reparación con tiempos estimados
│   │
│   ├── dashboards/
│   │   ├── DefectCounters.tsx  # Contadores V1 / V2 / V3 del día o histórico
│   │   ├── ParetoChart.tsx     # Gráfica de Pareto de defectos (Recharts)
│   │   └── ResumenPanel.tsx    # Panel de resumen con estado de unidades
│   │
│   ├── units/
│   │   ├── StatusBadge.tsx     # Badge de color según estado de la unidad
│   │   └── GradeBadge.tsx      # Badge de color según grado de defecto (V1/V2/V3)
│   │
│   └── ui/                     # Componentes base reutilizables
│       ├── Badge.tsx           # Badge genérico con variantes de color
│       ├── Button.tsx          # Botón con variantes y tamaños
│       ├── Card.tsx            # Card con CardHeader / CardBody / CardFooter
│       ├── Dropdown.tsx        # Menú desplegable
│       ├── Input.tsx           # Input de texto controlado
│       ├── Modal.tsx           # Modal con backdrop, header, body y footer
│       ├── Table.tsx           # Tabla con filas/celdas semánticas
│       └── ...
│
├── lib/
│   ├── api.ts                  # Constante API_BASE (URL base del backend)
│   ├── auth.tsx                # Context de autenticación: login, logout, token JWT
│   ├── permissions.ts          # Constantes de roles (ROLES.WWS, .SCM, .BODY, etc.)
│   ├── useUnitEvents.tsx       # Hook SSE: escucha eventos de unidades en tiempo real
│   └── createEmotionCache.ts   # Configuración de Emotion para MUI en SSR
│
├── types/
│   └── index.ts                # Tipos TypeScript compartidos del frontend (Unit, User, etc.)
│
└── public/
    ├── images/                 # Logos e imágenes estáticas
    └── sounds/                 # Sonidos de notificación por tono (high/medium/low)
```

---

## Páginas y su función

| Página | Ruta | Rol principal | Descripción |
|--------|------|--------------|-------------|
| Panel Principal | `/home` | Todos | Tracking del día: unidades disponibles/no disponibles, decisiones SCM, timeline de reparaciones |
| Reportar Unidad | `/reportar_unidad` | Carrier / WWS | Registra un VIN nuevo con mercado, carril y defectos iniciales |
| Gestión WWS | `/gestion_wws` | WWS | Tabs: reportar, nivelar defectos (V1/V2/V3), entregar a Body, liberar WWS |
| Recibir Unidades | `/recibir_unidades` | Body | Confirma la recepción física de unidades entregadas por WWS |
| Reparar Unidades | `/reparar_unidades` | Body | Inicia/libera reparaciones, marca unidades no disponibles, reactiva |
| Prioridad | `/prioridad_reparaciones` | SCM | Drag & drop para ordenar la cola de reparación de Body |
| Validar Unidad | `/validar_unidad` | VQA | Aprueba o rechaza unidades con solo defectos V2/V3 enviadas por WWS |
| Aceptar Unidades | `/aceptar_unidades` | Carrier | Acepta o rechaza unidades liberadas por WWS |
| Dashboards | `/dashboards` | Todos | KPIs: Pareto de defectos, contadores V1/V2/V3, unidades por estado, mensual |
| Logs | `/logs` | Todos | Historial completo con timestamps por estado, filtros y exportación a Excel |
| Perfil | `/profile` | Todos | Datos del usuario autenticado |

---

## Flujo de estados de unidad

```
REPORTED → SENT → DELIVERED → RECEIVED → IN_REPAIR → RELEASED → WWS_RELEASED → ACCEPTED
                     ↓                                                ↑
                 VQA_PENDING ────────────────────────────────────────┘ (VQA aprueba)
                     ↓
                  SENT (VQA rechaza, regresa a Body)

RECEIVED → UNAVAILABLE  →  SCM toma decisión  →  ARCHIVED (soft delete)
IN_REPAIR → UNAVAILABLE

WWS_RELEASED → Carrier rechaza → REJECTED → SENT (re-entra al flujo)
```

---

## Autenticación

- JWT almacenado en `localStorage` via el context de `lib/auth.tsx`.
- `ProtectedRoute` redirige a `/` (login) si no hay token válido.
- Los permisos por rol se consultan con las constantes de `lib/permissions.ts`.

---

## Tiempo real

- **SSE (Server-Sent Events):** El hook `useUnitEvents` en `lib/useUnitEvents.tsx` escucha el endpoint `/events` del backend y dispara recargas automáticas cuando cambia el estado de cualquier unidad.
- **WebSocket:** `NotificationBell` mantiene una conexión WS con el backend para recibir notificaciones push sin polling.
 