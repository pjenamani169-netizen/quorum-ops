// ABSOLUTE FIRST: Monkey-patch Headers to catch and fix the issue!
(function() {
  'use strict';

  // Check if Headers exists
  if (typeof Headers === 'undefined') return;

  const originalSet = Headers.prototype.set;
  const originalAppend = Headers.prototype.append;

  // Helper: Check and sanitize a single header value
  function sanitizeValue(name: string, value: string) {
    // Check if value has any non-ISO-8859-1 characters (code > 255)
    let hasNonIso = false;
    const sanitized = value.split('').map(char => {
      const code = char.charCodeAt(0);
      if (code > 255) {
        hasNonIso = true;
        // Replace with empty string instead of escaping
        return '';
      }
      return char;
    }).join('');

    if (hasNonIso) {
      console.error(
        '[Headers Patch] Found non-ISO-8859-1 character in header!',
        {
          headerName: name,
          originalValue: value,
          sanitizedValue: sanitized,
          stackTrace: new Error().stack
        }
      );
    }

    return sanitized;
  }

  // Patch set()
  Headers.prototype.set = function(name: string, value: string) {
    const sanitized = sanitizeValue(name, value);
    return originalSet.call(this, name, sanitized);
  };

  // Patch append()
  Headers.prototype.append = function(name: string, value: string) {
    const sanitized = sanitizeValue(name, value);
    return originalAppend.call(this, name, sanitized);
  };

  console.log('[Headers Patch] Headers.set and Headers.append patched successfully');
})();

// Now proceed with the app
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
