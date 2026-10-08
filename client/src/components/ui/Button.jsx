import React from 'react';

const variants = {
  primary: 'bg-ink-900 text-white hover:bg-ink-700',
  accent: 'bg-brass-500 text-white hover:bg-brass-600',
  secondary: 'border border-border bg-surface-0 text-text-900 hover:bg-surface-50',
  destructive: 'bg-danger text-white hover:bg-danger/90',
};

export default function Button({ 
  variant = 'primary', 
  className = '', 
  children, 
  ...props 
}) {
  const baseClasses = 'rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-700 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2';
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
