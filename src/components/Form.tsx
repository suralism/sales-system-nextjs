import React, { forwardRef } from 'react'

// Input component with enhanced mobile support
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const inputClasses = `
    w-full px-4 py-3 text-base border rounded-xl transition-all duration-200
    focus:outline-none focus:ring-2 focus:border-transparent
    disabled:bg-gray-100 disabled:text-gray-400
    ${error 
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
    }
    ${leftIcon ? 'pl-12' : ''}
    ${rightIcon ? 'pr-12' : ''}
    min-h-[44px] touch-manipulation
  `

  return (
    <div className={`${fullWidth ? 'w-full' : ''} space-y-1`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={`${inputClasses} ${className}`.replace(/\s+/g, ' ').trim()}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 mt-1 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-sm text-gray-500 mt-1">
          {helper}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

// Select component with mobile-friendly dropdown
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helper?: string
  options: { value: string; label: string; disabled?: boolean }[]
  fullWidth?: boolean
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helper,
  options,
  fullWidth = false,
  placeholder,
  className = '',
  ...props
}, ref) => {
  const selectClasses = `
    w-full px-4 py-3 text-base border rounded-xl transition-all duration-200 bg-white
    focus:outline-none focus:ring-2 focus:border-transparent appearance-none
    disabled:bg-gray-100 disabled:text-gray-400
    ${error 
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
    }
    min-h-[44px] touch-manipulation pr-12
  `

  return (
    <div className={`${fullWidth ? 'w-full' : ''} space-y-1`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={`${selectClasses} ${className}`.replace(/\s+/g, ' ').trim()}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 mt-1 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-sm text-gray-500 mt-1">
          {helper}
        </p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

// Textarea component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helper?: string
  fullWidth?: boolean
  resize?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helper,
  fullWidth = false,
  resize = true,
  className = '',
  ...props
}, ref) => {
  const textareaClasses = `
    w-full px-4 py-3 text-base border rounded-xl transition-all duration-200
    focus:outline-none focus:ring-2 focus:border-transparent
    disabled:bg-gray-100 disabled:text-gray-400
    ${error 
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
    }
    ${resize ? 'resize-y' : 'resize-none'}
    min-h-[100px] touch-manipulation
  `

  return (
    <div className={`${fullWidth ? 'w-full' : ''} space-y-1`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={`${textareaClasses} ${className}`.replace(/\s+/g, ' ').trim()}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-sm text-gray-500 mt-1">
          {helper}
        </p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

// Form wrapper component
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode
}

export const Form: React.FC<FormProps> = ({ children, className = '', ...props }) => {
  return (
    <form className={`space-y-6 ${className}`} {...props}>
      {children}
    </form>
  )
}

// Form group for organizing related inputs
interface FormGroupProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
}

export const FormGroup: React.FC<FormGroupProps> = ({ 
  children, 
  className = '',
  title,
  description 
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div className="border-b border-gray-200 pb-2">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}