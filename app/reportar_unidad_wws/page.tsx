import { Header } from '@/components/layout/Header';
import { ReportForm } from '@/components/forms/ReportForm';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

export const metadata = {
  title: 'Reportar Unidad - WWS - Nissan Body App',
};

export default function HomePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 grid place-items-center px-4 sm:px-6 py-4 sm:py-6">
          <div className="bg-stone-50 rounded-xl p-4 sm:p-8 md:p-12 shadow-sm w-full max-w-2xl">
            <ReportForm includeProvider={true} />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
