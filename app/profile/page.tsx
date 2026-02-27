"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { ROLES } from '@/lib/permissions';
import { API_BASE } from '@/lib/api';

type Provider = { id: number; name: string; code?: string };
type User = { id: number; email: string; name: string; roleId: number; roleName?: string; providerId?: number | null; providerName?: string; plant?: string | null };

const ROLE_OPTIONS = ['WWS', 'SCM', 'BODY', 'CARRIER', 'VQA', 'ADMIN'];
const PLANT_OPTIONS = ['A1', 'A2'] as const;

const RoleBadge = ({ role }: { role?: string }) => {
  const colors: Record<string, string> = {
    WWS: 'bg-blue-100 text-blue-700',
    SCM: 'bg-purple-100 text-purple-700',
    BODY: 'bg-orange-100 text-orange-700',
    CARRIER: 'bg-green-100 text-green-700',
    VQA: 'bg-pink-100 text-pink-700',
    ADMIN: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[role ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
      {role ?? '-'}
    </span>
  );
};

const PlantBadge = ({ plant }: { plant?: string | null }) => {
  if (!plant) return null;
  const colors = plant === 'A1' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors}`}>
      {plant}
    </span>
  );
};

export default function ProfilePage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const isAdmin = user?.roleId === ROLES.ADMIN;

  const [providers, setProviders] = useState<Provider[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Provider form
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  // User form
  const [uEmail, setUEmail] = useState('');
  const [uName, setUName] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRole, setURole] = useState('BODY');
  const [uProviderId, setUProviderId] = useState<number | null>(null);
  const [uPlant, setUPlant] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const authHeaders = (extra?: Record<string, string>) => ({
    'Authorization': token ? `Bearer ${token}` : '',
    'x-user-role': 'WWS',
    ...extra,
  });

  useEffect(() => {
    if (!isAdmin) return;
    fetch(`${API_BASE}/providers`, { headers: authHeaders() })
      .then(r => r.json())
      .then(j => { if (j.ok) setProviders(j.data || []); })
      .catch(() => {});
    fetch(`${API_BASE}/users`, { headers: authHeaders() })
      .then(r => r.json())
      .then(j => { if (j.ok) setUsers(j.data || []); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE, isAdmin, token]);

  const createProvider = async () => {
    if (!name.trim()) return;
    const res = await fetch(`${API_BASE}/providers`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ name, code }) });
    if (res.ok) {
      setName(''); setCode('');
      const json = await res.json();
      setProviders(prev => [...prev, json.data]);
    }
  };

  const createUser = async () => {
    const body: any = { email: uEmail, password: uPassword, name: uName, roleId: uRole };
    if (uRole === 'CARRIER') body.providerId = uProviderId;
    // ADMIN no necesita planta (ve ambas), otros roles sí
    if (uRole !== 'ADMIN' && uPlant) body.plant = uPlant;
    const res = await fetch(`${API_BASE}/users`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(body) });
    if (res.ok) {
      const json = await res.json();
      setUsers(prev => [json.data, ...prev]);
      setUEmail(''); setUName(''); setUPassword(''); setURole('BODY'); setUProviderId(null); setUPlant(null);
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || 'Error al crear usuario');
    }
  };

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setUEmail(u.email);
    setUName(u.name);
    setURole(u.roleName || 'BODY');
    setUProviderId(u.providerId ?? null);
    setUPlant(u.plant ?? null);
    setUPassword('');
  };

  const saveEdit = async (id: number) => {
    const body: any = { email: uEmail, name: uName, roleId: uRole };
    if (uPassword) body.password = uPassword;
    body.providerId = uRole === 'CARRIER' ? uProviderId : null;
    // ADMIN no necesita planta, otros roles sí
    body.plant = uRole === 'ADMIN' ? null : uPlant;
    const res = await fetch(`${API_BASE}/users/${id}`, { method: 'PUT', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(body) });
    if (res.ok) {
      const j = await res.json();
      setUsers(u => u.map(x => x.id === id ? j.data : x));
      setEditingId(null); setUPassword(''); setUPlant(null);
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || 'Error al actualizar usuario');
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) setUsers(u => u.filter(x => x.id !== id));
    else { const j = await res.json().catch(() => ({})); alert(j.error || 'Error al eliminar'); }
  };

  const deleteProvider = async (id: number) => {
    if (!confirm('¿Eliminar este proveedor?')) return;
    const res = await fetch(`${API_BASE}/providers/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) setProviders(p => p.filter(x => x.id !== id));
    else { const j = await res.json().catch(() => ({})); alert(j.error || 'Error al eliminar'); }
  };

  const changePassword = async () => {
    setPasswordMessage(null);
    setPasswordError(null);
    if (!token) { setPasswordError('Sesión inválida. Inicia sesión de nuevo.'); return; }
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordError('Completa todos los campos'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('La nueva contraseña y la confirmación no coinciden'); return; }
    setIsChangingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setPasswordError(data.error || 'No se pudo actualizar la contraseña'); return; }
      setPasswordMessage('Contraseña actualizada correctamente');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error) { setPasswordError('No se pudo actualizar la contraseña'); }
    finally { setIsChangingPassword(false); }
  };

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition';
  const selectCls = `${inputCls} appearance-none`;
  const btnPrimary = 'px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-50';
  const btnSecondary = 'px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium transition';
  const btnDanger = 'px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition';
  const btnEdit = 'px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium transition';

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pb-16">
        {/* Page header */}
        <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Configuración</h1>
              {user && <p className="text-sm text-gray-400">{user.name} · {user.email}</p>}
            </div>
            <button onClick={() => router.push('/home')} className={btnSecondary}>
              Volver
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 md:px-8 pt-6 space-y-6">

          {/* Cambiar contraseña */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Cambiar contraseña</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input className={inputCls} type="password" placeholder="Contraseña actual" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                <input className={inputCls} type="password" placeholder="Nueva contraseña" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <input className={inputCls} type="password" placeholder="Confirmar contraseña" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <button className={btnPrimary} onClick={changePassword} disabled={isChangingPassword}>
                  {isChangingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
                {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
                {passwordMessage && <p className="text-xs text-green-600">{passwordMessage}</p>}
              </div>
            </div>
          </section>

          {isAdmin && (
            <>
              {/* Proveedores */}
              <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Proveedores</h2>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input className={`${inputCls} flex-1`} placeholder="Nombre del proveedor" value={name} onChange={e => setName(e.target.value)} />
                    <input className={`${inputCls} w-full sm:w-28`} placeholder="Código" value={code} onChange={e => setCode(e.target.value)} />
                    <button className={`${btnPrimary} shrink-0`} onClick={createProvider}>Agregar</button>
                  </div>
                  {providers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {providers.map(p => (
                        <div key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-700">
                          <span>{p.name}{p.code ? ` (${p.code})` : ''}</span>
                          <button onClick={() => deleteProvider(p.id)} className="text-gray-300 hover:text-red-500 transition leading-none" title="Eliminar">
                            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Crear usuario */}
              <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Nuevo usuario</h2>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input className={inputCls} type="email" placeholder="Correo electrónico" value={uEmail} onChange={e => setUEmail(e.target.value)} />
                    <input className={inputCls} placeholder="Nombre completo" value={uName} onChange={e => setUName(e.target.value)} />
                    <input className={inputCls} type="password" placeholder="Contraseña" value={uPassword} onChange={e => setUPassword(e.target.value)} />
                    <select className={selectCls} value={uRole} onChange={e => setURole(e.target.value)}>
                      {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {uRole === 'CARRIER' && (
                      <select className={selectCls} value={uProviderId ?? ''} onChange={e => setUProviderId(e.target.value ? Number(e.target.value) : null)}>
                        <option value="">Seleccionar proveedor</option>
                        {providers.map(p => <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ''}</option>)}
                      </select>
                    )}
                    {/* Campo Planta - solo para roles que no sean ADMIN */}
                    {uRole !== 'ADMIN' && (
                      <select className={selectCls} value={uPlant ?? ''} onChange={e => setUPlant(e.target.value || null)}>
                        <option value="">Seleccionar planta</option>
                        {PLANT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    )}
                  </div>
                  <button className={btnPrimary} onClick={createUser}>Crear usuario</button>
                </div>
              </section>

              {/* Lista de usuarios */}
              <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Usuarios</h2>
                  <span className="text-xs text-gray-400">{users.length} registros</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {users.length === 0 && (
                    <p className="px-5 py-6 text-sm text-gray-400 text-center">Sin usuarios registrados</p>
                  )}
                  {users.map(u => (
                    <div key={u.id} className="px-5 py-3">
                      {editingId === u.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input className={inputCls} placeholder="Email" value={uEmail} onChange={e => setUEmail(e.target.value)} />
                            <input className={inputCls} placeholder="Nombre" value={uName} onChange={e => setUName(e.target.value)} />
                            <input className={inputCls} type="password" placeholder="Nueva contraseña (opcional)" value={uPassword} onChange={e => setUPassword(e.target.value)} />
                            <select className={selectCls} value={uRole} onChange={e => setURole(e.target.value)}>
                              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            {uRole === 'CARRIER' && (
                              <select className={selectCls} value={uProviderId ?? ''} onChange={e => setUProviderId(e.target.value ? Number(e.target.value) : null)}>
                                <option value="">Seleccionar proveedor</option>
                                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            )}
                            {uRole !== 'ADMIN' && (
                              <select className={selectCls} value={uPlant ?? ''} onChange={e => setUPlant(e.target.value || null)}>
                                <option value="">Sin planta</option>
                                {PLANT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            )}
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button className={btnPrimary} onClick={() => saveEdit(u.id)}>Guardar</button>
                            <button className={btnSecondary} onClick={() => { setEditingId(null); setUPassword(''); setUPlant(null); }}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-semibold shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                              <p className="text-xs text-gray-400 truncate">{u.email}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <RoleBadge role={u.roleName} />
                                <PlantBadge plant={u.plant} />
                                {u.providerName && (
                                  <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">{u.providerName}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button className={btnEdit} onClick={() => startEdit(u)}>Editar</button>
                            <button className={btnDanger} onClick={() => deleteUser(u.id)}>Eliminar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
