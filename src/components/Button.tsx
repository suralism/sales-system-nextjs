import React from 'react'
import { Button as AntButton, ButtonProps as AntButtonProps } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

interface ButtonProps extends Omit<AntButtonProps, 'size' | 'type' | 'variant'> {
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
  // Map custom variants to Ant Design button types
  const getAntButtonType = (): AntButtonProps['type'] => {
    switch (variant) {
      case 'primary':
        return 'primary'
      case 'danger':
        return 'primary'
      case 'secondary':
        return 'default'
      case 'ghost':
        return 'text'
      default:
        return 'default'
    }
  }

  // Map custom sizes to Ant Design sizes
  const getAntButtonSize = (): AntButtonProps['size'] => {
    switch (size) {
      case 'sm':
        return 'small'
      case 'md':
        return 'middle'
      case 'lg':
      case 'xl':
        return 'large'
      default:
        return 'middle'
    }
  }

  // Custom styles for different variants
  const customStyles: React.CSSProperties = {
    ...(fullWidth && { width: '100%' }),
    ...(variant === 'danger' && {
      backgroundColor: '#dc2626',
      borderColor: '#dc2626',
      color: 'white'
    }),
    ...(variant === 'success' && {
      backgroundColor: '#16a34a',
      borderColor: '#16a34a',
      color: 'white'
    }),
    ...(variant === 'warning' && {
      backgroundColor: '#eab308',
      borderColor: '#eab308',
      color: 'white'
    })
  }

  return (
    <AntButton
      type={getAntButtonType()}
      size={getAntButtonSize()}
      loading={isLoading}
      disabled={disabled}
      className={className}
      style={customStyles}
      icon={leftIcon && !isLoading ? leftIcon : undefined}
      {...props}
    >
      {children}
      {rightIcon && <span style={{ marginLeft: 8 }}>{rightIcon}</span>}
    </AntButton>
  )
}

export default Button

