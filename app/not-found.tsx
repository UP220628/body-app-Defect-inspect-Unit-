import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl items-center justify-center">
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">404</p>
          <h1 className="mt-2 text-2xl font-bold">Pagina no encontrada</h1>
          <p className="mt-3 text-sm text-slate-600">
            La ruta que intentaste abrir no existe o ya fue movida.
          </p>
          <div className="mt-6">
            <Link
              href="/home"
              className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Regresar al panel
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
