import React, { forwardRef, memo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Transition } from '@headlessui/react';

// Memoized layout components for better performance
const ResponsiveLayout = memo(({ children, className = '', as: Component = 'div', ...props }) => {
  const { currentTheme } = useTheme();

  return (
    <Component
      className={`min-h-screen ${currentTheme.primary} ${className}`}
      {...props}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`py-4 sm:py-6 lg:py-8`}>
          {children}
        </div>
      </div>
    </Component>
  );
});

export const ResponsiveGrid = memo(({ 
  children, 
  cols = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = { sm: 4, md: 6 },
  className = '',
  ...props 
}) => {
  const gridCols = {
    sm: `grid-cols-${cols.sm}`,
    md: `md:grid-cols-${cols.md}`,
    lg: `lg:grid-cols-${cols.lg}`,
    xl: `xl:grid-cols-${cols.xl}`
  };

  const gridGap = {
    sm: `gap-${gap.sm}`,
    md: `md:gap-${gap.md}`
  };

  return (
    <div 
      className={`grid ${Object.values(gridCols).join(' ')} ${Object.values(gridGap).join(' ')} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

export const ResponsiveCard = memo(({ 
  children, 
  className = '',
  onClick,
  as: Component = 'div',
  ...props 
}) => {
  const { currentTheme } = useTheme();

  return (
    <Component
      onClick={onClick}
      className={`${currentTheme.secondary} rounded-lg shadow-md overflow-hidden transition-shadow duration-200 hover:shadow-lg ${className}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyPress={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      {...props}
    >
      {children}
    </Component>
  );
});

export const ResponsiveButton = memo(forwardRef(({ 
  children, 
  onClick, 
  className = '', 
  variant = 'primary',
  disabled = false,
  type = 'button',
  ...props 
}, ref) => {
  const { currentTheme } = useTheme();
  const baseClasses = 'px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: `${currentTheme.button} text-white`,
    secondary: `${currentTheme.hover} ${currentTheme.text}`,
    outline: `border ${currentTheme.border} ${currentTheme.text} hover:${currentTheme.hover}`,
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white'
  };

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}));

export const ResponsiveInput = memo(forwardRef(({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  error,
  className = '',
  required = false,
  ...props 
}, ref) => {
  const { currentTheme } = useTheme();

  return (
    <div className="space-y-1">
      {label && (
        <label 
          className={`block text-sm font-medium ${currentTheme.text}`}
          htmlFor={props.id}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className={`w-full px-3 py-2 border ${error ? 'border-red-500' : currentTheme.border} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentTheme.accent} ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${props.id}-error` : undefined}
        {...props}
      />
      {error && (
        <p 
          className="text-sm text-red-500 mt-1"
          id={`${props.id}-error`}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}));

export const ResponsiveSelect = memo(forwardRef(({ 
  label, 
  options, 
  value, 
  onChange, 
  className = '',
  error,
  required = false,
  ...props 
}, ref) => {
  const { currentTheme } = useTheme();

  return (
    <div className="space-y-1">
      {label && (
        <label 
          className={`block text-sm font-medium ${currentTheme.text}`}
          htmlFor={props.id}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        value={value}
        onChange={onChange}
        required={required}
        className={`w-full px-3 py-2 border ${error ? 'border-red-500' : currentTheme.border} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentTheme.accent} ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${props.id}-error` : undefined}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p 
          className="text-sm text-red-500 mt-1"
          id={`${props.id}-error`}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}));

export const ResponsiveModal = memo(({ 
  isOpen, 
  onClose, 
  children, 
  title,
  size = 'md',
  ...props 
}) => {
  const { currentTheme } = useTheme();

  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl'
  };

  return (
    <Transition
      show={isOpen}
      enter="ease-out duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="ease-in duration-200"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
          </Transition.Child>

          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

          <Transition.Child
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div 
              className={`inline-block align-bottom ${currentTheme.primary} rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} sm:w-full`}
              {...props}
            >
              <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4 ${currentTheme.secondary}`}>
                {title && (
                  <h3 
                    className={`text-lg font-medium ${currentTheme.text}`}
                    id="modal-title"
                  >
                    {title}
                  </h3>
                )}
                <div className="mt-2">
                  {children}
                </div>
              </div>
              <div className={`px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse ${currentTheme.secondary}`}>
                <ResponsiveButton
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                  className="mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </ResponsiveButton>
              </div>
            </div>
          </Transition.Child>
        </div>
      </div>
    </Transition>
  );
});

export default ResponsiveLayout; 