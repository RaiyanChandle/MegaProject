/**
 * PWA Service Worker Registration & Lifecycle Manager
 */
export function registerPwa() {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    // Only register in production or on localhost/HTTPS
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.hostname.endsWith('.localhost');

    if (window.location.protocol === 'https:' || isLocalhost) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[NEXUS PWA] Service Worker registered with scope:', registration.scope);

            // Check for updates
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[NEXUS PWA] New update ready! Reload to view latest version.');
                  }
                };
              }
            };
          })
          .catch((error) => {
            console.warn('[NEXUS PWA] Service Worker registration failed:', error);
          });
      });
    }
  }
}
