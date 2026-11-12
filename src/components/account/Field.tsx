import { useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

/**
 * Labelled form controls.
 *
 * Every control gets a real `<label for>`, and an error is wired up with
 * `aria-describedby` plus `aria-invalid` rather than shown as red text beside the
 * input. That combination is what makes a screen reader announce *which* field is
 * wrong and why, at the moment focus lands on it — a colour change alone tells a
 * sighted user and nobody else.
 *
 * Labels are sentence case and 13px. The editorial mono micro-label is kept for
 * the storefront's chrome; forms are read repeatedly and need a normal face.
 */

const controlClasses = (invalid: boolean): string =>
  `w-full border bg-paper-pure px-3.5 text-[15px] text-ink placeholder:text-ash transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
    invalid
      ? 'border-signal focus-visible:border-signal focus-visible:ring-signal/30'
      : 'border-line hover:border-graphite/60 focus-visible:border-ink focus-visible:ring-ink/15'
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
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-[13px] font-medium text-ink">
      {label}
      {required && (
        <span className="ml-1 text-signal" aria-hidden>
          *
        </span>
      )}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} className="text-[13px] leading-relaxed font-medium text-signal">
        {error}
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="text-[13px] leading-relaxed text-graphite">
        {hint}
      </p>
    ) : null}
  </div>
)

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  error?: string | undefined
  hint?: string
  /**
   * A control pinned inside the input's trailing edge — a password visibility
   * toggle, for instance. The input reserves room so text never runs underneath.
   */
  trailing?: ReactNode
}

export const TextField = ({
  label,
  error,
  hint,
  required,
  className = '',
  trailing,
  ...rest
}: TextFieldProps) => {
  const generated = useId()
  const id = rest.name ? `field-${rest.name}` : generated

  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <div className="relative">
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`${controlClasses(Boolean(error))} h-11 ${trailing ? 'pr-12' : ''} ${className}`}
          {...rest}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</div>
        )}
      </div>
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
        className={`${controlClasses(Boolean(error))} h-11 cursor-pointer pr-9 ${className}`}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  )
}

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string
  error?: string | undefined
  hint?: string
}

export const TextAreaField = ({ label, error, hint, required, className = '', ...rest }: TextAreaFieldProps) => {
  const generated = useId()
  const id = rest.name ? `field-${rest.name}` : generated

  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <textarea
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${controlClasses(Boolean(error))} min-h-32 resize-y py-3 ${className}`}
        {...rest}
      />
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
    className="border-l-2 border-signal bg-signal-soft px-4 py-3 text-sm leading-relaxed text-ink"
  >
    {message}
  </p>
)
