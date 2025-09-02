import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  border?: boolean
  hover?: boolean
  clickable?: boolean
  onClick?: () => void
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  rounded = 'lg',
  border = false,
  hover = false,
  clickable = false,
  onClick,
  ...props
}) => {
  const paddingClasses: Record<string, string> = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  }

  const shadowClasses: Record<string, string> = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  }

  const roundedClasses: Record<string, string> = {
    none: '',
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl'
  }

  const baseClasses = `
    bg-white dark:bg-gray-800 transition-all duration-200
    ${paddingClasses[padding]}
    ${shadowClasses[shadow]}
    ${roundedClasses[rounded]}
    ${border ? 'border border-gray-200 dark:border-gray-700' : ''}
    ${hover ? 'hover:shadow-lg hover:-translate-y-1 dark:hover:shadow-xl dark:hover:shadow-gray-900/20' : ''}
    ${clickable ? 'cursor-pointer active:scale-[0.98]' : ''}
    ${className}
  `

  const CardComponent = clickable ? 'button' : 'div'

  return (
    <CardComponent
      className={baseClasses.replace(/\s+/g, ' ').trim()}
      onClick={onClick}
      {...props}
    >
      {children}
    </CardComponent>
  )
}

// Subcomponents for better card structure
interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
)

interface CardTitleProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export const CardTitle: React.FC<CardTitleProps> = ({ 
  children, 
  className = '',
  size = 'lg'
}) => {
  const sizeClasses: Record<string, string> = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  }

  return (
    <h3 className={`font-semibold text-gray-900 dark:text-white ${sizeClasses[size]} ${className}`}>
      {children}
    </h3>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => (
  <div className={`text-gray-600 dark:text-gray-300 ${className}`}>
    {children}
  </div>
)

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => (
  <div className={`mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 ${className}`}>
    {children}
  </div>
)

export default Card