'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useMemo, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { canAccessRoute, ROLE_NAMES } from '@/lib/permissions';
import { NotificationBell } from './NotificationBell';

// Definición de todas las rutas disponibles
const ALL_ROUTES = [
  { href: '/home', label: 'Home' },
  { href: '/catalogo_nissan', label: 'Catálogo Nissan' },
  { href: '/reportar_unidad', label: 'Reportar Unidad' },
  { href: '/gestion_wws', label: 'Gestión WWS' },
  { href: '/recibir_unidades', label: 'Recibir Unidades' },
  { href: '/reparar_unidades', label: 'Unidades a Reparar' },
  { href: '/prioridad_reparaciones', label: 'Prioridad Reparaciones' },
  { href: '/aceptar_unidades', label: 'Aceptar Unidades' },
  { href: '/validar_unidad', label: 'Validación VQA' },
  { href: '/dashboards', label: 'Dashboard' },
  { href: '/logs', label: 'Historial de Unidades' },
];

export const Header = () => {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { logout, user } = useAuth();

  // Detectar clicks fuera de los dropdowns para cerrarlos
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isActive = (href: string) => pathname === href;

  const handleLogout = () => {
    logout();
    setOpen(false);
    setMobileOpen(false);
  };

  // Filtrar rutas según el rol del usuario
  const availableRoutes = useMemo(() => {
    if (!user) return [];
    return ALL_ROUTES.filter(route => canAccessRoute(user.roleId, route.href));
  }, [user]);

  const userRole = user ? ROLE_NAMES[user.roleId] : '';

  return (
    <header className="sticky top-0 z-50 w-full bg-red-50/95 backdrop-blur-md shadow-sm">
      {/* Fila superior: logo + acciones */}
      <div className="w-full px-4 md:px-8 py-2 flex items-center justify-between">
        <Link href="/home" className="flex items-center shrink-0">
          <Image src="/images/Nissan_logo.png" alt="Nissan" width={80} height={80} className="object-contain" style={{ width: 'auto', height: 'auto' }} />
        </Link>

        {/* Acciones derecha */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <div className="mr-1">
            <NotificationBell />
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md hover:bg-red-100 transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => {
              setMobileOpen(!mobileOpen);
              setOpen(false);
            }}
          >
            {mobileOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>

          {/* Desktop profile button */}
          <div className="relative hidden md:block" ref={profileRef}>
            <button
              onClick={() => setOpen(!open)}
              className="w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
            >
              <span className="text-gray-600 text-sm">👤</span>
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10">
                {user && (
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{userRole}</p>
                    <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                )}
                {user && canAccessRoute(user.roleId, '/profile') && (
                  <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Configuración</Link>
                )}
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nav desktop - segunda fila */}
      <div className="hidden md:block border-t border-red-50/60">
        <nav className="px-4 md:px-8 flex items-center justify-center gap-1 overflow-x-auto scrollbar-none">
          {availableRoutes.map(route => (
            <Link
              key={route.href}
              href={route.href}
              className={`shrink-0 px-3 py-2 text-sm font-medium rounded-none border-b-2 transition-colors whitespace-nowrap ${
                isActive(route.href)
                  ? 'border-red-500 text-red-600 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-red-500 hover:border-red-300'
              }`}
            >
              {route.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="absolute right-4 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 md:hidden z-10" ref={mobileMenuRef}>
          {user && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{userRole}</p>
              <p className="text-sm font-semibold text-gray-800">{user.name}</p>
            </div>
          )}
          <div className="py-1">
            {availableRoutes.map(route => (
              <Link
                key={route.href}
                href={route.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 text-sm transition-colors ${
                  isActive(route.href)
                    ? 'font-semibold bg-red-50 text-red-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {route.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-1">
            {user && canAccessRoute(user.roleId, '/profile') && (
              <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Configuración</Link>
            )}
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">Cerrar sesión</button>
          </div>
        </div>
      )}
    </header>
  );
};
