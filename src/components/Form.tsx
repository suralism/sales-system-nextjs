import React, { forwardRef } from 'react'
import { Input as AntInput, Select as AntSelect, Form as AntForm, Typography } from 'antd'
import { CaretDownOutlined } from '@ant-design/icons'

const { TextArea } = AntInput
const { Text } = Typography

// Input component with enhanced mobile support
interface InputProps extends React.ComponentProps<typeof AntInput> {
  label?: string
  error?: string
  helper?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Input = forwardRef<any, InputProps>(({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  style,
  ...props
}, ref) => {
  const inputStyle = {
    width: fullWidth ? '100%' : undefined,
    ...style
  }

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          {label}
        </Text>
      )}
      <AntInput
        ref={ref}
        className={className}
        style={inputStyle}
        status={error ? 'error' : undefined}
        prefix={leftIcon}
        suffix={rightIcon}
        {...props}
      />
      {error && (
        <Text type="danger" style={{ fontSize: '14px', display: 'block', marginTop: 4 }}>
          ⚠️ {error}
        </Text>
      )}
      {helper && !error && (
        <Text type="secondary" style={{ fontSize: '14px', display: 'block', marginTop: 4 }}>
          {helper}
        </Text>
      )}
    </div>
  )
})

Input.displayName = 'Input'

// Select component with mobile-friendly dropdown
interface SelectProps extends React.ComponentProps<typeof AntSelect> {
  label?: string
  error?: string
  helper?: string
  options: { value: string; label: string; disabled?: boolean }[]
  fullWidth?: boolean
  placeholder?: string
}

export const Select = forwardRef<any, SelectProps>(({
  label,
  error,
  helper,
  options,
  fullWidth = false,
  placeholder,
  className = '',
  style,
  ...props
}, ref) => {
  const selectStyle = {
    width: fullWidth ? '100%' : undefined,
    ...style
  }

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          {label}
        </Text>
      )}
      <AntSelect
        ref={ref}
        className={className}
        style={selectStyle}
        status={error ? 'error' : undefined}
        placeholder={placeholder}
        suffixIcon={<CaretDownOutlined />}
        options={options}
        {...props}
      />
      {error && (
        <Text type="danger" style={{ fontSize: '14px', display: 'block', marginTop: 4 }}>
          ⚠️ {error}
        </Text>
      )}
      {helper && !error && (
        <Text type="secondary" style={{ fontSize: '14px', display: 'block', marginTop: 4 }}>
          {helper}
        </Text>
      )}
    </div>
  )
})

Select.displayName = 'Select'

// Textarea component
interface TextareaProps extends React.ComponentProps<typeof TextArea> {
  label?: string
  error?: string
  helper?: string
  fullWidth?: boolean
  resize?: boolean
}

export const Textarea = forwardRef<any, TextareaProps>(({
  label,
  error,
  helper,
  fullWidth = false,
  resize = true,
  className = '',
  style,
  ...props
}, ref) => {
  const textareaStyle: React.CSSProperties = {
    width: fullWidth ? '100%' : undefined,
    minHeight: '100px',
    ...style
  }

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          {label}
        </Text>
      )}
      <TextArea
        ref={ref}
        className={className}
        style={textareaStyle}
        status={error ? 'error' : undefined}
        {...props}
      />
      {error && (
        <Text type="danger" style={{ fontSize: '14px', display: 'block', marginTop: 4 }}>
          ⚠️ {error}
        </Text>
      )}
      {helper && !error && (
        <Text type="secondary" style={{ fontSize: '14px', display: 'block', marginTop: 4 }}>
          {helper}
        </Text>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

// Form wrapper component
interface FormProps extends React.ComponentProps<typeof AntForm> {
  children: React.ReactNode
}

export const Form: React.FC<FormProps> = ({ children, className = '', ...props }) => {
  return (
    <AntForm layout="vertical" className={className} {...props}>
      {children}
    </AntForm>
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
    <div className={`ant-form-group ${className}`} style={{ marginBottom: 24 }}>
      {title && (
        <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 8, marginBottom: 16 }}>
          <Text strong style={{ fontSize: '16px', display: 'block' }}>
            {title}
          </Text>
          {description && (
            <Text type="secondary" style={{ fontSize: '14px', display: 'block', marginTop: 4 }}>
              {description}
            </Text>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  )
}