import { TowTruckLoader } from '@/components/ui/TowTruckLoader';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <TowTruckLoader label="Loading..." size="lg" className="w-full max-w-sm" />
    </div>
  );
}
