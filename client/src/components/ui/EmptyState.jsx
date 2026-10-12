import React from 'react';

export default function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-md border border-border bg-surface-0">
      <h3 className="text-base font-semibold text-text-900 mb-2">{title}</h3>
      <p className="text-sm text-text-500 mb-6 max-w-sm">
        {description}
      </p>
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
}
