import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global window.fetch interceptor for Capacitor and Emulator/Physical Device connectivity
const DEV_HOST_IP = "192.168.1.20";
const DEV_PORT = "3000";

const getApiBaseUrl = (): string => {
  const isCapacitor = 
    window.location.origin.startsWith("capacitor:") || 
    (window.location.origin.startsWith("http://localhost") && !window.location.port) ||
    window.location.origin.startsWith("file:");

  if (isCapacitor) {
    // Vite exposes env vars prefixed with VITE_ to the client
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    return envUrl || `http://${DEV_HOST_IP}:${DEV_PORT}`;
  }
  return "";
};


const apiBaseUrl = getApiBaseUrl();

if (apiBaseUrl) {
  console.log(`[CenturionGPT API Interceptor] Routing API requests to: ${apiBaseUrl}`);
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === "string" && input.startsWith("/api/")) {
      input = `${apiBaseUrl}${input}`;
    } else if (input instanceof URL && input.pathname.startsWith("/api/")) {
      input = new URL(`${apiBaseUrl}${input.pathname}${input.search}`);
    } else if (input instanceof Request) {
      try {
        const urlObj = new URL(input.url);
        if (urlObj.pathname.startsWith("/api/")) {
          const newUrl = `${apiBaseUrl}${urlObj.pathname}${urlObj.search}`;
          input = new Request(newUrl, input);
        }
      } catch (err) {
        console.error("[CenturionGPT API Interceptor] Failed to intercept Request URL:", err);
      }
    }
    return originalFetch.call(this, input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

