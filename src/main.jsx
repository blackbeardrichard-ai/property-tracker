import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Keep the app on the phone so it opens without signal (production only).
// It opens from the copy on the phone; a new version downloads in the background and is used
// the next time the app opens (or straight away if it arrives in the first seconds).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const started = Date.now();
  const hadController = !!navigator.serviceWorker.controller;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const busy = document.querySelector('.pt-overlay') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (hadController && Date.now() - started < 20000 && !busy) window.location.reload();
  });
}
