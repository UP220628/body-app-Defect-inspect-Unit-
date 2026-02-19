"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { ROLES } from '@/lib/permissions';

type Provider = { id: number; name: string; code?: string };
type User = { id: number; email: string; name: string; roleId: number; roleName?: string; providerId?: number | null; providerName?: string };

export default function ProfilePage() {
  const router = useRouter();
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL as string) || 'http://localhost:3001';
  const { token, user } = useAuth();
  const isAdmin = user?.roleId === ROLES.ADMIN;
  const [providers, setProviders] = useState<Provider[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uName, setUName] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRole, setURole] = useState('BODY');
  const [uProviderId, setUProviderId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
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
    const res = await fetch(`${API_BASE}/users`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(body) });
    if (res.ok) {
      const json = await res.json();
      setUsers(prev => [json.data, ...prev]);
      setUEmail(''); setUName(''); setUPassword(''); setURole('BODY'); setUProviderId(null);
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || 'Error creating user');
    }
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setUEmail(user.email);
    setUName(user.name);
    setURole(user.roleName || 'BODY');
    setUProviderId(user.providerId ?? null);
  };

  const saveEdit = async (id: number) => {
    const body: any = { email: uEmail, name: uName, roleId: uRole };
    if (uPassword) body.password = uPassword;
    body.providerId = uRole === 'CARRIER' ? uProviderId : null;
    const res = await fetch(`${API_BASE}/users/${id}`, { method: 'PUT', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(body) });
    if (res.ok) {
      const j = await res.json();
      setUsers(u => u.map(x => x.id === id ? j.data : x));
      setEditingId(null); setUPassword('');
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || 'Error updating user');
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Delete user?')) return;
    const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) setUsers(u => u.filter(x => x.id !== id));
    else { const j = await res.json().catch(() => ({})); alert(j.error || 'Error deleting'); }
  };

  const deleteProvider = async (id: number) => {
    if (!confirm('Delete provider?')) return;
    const res = await fetch(`${API_BASE}/providers/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) setProviders(p => p.filter(x => x.id !== id));
    else { const j = await res.json().catch(() => ({})); alert(j.error || 'Error deleting'); }
  };

  const changePassword = async () => {
    setPasswordMessage(null);
    setPasswordError(null);

    if (!token) {
      setPasswordError('Sesión inválida. Inicia sesión de nuevo.');
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Completa todos los campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('La nueva contraseña y la confirmación no coinciden');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordError(data.error || 'No se pudo actualizar la contraseña');
        return;
      }

      setPasswordMessage('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError('No se pudo actualizar la contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    
    <ProtectedRoute>
      <Container maxWidth="md" sx={{ py: 8 }}>
      <Card elevation={1} sx={{ p: 3, borderRadius: 3, bgcolor: 'white' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>A</Avatar>
            <Typography variant="h5" component="h1" fontWeight={600}>Profile Settings</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => router.push('/home')} sx={{ borderRadius: 2 }}>
              Back
            </Button>
            <Button variant="contained" color="error" onClick={() => router.push('/')} sx={{ borderRadius: 2 }}>
              Log out
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ p: 2, mb: 3, bgcolor: '#f9fafb', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Cambiar contraseña</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Contraseña actual"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Nueva contraseña"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Confirmar nueva contraseña"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={changePassword}
                disabled={isChangingPassword}
                sx={{ borderRadius: 2 }}
              >
                {isChangingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
              </Button>
            </Grid>
          </Grid>
          {passwordError && (
            <Typography variant="body2" sx={{ mt: 2, color: 'error.main' }}>
              {passwordError}
            </Typography>
          )}
          {passwordMessage && (
            <Typography variant="body2" sx={{ mt: 2, color: 'success.main' }}>
              {passwordMessage}
            </Typography>
          )}
        </Box>

        {isAdmin && (
          <>
            <Box sx={{ p: 2, mb: 3, bgcolor: '#f9fafb', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Manage Providers</Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 5 }}>
                  <TextField 
                    fullWidth 
                    size="small"
                    label="Provider name" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField 
                    fullWidth 
                    size="small"
                    label="Code" 
                    value={code} 
                    onChange={e => setCode(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    onClick={createProvider}
                    sx={{ borderRadius: 2 }}
                  >
                    Add Provider
                  </Button>
                </Grid>
              </Grid>
              
              {providers.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Active Providers: {providers.length}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {providers.map(p => (
                      <Chip
                        key={p.id}
                        label={`${p.name} ${p.code ? `(${p.code})` : ''}`}
                        size="small"
                        onDelete={() => deleteProvider(p.id)}
                        sx={{ bgcolor: '#e0e7ff', color: '#4338ca' }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>

            <Box sx={{ p: 2, mb: 3, bgcolor: '#f9fafb', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Create User</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField 
                    fullWidth 
                    size="small"
                    label="Email" 
                    type="email"
                    value={uEmail} 
                    onChange={e => setUEmail(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField 
                    fullWidth 
                    size="small"
                    label="Full name" 
                    value={uName} 
                    onChange={e => setUName(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField 
                    fullWidth 
                    size="small"
                    label="Password" 
                    type="password"
                    value={uPassword} 
                    onChange={e => setUPassword(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField 
                    select 
                    fullWidth 
                    size="small"
                    label="Role" 
                    value={uRole} 
                    onChange={e => setURole(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  >
                    <MenuItem value="WWS">WWS</MenuItem>
                    <MenuItem value="SCM">SCM</MenuItem>
                    <MenuItem value="BODY">BODY</MenuItem>
                    <MenuItem value="CARRIER">CARRIER</MenuItem>
                  </TextField>
                </Grid>
                
                {uRole === 'CARRIER' && (
                  <Grid size={12}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Provider"
                      value={uProviderId ?? ''}
                      onChange={e => setUProviderId(e.target.value ? Number(e.target.value) : null)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      <MenuItem value="">Select provider</MenuItem>
                      {providers.map(p => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name} {p.code && `(${p.code})`}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}
                
                <Grid size={12}>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    color="success"
                    onClick={createUser}
                    sx={{ borderRadius: 2 }}
                  >
                    Create User
                  </Button>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Users</Typography>
              <Stack spacing={1}>
                {users.map(u => (
                  <Box 
                    key={u.id} 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'white', 
                      borderRadius: 2,
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    {editingId === u.id ? (
                      <Grid container spacing={1}>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField 
                            fullWidth 
                            size="small"
                            label="Email"
                            value={uEmail} 
                            onChange={e => setUEmail(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField 
                            fullWidth 
                            size="small"
                            label="Name"
                            value={uName} 
                            onChange={e => setUName(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField 
                            fullWidth 
                            size="small"
                            label="New password"
                            type="password"
                            value={uPassword} 
                            onChange={e => setUPassword(e.target.value)}
                            placeholder="Optional"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        </Grid>
                        <Grid size={12}>
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button 
                              variant="contained" 
                              size="small"
                              onClick={() => saveEdit(u.id)}
                              sx={{ borderRadius: 2 }}
                            >
                              Save
                            </Button>
                            <Button 
                              variant="outlined" 
                              size="small"
                              onClick={() => { setEditingId(null); setUPassword(''); }}
                              sx={{ borderRadius: 2 }}
                            >
                              Cancel
                            </Button>
                          </Stack>
                        </Grid>
                      </Grid>
                    ) : (
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                            {u.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight={600}>
                              {u.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {u.email}
                            </Typography>
                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                              <Chip 
                                label={u.roleName} 
                                size="small"
                                sx={{ fontSize: '0.75rem', height: 20 }}
                              />
                              {u.providerName && (
                                <Chip 
                                  label={u.providerName} 
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.75rem', height: 20 }}
                                />
                              )}
                            </Stack>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <Button 
                            variant="outlined" 
                            size="small"
                            onClick={() => startEdit(u)}
                            sx={{ borderRadius: 2 }}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="contained" 
                            color="error"
                            size="small"
                            onClick={() => deleteUser(u.id)}
                            sx={{ borderRadius: 2 }}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </Stack>
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          </>
        )}
      </Card>
    </Container>
    </ProtectedRoute>
  );
}
