let deferredPrompt: any = null;

export function captureInstallPrompt(e: Event) {
  e.preventDefault();
  deferredPrompt = e;
}

export function getDeferredPrompt(): any {
  return deferredPrompt;
}

export function clearDeferredPrompt() {
  deferredPrompt = null;
}

export function isChromeInstallable(): boolean {
  return deferredPrompt !== null;
}

export function isIOSDevice(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua);
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;
}
