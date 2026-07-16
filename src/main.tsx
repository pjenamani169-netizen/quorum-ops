// FIRST: Sanitize all fetch request headers
const sanitizeHeaderValue = (name: string, value: string): string => {
  let hasNonIso = false;
  const sanitized = value
    .split('')
    .map(char => {
      const code = char.charCodeAt(0);
      if (code > 255) {
        hasNonIso = true;
        // Instead of escaping, we can also just remove the problematic character
        return '';
      }
      return char;
    })
    .join('');
  
  if (hasNonIso) {
    console.warn(`[Header Sanitizer] Non-ISO-8859-1 character found in header "${name}":`, {
      originalValue: value,
      sanitizedValue: sanitized
    });
  }
  
  return sanitized;
};

// Sanitize a Headers object
const sanitizeHeaders = (headers: HeadersInit | undefined): HeadersInit | undefined => {
  if (!headers) return headers;
  
  if (headers instanceof Headers) {
    const sanitized = new Headers();
    headers.forEach((value, name) => {
      sanitized.set(name, sanitizeHeaderValue(name, value));
    });
    return sanitized;
  } else if (Array.isArray(headers)) {
    return headers.map(([name, value]) => [name, sanitizeHeaderValue(name, value)]);
  } else {
    const sanitized: Record<string, string> = {};
    for (const [name, value] of Object.entries(headers)) {
      sanitized[name] = sanitizeHeaderValue(name, value);
    }
    return sanitized;
  }
};

// Intercept all fetch requests
const originalFetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
  // Sanitize headers from init
  if (init) {
    init.headers = sanitizeHeaders(init.headers);
  }
  
  // If input is a Request object, sanitize its headers too
  if (input instanceof Request) {
    const sanitizedHeaders = sanitizeHeaders(input.headers);
    // Create a new Request with sanitized headers
    input = new Request(input, { headers: sanitizedHeaders });
  }
  
  return originalFetch.call(this, input, init);
};

console.log('[Header Sanitizer] Fetch interceptor installed');

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
