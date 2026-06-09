// ── fix-sdk-path.ts ──────────────────────────────────────────────────────────
// Fixes BioSense SDK errors 7006 / 30127 caused by relative-path asset loading.
//
// Root cause:
//   The SDK's internal webpack sets publicPath = "./" so every chunk, WASM,
//   and model request resolves relative to the current page URL.
//   On deep routes like /kiosk/:id/scan the browser asks for
//     /kiosk/:id/scan/a.wasm.gz
//     /kiosk/:id/scan/models/hemoglobin_60_fps_8bit.model.ios.bin
//   instead of the root-level paths where the dev server serves them.
//
// This module patches:
//   1. window.Worker       — force load a.worker.js from root "/"
//   2. window.fetch        — rewrite SDK asset URLs + add ngrok bypass header
//   3. window.XMLHttpRequest — same rewrite + header for XHR fallback paths
// ─────────────────────────────────────────────────────────────────────────────

// Regex that matches SDK asset filenames at the END of a URL path.
// Captures [1] = the root-relative asset path, [2] = optional query string.
const SDK_ASSET_RE = /\/(a\.wasm\.gz|a\.worker\.js|a\.js|799\.js|models\/[^?#]+)(\?.*)?$/;

/**
 * If `url` ends with a known SDK asset, return the root-relative version.
 * Otherwise return the url unchanged.
 */
function rewriteSDKUrl(url: string): string {
  const m = url.match(SDK_ASSET_RE);
  return m ? '/' + m[1] + (m[2] || '') : url;
}

// ── 1. Patch window.Worker ──────────────────────────────────────────────────
// The SDK creates `new Worker("a.worker.js")` which resolves relative to the
// page URL.  Inside the Worker, `self.location.href` determines the base path
// for model file fetches (Emscripten uses it as `scriptDirectory`).
// By forcing the Worker to load from "/a.worker.js", its `self.location.href`
// points to the root, so all relative model fetches resolve correctly.
const OriginalWorker = window.Worker;
if (typeof window !== 'undefined' && OriginalWorker) {
  window.Worker = function PatchedWorker(
    scriptUrl: string | URL,
    options?: WorkerOptions,
  ) {
    let url: string | URL = scriptUrl;
    const href = typeof scriptUrl === 'string' ? scriptUrl : scriptUrl.href;
    if (href.match(/a\.worker\.js/)) {
      url = '/a.worker.js';
    }
    return new OriginalWorker(url, options);
  } as any;
  window.Worker.prototype = OriginalWorker.prototype;
}

// ── 2. Patch window.fetch ───────────────────────────────────────────────────
// • Rewrites same-origin SDK asset URLs to root-relative paths.
// • Adds `ngrok-skip-browser-warning` header so ngrok's free-tier interstitial
//   page doesn't replace binary responses with HTML.
const OriginalFetch = window.fetch.bind(window);
if (typeof window !== 'undefined' && OriginalFetch) {
  window.fetch = function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    let isSameOrigin = false;

    try {
      if (typeof input === 'string') {
        isSameOrigin =
          !input.startsWith('http') ||
          new URL(input).origin === window.location.origin;
      } else if (input instanceof URL) {
        isSameOrigin = input.origin === window.location.origin;
      } else if (input instanceof Request) {
        isSameOrigin = new URL(input.url).origin === window.location.origin;
      }
    } catch {
      isSameOrigin = true; // relative URL — always same origin
    }

    // Rewrite SDK asset paths
    if (isSameOrigin && typeof input === 'string') {
      input = rewriteSDKUrl(input);
    }

    // Inject ngrok bypass header for all same-origin requests
    if (isSameOrigin) {
      const headers = new Headers(init?.headers);
      if (!headers.has('ngrok-skip-browser-warning')) {
        headers.set('ngrok-skip-browser-warning', '1');
      }
      return OriginalFetch(input, { ...init, headers });
    }

    return OriginalFetch(input, init);
  };
}

// ── 3. Patch window.XMLHttpRequest ──────────────────────────────────────────
// Emscripten sometimes falls back to XHR for file loading.
const OriginalXHR = window.XMLHttpRequest;
if (typeof window !== 'undefined' && OriginalXHR) {
  window.XMLHttpRequest = function PatchedXHR() {
    const xhr = new OriginalXHR();
    const originalOpen = xhr.open;
    const originalSend = xhr.send;
    let isSameOrigin = false;

    xhr.open = function patchedOpen(
      method: string,
      url: string | URL,
      ...args: any[]
    ) {
      let urlStr = typeof url === 'string' ? url : url.toString();

      try {
        isSameOrigin =
          !urlStr.startsWith('http') ||
          new URL(urlStr).origin === window.location.origin;
      } catch {
        isSameOrigin = true;
      }

      if (isSameOrigin) {
        urlStr = rewriteSDKUrl(urlStr);
      }

      return originalOpen.apply(this, [method, urlStr, ...args] as any);
    } as any;

    xhr.send = function patchedSend(body?: any) {
      if (isSameOrigin) {
        try {
          xhr.setRequestHeader('ngrok-skip-browser-warning', '1');
        } catch {
          // Ignore — state might not allow setRequestHeader
        }
      }
      return originalSend.apply(this, arguments as any);
    };

    return xhr;
  } as any;
  window.XMLHttpRequest.prototype = OriginalXHR.prototype;
}
