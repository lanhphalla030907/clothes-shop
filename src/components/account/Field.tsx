import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

/**
 * Labelled form controls.
 *
 * Every control gets a real `<label for>`, and an error is wired up with
 * `aria-describedby` plus `aria-invalid` rather than shown as red text beside the
 * input. That combination is what makes a screen reader announce *which* field is
 * wrong and why, at the moment focus lands on it — a colour change alone tells a
 * sighted user and nobody else.
 *
 * Errors are only rendered when the field is invalid; the messages come from
 * `features/addresses/rules.ts` on the client and can still be overridden by the
 * server, which remains the authority.
 */

const controlClasses = (invalid: boolean): string =>
  `w-full border bg-paper-pure px-4 text-sm text-ink placeholder:text-ash transition-colors duration-200 focus:outline-none focus-visible:ring-1 ${
    invalid
      ? 'border-signal focus-visible:border-signal focus-visible:ring-signal'
      : 'border-line focus-visible:border-ink focus-visible:ring-ink'
  }`

type FieldShellProps = {
  id: string
  label: string
  error?: string | undefined
  hint?: string
  required?: boolean
  children: ReactNode
}

const FieldShell = ({ id, label, error, hint, required, children }: FieldShellProps) => (
  <div className="space-y-2">
    <label htmlFor={id} className="label-micro block text-graphite">
      {label}
      {required && <span className="ml-1 text-signal">*</span>}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} className="text-xs leading-relaxed text-signal">
        {error}
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="text-xs leading-relaxed text-graphite">
        {hint}
      </p>
    ) : null}
  </div>
)

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  error?: string | undefined
  hint?: string
}

export const TextField = ({ label, error, hint, required, className = '', ...rest }: TextFieldProps) => {
  const generated = useId()
  const id = rest.name ? `field-${rest.name}` : generated

  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${controlClasses(Boolean(error))} h-12 ${className}`}
        {...rest}
      />
    </FieldShell>
  )
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string
  error?: string | undefined
  hint?: string
  children: ReactNode
}

export const SelectField = ({
  label,
  error,
  hint,
  required,
  children,
  className = '',
  ...rest
}: SelectFieldProps) => {
  const generated = useId()
  const id = rest.name ? `field-${rest.name}` : generated

  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${controlClasses(Boolean(error))} h-12 ${className}`}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  )
}

type FormErrorProps = {
  /** A whole-form failure — a server refusal that is not tied to one input. */
  message: string
}

/**
 * The escape hatch for errors that belong to no single field: a rejected address
 * because it belongs to someone else, or a save that failed for a reason the
 * shopper cannot fix. `role="alert"` because it interrupts the submission they
 * just attempted.
 */
export const FormError = ({ message }: FormErrorProps) => (
  <p
    role="alert"
    className="border border-signal/30 bg-signal-soft px-4 py-3 text-sm leading-relaxed text-ink"
  >
    {message}
  </p>
)
