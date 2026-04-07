'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-6">
          <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Error</p>
            <h1 className="mt-2 text-2xl font-bold">No pudimos completar la solicitud</h1>
            <p className="mt-3 text-sm text-slate-600">
              Ocurrio un error inesperado. Puedes reintentar o volver al inicio.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Reintentar
              </button>
              <Link
                href="/home"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Ir al inicio
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
