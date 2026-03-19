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

  // Limpiar intervalo de refresh
  const clearRefreshInterval = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  // Auto-refresh del token
  const setupAutoRefresh = (refreshToken: string) => {
    clearRefreshInterval();
    
    refreshIntervalRef.current = setInterval(() => {
      refreshAccessToken(refreshToken);
    }, TOKEN_REFRESH_INTERVAL);
  };

  const refreshAccessToken = async (refreshToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Si falla el refresh, logout del usuario
        logout();
        return;
      }

      const data = await response.json();
      
      if (data.ok && data.data) {
        const newAccessToken = data.data.token;
        const newRefreshToken = data.data.refreshToken;
        
        setToken(newAccessToken);
        localStorage.setItem('authToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        document.cookie = `authToken=${newAccessToken}; path=/; max-age=${15 * 60}; SameSite=Strict`;
        
        // Configurar siguiente refresh con el nuevo refresh token
        setupAutoRefresh(newRefreshToken);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error refrescando token');
      }
      logout();
    }
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
          // Obtener informaciÃ³n completa del usuario
          await fetchUserData(token);
          // Configurar auto-refresh
          setupAutoRefresh(refreshToken);
        } else {
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
        }
      } else {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
      }
    } catch (error) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
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
      setToken(accessToken);
      
      // Guardar tokens en localStorage
      localStorage.setItem('authToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Guardar token en cookies para el middleware (solo access token, ÐºÐ¾Ñ€Ð¾Ñ‚ÐºÐ¸Ð¹)
      document.cookie = `authToken=${accessToken}; path=/; max-age=${15 * 60}; SameSite=Strict`;
      
      // Configurar auto-refresh
      setupAutoRefresh(refreshToken);
      
      router.push('/home');
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    clearRefreshInterval();
    
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
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    document.cookie = 'authToken=; path=/; max-age=0; SameSite=Strict';
    
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
