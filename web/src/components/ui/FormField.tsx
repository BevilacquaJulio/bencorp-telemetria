import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
  icon?: ReactNode
  action?: ReactNode
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField(
    { label, error, hint, icon, action, className = '', id, ...props },
    ref,
  ) {
    const inputId = id ?? props.name
    const descriptionId = error
      ? `${inputId}-error`
      : hint
        ? `${inputId}-hint`
        : undefined

    return (
      <div className={`form-field ${className}`}>
        <label htmlFor={inputId}>{label}</label>
        <div className={`form-field__control ${error ? 'is-invalid' : ''}`}>
          {icon ? <span className="form-field__icon">{icon}</span> : null}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={descriptionId}
            {...props}
          />
          {action ? <span className="form-field__action">{action}</span> : null}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="form-field__error">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="form-field__hint">
            {hint}
          </p>
        ) : null}
      </div>
    )
  },
)
