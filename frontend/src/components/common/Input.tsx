import React, { type InputHTMLAttributes, useId } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<Props> = ({ label, error, hint, id, className = '', ...rest }) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`w-full min-h-touch-target rounded-md border px-3 py-2 text-sm
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600
          ${error ? 'border-danger' : 'border-border'} ${className}`}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
};
