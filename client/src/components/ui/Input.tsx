import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-textMain mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(
            'block w-full bg-base border rounded-md py-2 px-3 text-sm text-textMain placeholder-textDisabled transition-colors focus:outline-none focus:ring-1',
            error 
              ? 'border-danger focus:border-danger focus:ring-danger' 
              : 'border-border focus:border-primary focus:ring-primary',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-sm text-textMuted">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
