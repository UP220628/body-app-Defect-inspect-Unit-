import React from 'react';
import { Badge } from '@/components/ui/Badge';

export type UnitStatus = 'REPORTED' | 'SENT' | 'DELIVERED' | 'RECEIVED' | 'IN_REPAIR' | 'REPAIRED' | 'RELEASED' | 'WWS_RELEASED' | 'ACCEPTED' | 'UNAVAILABLE' | string;

const statusToVariant: Record<string, 'default' | 'success' | 'danger' | 'warning' | 'info'> = {
  REPORTED: 'default',
  SENT: 'info',
  DELIVERED: 'warning',
  RECEIVED: 'warning',
  IN_REPAIR: 'info',
  REPAIRED: 'success',
  RELEASED: 'success',
  WWS_RELEASED: 'success',
  ACCEPTED: 'success',
  UNAVAILABLE: 'danger',
};

const statusToLabel: Record<string, string> = {
  REPORTED: 'Reportada',
  SENT: 'Nivelación WWS',
  DELIVERED: 'Entregada a Body',
  RECEIVED: 'Recibida',
  IN_REPAIR: 'En Reparación',
  REPAIRED: 'Reparada',
  RELEASED: 'Liberada Body',
  WWS_RELEASED: 'Liberada WWS',
  ACCEPTED: 'Aceptada',
  UNAVAILABLE: 'No disponible',
};

interface StatusBadgeProps {
  status: UnitStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const variant = statusToVariant[status] ?? 'default';
  const label = statusToLabel[status] ?? status;
  return <Badge variant={variant} className={className}>{label}</Badge>;
};
