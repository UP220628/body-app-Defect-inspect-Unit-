/**
 * Centralized API configuration.
 * Import API_BASE from this file instead of declaring it in every component.
 */
const configuredApiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  '';

const fallbackApiBase = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '';

if (!configuredApiBase && process.env.NODE_ENV === 'production') {
  console.error('Missing NEXT_PUBLIC_API_BASE_URL/NEXT_PUBLIC_API_URL. API calls will use relative paths.');
}

const resolvedApiBase = configuredApiBase || fallbackApiBase;

export const API_BASE = resolvedApiBase.replace(/\/+$/, '');
