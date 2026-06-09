/**
 * Central API configuration.
 * Injected at build time from .env (local) or .env.ngrok (ngrok mode).
 * Switch modes with: npm start  vs  npm run start:ngrok
 */
// Empty string = relative URL → webpack devServer proxy forwards to http://localhost:8001.
// Required for https://localhost:8000 — browsers block HTTPS → http://localhost:8001 (mixed content).
// In ngrok/prod mode set BACKEND_URL to your public API origin (must be https).
export const API_BASE: string = process.env.BACKEND_URL || '';


