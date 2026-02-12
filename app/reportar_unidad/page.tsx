import { Header } from '@/components/layout/Header';
import { ReportForm } from '@/components/forms/ReportForm';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

export const metadata = {
  title: 'Reportar Unidad- Nissan Body App',
};

export default function HomePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-red-50">
        <Header />

        <main className="flex-1 grid place-items-center px-6">
          <div className="bg-stone-50 rounded-xl p-12 shadow-sm w-full max-w-2xl">
            <ReportForm />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
