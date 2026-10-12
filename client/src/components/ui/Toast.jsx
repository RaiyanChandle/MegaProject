import { useState, useEffect } from 'react';

// A simple global state for toast without bringing in a heavy library
let toastCallback = null;

export const toast = {
  success: (message) => toastCallback?.({ type: 'success', message }),
  error: (message) => toastCallback?.({ type: 'error', message }),
  info: (message) => toastCallback?.({ type: 'info', message }),
};

export default function ToastProvider() {
  const [currentToast, setCurrentToast] = useState(null);

  useEffect(() => {
    toastCallback = (t) => {
      setCurrentToast(t);
      setTimeout(() => setCurrentToast(null), 3000);
    };
    return () => { toastCallback = null; };
  }, []);

  if (!currentToast) return null;

  const bgColors = {
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
    info: 'bg-info text-white'
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 duration-200">
      <div className={`px-4 py-3 rounded-md shadow-lg flex items-center gap-3 text-sm font-medium ${bgColors[currentToast.type]}`}>
        {currentToast.message}
      </div>
    </div>
  );
}
