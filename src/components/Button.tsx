import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  children,
  ...props
}) => {
  // Enhanced mobile-friendly base styles with better touch targets
  const baseStyles = `
    inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 
    focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-95 select-none touch-manipulation
    ${fullWidth ? 'w-full' : ''}
  `
  
  // Size variants with improved mobile touch targets (minimum 44px height)
  const sizes: Record<string, string> = {
    sm: 'px-3 py-2 text-sm min-h-[40px]',
    md: 'px-4 py-3 text-sm min-h-[44px] sm:text-base',
    lg: 'px-6 py-3 text-base min-h-[48px] sm:py-4',
    xl: 'px-8 py-4 text-lg min-h-[52px] sm:py-5'
  }

  // Enhanced color variants with better contrast and accessibility
  const variants: Record<string, string> = {
    primary: `
      bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md
      hover:from-blue-700 hover:to-blue-800 hover:shadow-lg
      focus:ring-blue-500 active:from-blue-800 active:to-blue-900
      dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700
      dark:active:from-blue-700 dark:active:to-blue-800
    `,
    secondary: `
      bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 
      text-gray-700 dark:text-gray-200 shadow-sm
      hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md
      focus:ring-gray-500 dark:focus:ring-gray-400 active:bg-gray-100 dark:active:bg-gray-600
    `,
    success: `
      bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md
      hover:from-green-700 hover:to-green-800 hover:shadow-lg
      focus:ring-green-500 active:from-green-800 active:to-green-900
      dark:from-green-500 dark:to-green-600 dark:hover:from-green-600 dark:hover:to-green-700
      dark:active:from-green-700 dark:active:to-green-800
    `,
    warning: `
      bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md
      hover:from-yellow-600 hover:to-yellow-700 hover:shadow-lg
      focus:ring-yellow-500 active:from-yellow-700 active:to-yellow-800
      dark:from-yellow-400 dark:to-yellow-500 dark:hover:from-yellow-500 dark:hover:to-yellow-600
      dark:active:from-yellow-600 dark:active:to-yellow-700
    `,
    danger: `
      bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md
      hover:from-red-700 hover:to-red-800 hover:shadow-lg
      focus:ring-red-500 active:from-red-800 active:to-red-900
      dark:from-red-500 dark:to-red-600 dark:hover:from-red-600 dark:hover:to-red-700
      dark:active:from-red-700 dark:active:to-red-800
    `,
    ghost: `
      bg-transparent text-gray-600 dark:text-gray-300
      hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100
      focus:ring-gray-500 dark:focus:ring-gray-400 active:bg-gray-200 dark:active:bg-gray-600
    `
  }

  return (
    <button
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`.replace(/\s+/g, ' ').trim()}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="inline-block w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="opacity-75">กำลังโหลด...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="mr-2">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="ml-2">{rightIcon}</span>}
        </>
      )}
    </button>
  )
}

export default Button

