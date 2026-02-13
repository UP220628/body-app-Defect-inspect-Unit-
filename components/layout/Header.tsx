'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { canAccessRoute, ROLE_NAMES } from '@/lib/permissions';
import { NotificationBell } from './NotificationBell';

// Definición de todas las rutas disponibles
const ALL_ROUTES = [
  { href: '/home', label: 'Home' },
  { href: '/reportar_unidad', label: 'Reportar Unidad' },
  { href: '/inspeccionar_unidades', label: 'Gestión WWS' },
  { href: '/recibir_unidades', label: 'Recibir Unidades' },
  { href: '/reparar_unidades', label: 'Unidades a Reparar' },
  { href: '/prioridad_reparaciones', label: 'Prioridad Reparaciones' },
  { href: '/aceptar_unidades', label: 'Aceptar Unidades' },
  { href: '/dashboards', label: 'Dashboards' },
  { href: '/logs', label: 'Historial de Unidades' },
];

export const Header = () => {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { logout, user } = useAuth();

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
    <header className="w-full px-4 md:px-8 py-4 flex items-center bg-red-50 relative">
      <Link href="/home" className="flex items-center">
        <Image src="/images/Nissan_logo.png" alt="Nissan" width={60} height={60} className="object-contain" style={{ width: 'auto', height: 'auto' }} />
      </Link>

      <nav className="hidden md:flex items-center gap-8 ml-auto mr-6">
        {availableRoutes.map(route => (
          <Link 
            key={route.href}
            href={route.href} 
            className={`text-sm border-b-2 ${isActive(route.href) ? 'font-bold border-blue-400' : 'border-transparent hover:border-blue-400'}`}
          >
            {route.label}
          </Link>
        ))}
      </nav>

      {/* Notification Bell - visible en desktop y mobile */}
      <div className="mr-2 md:mr-4">
        <NotificationBell />
      </div>

      {/* Mobile menu button */}
      <button
        className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
        onClick={() => {
          setMobileOpen(!mobileOpen);
          if (open) setOpen(false);
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
      <div className="relative hidden md:block">
        <button onClick={() => setOpen(!open)} className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-600">👤</span>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 z-10">
            {user && (
              <div className="px-4 py-2 border-b border-gray-200">
                <p className="text-xs text-gray-500">Rol: {userRole}</p>
                <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}
            {user && canAccessRoute(user.roleId, '/profile') && (
              <Link href="/profile" className="block px-4 py-2 hover:bg-gray-100">Settings</Link>
            )}
            <button onClick={handleLogout} className="w-full text-left block px-4 py-2 hover:bg-gray-100 text-red-600">Log out</button>
          </div>
        )}
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="absolute right-4 top-full mt-2 w-64 bg-white rounded-md shadow-lg py-2 md:hidden z-10">
          {availableRoutes.map(route => (
            <Link 
              key={route.href}
              href={route.href} 
              onClick={() => setMobileOpen(false)} 
              className={`block px-4 py-2 ${isActive(route.href) ? 'font-semibold bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
            >
              {route.label}
            </Link>
          ))}
          <div className="my-2 border-t" />
          {user && (
            <div className="px-4 py-2 border-b border-gray-200">
              <p className="text-xs text-gray-500">Rol: {userRole}</p>
              <p className="text-sm font-semibold text-gray-800">{user.name}</p>
            </div>
          )}
          {user && canAccessRoute(user.roleId, '/profile') && (
            <Link href="/profile" onClick={() => setMobileOpen(false)} className="block px-4 py-2 hover:bg-gray-100">Profile Settings</Link>
          )}
          <button onClick={handleLogout} className="w-full text-left block px-4 py-2 hover:bg-gray-100 text-red-600">Log out</button>
        </div>
      )}
    </header>
  );
};
