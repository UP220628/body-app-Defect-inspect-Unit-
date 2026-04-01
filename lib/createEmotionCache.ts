import createCache, { type EmotionCache } from '@emotion/cache';

type WindowWithEmotionCache = Window & {
  __MUI_EMOTION_CACHE__?: EmotionCache;
};

export default function createEmotionCache() {
  // On the client reuse a global cache to keep the same instance
  // between different client components and to use the insertion point.
  if (typeof window !== 'undefined') {
    const w = window as WindowWithEmotionCache;
    if (!w.__MUI_EMOTION_CACHE__) {
      const el = document.querySelector('meta[name="emotion-insertion-point"]');
      const insertionPoint = el instanceof HTMLElement ? el : undefined;
      w.__MUI_EMOTION_CACHE__ = createCache({
        key: 'mui',
        prepend: true,
        insertionPoint,
      });
    }
    return w.__MUI_EMOTION_CACHE__;
  }

  // On the server, create a new cache per call (per request).
  // Do NOT reuse a global cache on the server to avoid style leakage between requests.
  return createCache({ key: 'mui', prepend: true });
}
