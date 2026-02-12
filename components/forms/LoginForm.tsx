'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';

export const LoginForm = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      // La redirección se maneja en el AuthProvider
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <Input
        label="Email:"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder=""
        required
        disabled={isLoading}
      />

      <Input
        label="Password:"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder=""
        required
        disabled={isLoading}
      />

      <div className="flex flex-col items-center space-y-2 pt-2">
        <Button type="submit" className="w-auto" disabled={isLoading}>
          {isLoading ? 'Iniciando sesión...' : 'Log in'}
        </Button>
      </div>
    </form>
  );
};
