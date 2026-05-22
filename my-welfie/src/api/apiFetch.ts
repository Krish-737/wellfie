import { API_BASE } from './config';

/**
 * Thin wrapper around `fetch()` that:
 *  1. Prepends API_BASE to relative paths.
 *  2. Adds `ngrok-skip-browser-warning` header so ngrok free-tier
 *     doesn't return its interstitial HTML page instead of JSON.
 *
 * Use this for every backend call instead of raw `fetch()`.
 */
export function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const headers = new Headers(init.headers);
  // Tell ngrok to skip the browser warning page for programmatic requests.
  if (!headers.has('ngrok-skip-browser-warning')) {
    headers.set('ngrok-skip-browser-warning', '1');
  }

  return fetch(url, { ...init, headers });
}
