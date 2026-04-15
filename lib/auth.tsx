'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Plant } from '@/types';
import { API_BASE } from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  roleId: number;
  providerId?: number;
  plant?: Plant;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutos (antes de que expire el token de 15 min)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar intervalo de refresh
  const clearRefreshInterval = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  const clearRefreshRetry = () => {
    if (refreshRetryTimeoutRef.current) {
      clearTimeout(refreshRetryTimeoutRef.current);
      refreshRetryTimeoutRef.current = null;
    }
  };

  const clearStoredAuth = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    document.cookie = 'authToken=; path=/; max-age=0; SameSite=Strict';
  };

  const persistTokens = (accessToken: string, refreshToken: string) => {
    setToken(accessToken);
    localStorage.setItem('authToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    document.cookie = `authToken=${accessToken}; path=/; max-age=${15 * 60}; SameSite=Strict`;
  };

  type RefreshResult = {
    ok: boolean;
    shouldLogout: boolean;
    accessToken?: string;
    refreshToken?: string;
  };

  // Auto-refresh del token
  const setupAutoRefresh = (refreshToken: string) => {
    clearRefreshInterval();
    clearRefreshRetry();
    
    refreshIntervalRef.current = setInterval(async () => {
      const result = await refreshAccessToken(refreshToken);
      if (!result.ok && result.shouldLogout) {
        logout();
      }
    }, TOKEN_REFRESH_INTERVAL);
  };

  const refreshAccessToken = async (refreshToken: string): Promise<RefreshResult> => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return {
          ok: false,
          shouldLogout: response.status === 401 || response.status === 403,
        };
      }

      const data = await response.json();
      
      if (data.ok && data.data) {
        const newAccessToken = data.data.token;
        const newRefreshToken = data.data.refreshToken;
        
        persistTokens(newAccessToken, newRefreshToken);
        
        // Configurar siguiente refresh con el nuevo refresh token
        setupAutoRefresh(newRefreshToken);

        return {
          ok: true,
          shouldLogout: false,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        };
      }

      return { ok: false, shouldLogout: true };
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error refrescando token');
      }
      return { ok: false, shouldLogout: false };
    }
  };

  const scheduleRefreshRetry = (refreshToken: string) => {
    if (refreshRetryTimeoutRef.current) {
      return;
    }

    refreshRetryTimeoutRef.current = setTimeout(async () => {
      refreshRetryTimeoutRef.current = null;
      const result = await refreshAccessToken(refreshToken);
      if (!result.ok && result.shouldLogout) {
        logout();
      } else if (!result.ok) {
        scheduleRefreshRetry(refreshToken);
      }
    }, 60 * 1000);
  };

  // Verificar si hay un token guardado al cargar la aplicaciÃ³n
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    
    if (storedToken && storedRefreshToken) {
      verifyToken(storedToken, storedRefreshToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      clearRefreshInterval();
      clearRefreshRetry();
    };
  }, []);

  const verifyToken = async (token: string, refreshToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.valid) {
          setToken(token);
          document.cookie = `authToken=${token}; path=/; max-age=${15 * 60}; SameSite=Strict`;
          // Obtener informaciÃ³n completa del usuario
          await fetchUserData(token);
          // Configurar auto-refresh
          setupAutoRefresh(refreshToken);
        } else {
          const refreshed = await refreshAccessToken(refreshToken);
          if (refreshed.ok && refreshed.accessToken) {
            await fetchUserData(refreshed.accessToken);
            return;
          }
          clearStoredAuth();
        }
      } else {
        if (response.status === 401 || response.status === 403) {
          const refreshed = await refreshAccessToken(refreshToken);
          if (refreshed.ok && refreshed.accessToken) {
            await fetchUserData(refreshed.accessToken);
            return;
          }
          clearStoredAuth();
        } else {
          scheduleRefreshRetry(refreshToken);
        }
      }
    } catch (error) {
      scheduleRefreshRetry(refreshToken);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserData = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setUser(data.data);
        }
      }
    } catch (error) {
      // Error al obtener datos del usuario
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('No se pudo iniciar sesión');
      }

      const result = await response.json();
      
      if (!result.ok || !result.data) {
        throw new Error('Respuesta invÃ¡lida del servidor');
      }

      const { user: userData, token: accessToken, refreshToken } = result.data;
      
      setUser(userData);
      persistTokens(accessToken, refreshToken);
      
      // Configurar auto-refresh
      setupAutoRefresh(refreshToken);
      
      router.push('/home');
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    clearRefreshInterval();
    clearRefreshRetry();
    
    // Notificar al servidor para revocar tokens
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        // Aunque falle, continuamos con el logout local
      }
    }
    
    setUser(null);
    setToken(null);
    clearStoredAuth();
    
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
