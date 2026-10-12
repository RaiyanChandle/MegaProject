import React from 'react';

export default function Field({ 
  label, 
  error, 
  id, 
  className = '', 
  children 
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-900 mb-1">
          {label}
        </label>
      )}
      
      {/* Clone the child to inject error styling and id if needed */}
      {React.isValidElement(children) 
        ? React.cloneElement(children, {
            id,
            className: `${children.props.className || ''} w-full rounded-md border ${
              error ? 'border-danger focus:border-danger focus:ring-danger' : 'border-border focus:border-ink-700 focus:ring-ink-700'
            } px-3 py-2 text-sm focus:outline-none focus:ring-1 bg-surface-0`
          })
        : children}

      {error && (
        <p className="text-danger text-xs mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
