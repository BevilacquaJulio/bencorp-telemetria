import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  icon?: ReactNode
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button--${variant} button--${size} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="button__loader" aria-hidden="true" /> : icon}
      <span>{children}</span>
    </button>
  )
}
