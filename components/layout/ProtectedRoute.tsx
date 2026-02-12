'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { canAccessRoute } from '@/lib/permissions';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/') {
      router.push('/');
      return;
    }

    // Verificar permisos de acceso por rol
    if (!isLoading && isAuthenticated && user && pathname !== '/') {
      const hasAccess = canAccessRoute(user.roleId, pathname);
      if (!hasAccess) {
        // Redirigir a home si no tiene acceso
        router.push('/home');
      }
    }
  }, [isAuthenticated, isLoading, user, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/') {
    return null;
  }

  // Verificar permisos antes de mostrar contenido
  if (isAuthenticated && user && pathname !== '/') {
    const hasAccess = canAccessRoute(user.roleId, pathname);
    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-600">No tienes acceso a esta página</p>
            <button 
              onClick={() => router.push('/home')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Ir a Home
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
