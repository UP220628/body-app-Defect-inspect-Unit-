import React from 'react';
import { Badge } from '@/components/ui/Badge';

export type UnitStatus = 'REPORTED' | 'SENT' | 'DELIVERED' | 'RECEIVED' | 'IN_REPAIR' | 'RELEASED' | 'WTY_PENDING' | 'WTY_RELEASED' | 'WWS_RELEASED' | 'ACCEPTED' | 'REJECTED' | 'UNAVAILABLE' | 'ARCHIVED' | string;

const statusToVariant: Record<string, 'default' | 'success' | 'danger' | 'warning' | 'info'> = {
  REPORTED: 'default',
  SENT: 'info',
  DELIVERED: 'warning',
  RECEIVED: 'warning',
  IN_REPAIR: 'info',
  RELEASED: 'success',
  WTY_PENDING: 'warning',
  WTY_RELEASED: 'success',
  WWS_RELEASED: 'success',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  UNAVAILABLE: 'danger',
  ARCHIVED: 'default',
};

const statusToLabel: Record<string, string> = {
  REPORTED: 'Reportada (Carrier/WWS)',
  SENT: 'Nivelación WWS',
  DELIVERED: 'Entregada a Body',
  RECEIVED: 'Recibida',
  IN_REPAIR: 'En Reparación',
  RELEASED: 'Liberada Body',
  WTY_PENDING: 'Validación WTY',
  WTY_RELEASED: 'Liberada WTY',
  WWS_RELEASED: 'Liberada WWS',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  UNAVAILABLE: 'No disponible',
  ARCHIVED: 'Archivada',
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
