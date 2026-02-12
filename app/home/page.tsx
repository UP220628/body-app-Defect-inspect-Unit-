'use client';

import { Header } from '@/components/layout/Header';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { DailyTrackingWidget } from '@/components/home/DailyTrackingWidget';

export default function HomePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-red-50">
        <Header />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel Principal</h1>
            <p className="text-gray-600">Monitoreo de unidades del día y notificaciones</p>
          </div>

          <DailyTrackingWidget />
        </main>
      </div>
    </ProtectedRoute>
  );
}
