import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
        console.warn('Service worker registration failed', error);
      });
      return;
    }

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(
          registrations
            .filter((registration) => registration.scope.startsWith(window.location.origin))
            .map((registration) => registration.unregister())
        )
      )
      .then(() => {
        if (!('caches' in window)) return;
        return caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((key) => key.startsWith('rotation-planner-'))
                .map((key) => caches.delete(key))
            )
          );
      })
      .catch((error) => {
        console.warn('Service worker cleanup failed', error);
      });
  });
}
