import React from 'react'
import { Card as AntCard, CardProps as AntCardProps, Typography } from 'antd'

const { Title, Text } = Typography

interface CardProps extends Omit<AntCardProps, 'size'> {
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
  const customStyles: React.CSSProperties = {
    cursor: clickable ? 'pointer' : undefined,
    transition: 'all 0.2s ease',
    ...(hover && {
      ':hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }
    })
  }

  const cardClassName = [
    className,
    hover ? 'hover-card' : '',
    clickable ? 'clickable-card' : ''
  ].filter(Boolean).join(' ')

  return (
    <AntCard
      className={cardClassName}
      style={customStyles}
      onClick={clickable ? onClick : undefined}
      hoverable={hover || clickable}
      {...props}
    >
      {children}
    </AntCard>
  )
}

// Subcomponents for better card structure
interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => (
  <div className={`ant-card-head-wrapper ${className}`}>
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
  const level = {
    sm: 5,
    md: 4,
    lg: 3,
    xl: 2
  }[size] as 1 | 2 | 3 | 4 | 5

  return (
    <Title level={level} className={className} style={{ margin: 0 }}>
      {children}
    </Title>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => (
  <div className={`ant-card-body ${className}`}>
    {children}
  </div>
)

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => (
  <div className={`ant-card-actions ${className}`} style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f0' }}>
    {children}
  </div>
)

export default Card