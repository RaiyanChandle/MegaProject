import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, CheckCircle, Share, PlusSquare } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Detect if already running as standalone PWA
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                            window.navigator.standalone === true;
    if (checkStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check dismissal from localStorage (cool-off for 3 days)
    const dismissedUntil = localStorage.getItem('nexus_pwa_dismissed_until');
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      setIsDismissed(true);
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
    if (isIosDevice && isSafari) {
      setIsIos(true);
      setIsInstallable(true);
    }

    // 4. Capture beforeinstallprompt event (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('[NEXUS PWA] beforeinstallprompt captured, app is installable');
    };

    // 5. App installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('[NEXUS PWA] Application successfully installed as PWA');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[NEXUS PWA] User install choice: ${outcome}`);

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    // Dismiss for 3 days
    localStorage.setItem('nexus_pwa_dismissed_until', String(Date.now() + 3 * 24 * 60 * 60 * 1000));
    setIsDismissed(true);
    setShowIosGuide(false);
  };

  // Do not show if installed, dismissed, or not installable
  if (isInstalled || isDismissed || !isInstallable) {
    return null;
  }

  return (
    <aside 
      aria-label="Install App"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 max-w-sm w-[calc(100vw-2rem)] sm:w-96 animate-in slide-in-from-bottom-6 fade-in duration-300"
    >
      <div className="bg-surface-0/95 dark:bg-ink-900/95 backdrop-blur-md border border-brass-500/30 dark:border-border rounded-2xl p-4 shadow-2xl shadow-black/20 flex flex-col gap-3 relative overflow-hidden group">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600" />

        {/* Header with KIT Logo */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2a1f5d] to-[#161036] p-1.5 flex items-center justify-center shrink-0 border border-purple-500/20 shadow-md">
            <img 
              src="/kitcoek.svg" 
              alt="KIT Logo" 
              className="w-full h-full object-contain filter drop-shadow-sm" 
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-sm text-text-900 dark:text-white truncate">
                Install NEXUS App
              </h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-brass-500/10 text-brass-700 dark:text-brass-400 border border-brass-500/20">
                PWA
              </span>
            </div>
            <p className="text-xs text-text-500 dark:text-text-400 mt-0.5 line-clamp-2">
              KIT College of Engineering Kolhapur — install for one-tap access, offline marks & attendance.
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="text-text-400 hover:text-text-600 dark:hover:text-text-2xl p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-ink-800 transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        {/* iOS Safari Guide Modal / Popover if on iPhone */}
        {showIosGuide && (
          <div className="p-3 bg-surface-50 dark:bg-ink-800/80 rounded-xl border border-border text-xs text-text-700 dark:text-text-300 space-y-2">
            <p className="font-semibold text-text-900 dark:text-white flex items-center gap-1.5">
              <Smartphone size={14} className="text-purple-500" />
              How to install on iOS Safari:
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-[11px]">
              <li className="flex items-center gap-1">
                Tap the <Share size={12} className="inline text-blue-500 mx-0.5" /> <strong>Share</strong> button in Safari's toolbar.
              </li>
              <li className="flex items-center gap-1">
                Scroll down and tap <PlusSquare size={12} className="inline text-emerald-500 mx-0.5" /> <strong>Add to Home Screen</strong>.
              </li>
              <li>Tap <strong>Add</strong> in the top right corner.</li>
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-medium text-xs py-2 px-3.5 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            <Download size={14} />
            <span>Install App</span>
          </button>

          <button
            onClick={handleDismiss}
            className="px-3 py-2 text-xs text-text-500 dark:text-text-400 hover:text-text-700 dark:hover:text-text-2xl font-medium rounded-xl hover:bg-surface-100 dark:hover:bg-ink-800 transition-colors cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </aside>
  );
}
