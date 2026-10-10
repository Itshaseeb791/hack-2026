import React, { type SelectHTMLAttributes, useId } from 'react';

interface Option {
  value: string;
  label: string;
}

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string;
  options: Option[];
  error?: string;
  placeholder?: string;
}

export const Select: React.FC<Props> = ({ label, options, error, placeholder, id, className = '', ...rest }) => {
  const autoId = useId();
  const selectId = id ?? autoId;
  const errorId = `${selectId}-error`;

  return (
    <div className="space-y-1">
      <label htmlFor={selectId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`w-full min-h-touch-target rounded-md border px-3 py-2 text-sm bg-white
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600
          ${error ? 'border-danger' : 'border-border'} ${className}`}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p id={errorId} className="text-xs text-danger">{error}</p>}
    </div>
  );
};
