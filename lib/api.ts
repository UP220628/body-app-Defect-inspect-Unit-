/**
 * Centralized API configuration.
 * Import API_BASE from this file instead of declaring it in every component.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001';
