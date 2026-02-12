import React from 'react';
import { Badge } from '@/components/ui/Badge';

export type DefectGrade = 'V1' | 'V2' | 'V3';

const gradeToVariant: Record<DefectGrade, 'danger' | 'warning' | 'info'> = {
  V1: 'danger',
  V2: 'warning',
  V3: 'info',
};

interface GradeBadgeProps {
  grade: DefectGrade;
  resolved?: boolean;
  className?: string;
  children?: React.ReactNode; // optional custom label
}

export const GradeBadge: React.FC<GradeBadgeProps> = ({ grade, resolved, className = '', children }) => {
  return (
    <Badge
      variant={gradeToVariant[grade]}
      className={`${resolved ? 'opacity-50 line-through' : ''} ${className}`}
    >
      {children ?? grade}
    </Badge>
  );
};
