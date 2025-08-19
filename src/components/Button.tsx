import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  isLoading?: boolean
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const baseStyles =
    'px-4 py-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants: Record<string, string> = {
    primary:
      'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 focus:ring-blue-500',
    secondary:
      'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
    danger:
      'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-500 hover:to-pink-500 focus:ring-red-500'
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <span className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}

export default Button

