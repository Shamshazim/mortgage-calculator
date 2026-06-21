import { useState } from 'react'
import type { CalculationInput } from '../types'

interface FieldState {
  loanAmount: string
  downPayment: string
  annualInterestRate: string
  termYears: string
  extraMonthlyPayment: string
  extraLumpSum: string
  lumpSumMonth: string
}

interface Props {
  initial: CalculationInput
  loading: boolean
  serverFieldErrors?: Record<string, string>
  onCalculate: (input: CalculationInput) => void
}

type FieldKey = keyof FieldState

// Parse a user-typed numeric string, tolerating thousands separators (e.g. "350,000").
// Returns NaN for blank/invalid input.
function parseNumeric(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim()
  if (cleaned === '') return NaN
  return Number(cleaned)
}

// Optional numeric field: blank counts as 0 (valid).
function parseOptional(raw: string): number {
  if (raw.trim() === '') return 0
  return parseNumeric(raw)
}

function validate(values: FieldState): {
  input?: CalculationInput
  errors: Partial<Record<FieldKey, string>>
} {
  const errors: Partial<Record<FieldKey, string>> = {}

  const loanAmount = parseNumeric(values.loanAmount)
  const downPayment = parseNumeric(values.downPayment)
  const annualInterestRate = parseNumeric(values.annualInterestRate)
  const termYears = parseNumeric(values.termYears)
  const extraMonthlyPayment = parseOptional(values.extraMonthlyPayment)
  const extraLumpSum = parseOptional(values.extraLumpSum)
  const lumpSumMonth = values.lumpSumMonth.trim() === '' ? 1 : parseNumeric(values.lumpSumMonth)

  if (values.loanAmount.trim() === '' || Number.isNaN(loanAmount) || loanAmount <= 0) {
    errors.loanAmount = 'Enter a loan amount greater than 0.'
  }
  if (values.downPayment.trim() === '' || Number.isNaN(downPayment) || downPayment < 0) {
    errors.downPayment = 'Enter a down payment of 0 or more.'
  } else if (!errors.loanAmount && downPayment >= loanAmount) {
    errors.downPayment = 'Down payment must be less than the loan amount.'
  }
  if (
    values.annualInterestRate.trim() === '' ||
    Number.isNaN(annualInterestRate) ||
    annualInterestRate < 0 ||
    annualInterestRate > 30
  ) {
    errors.annualInterestRate = 'Enter a rate between 0 and 30.'
  }
  if (
    values.termYears.trim() === '' ||
    Number.isNaN(termYears) ||
    !Number.isInteger(termYears) ||
    termYears < 1 ||
    termYears > 40
  ) {
    errors.termYears = 'Enter a whole number of years (1–40).'
  }

  // Optional prepayment fields.
  if (Number.isNaN(extraMonthlyPayment) || extraMonthlyPayment < 0) {
    errors.extraMonthlyPayment = 'Enter 0 or more.'
  }
  if (Number.isNaN(extraLumpSum) || extraLumpSum < 0) {
    errors.extraLumpSum = 'Enter 0 or more.'
  }
  if (Number.isNaN(lumpSumMonth) || !Number.isInteger(lumpSumMonth) || lumpSumMonth < 1) {
    errors.lumpSumMonth = 'Enter a whole month (1 or more).'
  } else if (!errors.termYears && lumpSumMonth > termYears * 12) {
    errors.lumpSumMonth = `Must be within the ${termYears * 12}-month term.`
  }

  if (Object.keys(errors).length > 0) return { errors }
  return {
    input: {
      loanAmount,
      downPayment,
      annualInterestRate,
      termYears,
      extraMonthlyPayment,
      extraLumpSum,
      lumpSumMonth,
    },
    errors,
  }
}

export default function CalculatorForm({ initial, loading, serverFieldErrors, onCalculate }: Props) {
  const [values, setValues] = useState<FieldState>({
    loanAmount: String(initial.loanAmount),
    downPayment: String(initial.downPayment),
    annualInterestRate: String(initial.annualInterestRate),
    termYears: String(initial.termYears),
    extraMonthlyPayment: initial.extraMonthlyPayment ? String(initial.extraMonthlyPayment) : '',
    extraLumpSum: initial.extraLumpSum ? String(initial.extraLumpSum) : '',
    lumpSumMonth: initial.lumpSumMonth ? String(initial.lumpSumMonth) : '1',
  })
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [touched, setTouched] = useState(false)
  const [showPrepay, setShowPrepay] = useState<boolean>(
    !!(initial.extraMonthlyPayment || initial.extraLumpSum),
  )

  const set = (key: FieldKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    const { input, errors: errs } = validate(values)
    setErrors(errs)
    if (input) onCalculate(input)
  }

  // Show client errors first; fall back to server-reported field errors.
  const fieldError = (key: FieldKey): string | undefined =>
    (touched ? errors[key] : undefined) ?? serverFieldErrors?.[key]

  return (
    <form className="form card" onSubmit={handleSubmit} noValidate>
      <h2 className="panel-heading">Loan details</h2>

      <Field
        id="loanAmount"
        label="Loan amount"
        adornment="$"
        value={values.loanAmount}
        onChange={set('loanAmount')}
        error={fieldError('loanAmount')}
        inputMode="decimal"
      />
      <Field
        id="downPayment"
        label="Down payment"
        adornment="$"
        value={values.downPayment}
        onChange={set('downPayment')}
        error={fieldError('downPayment')}
        inputMode="decimal"
      />
      <Field
        id="annualInterestRate"
        label="Annual interest rate"
        adornment="%"
        adornmentSide="suffix"
        value={values.annualInterestRate}
        onChange={set('annualInterestRate')}
        error={fieldError('annualInterestRate')}
        inputMode="decimal"
      />
      <Field
        id="termYears"
        label="Loan term (years)"
        value={values.termYears}
        onChange={set('termYears')}
        error={fieldError('termYears')}
        placeholder="30"
        inputMode="numeric"
      />

      <div className="prepay">
        <button
          type="button"
          className="prepay-toggle"
          aria-expanded={showPrepay}
          onClick={() => setShowPrepay((s) => !s)}
        >
          <span>Prepayments (optional)</span>
          <span className="prepay-chevron">{showPrepay ? '−' : '+'}</span>
        </button>

        {showPrepay && (
          <div className="prepay-body">
            <p className="prepay-hint">
              See how paying extra shrinks your interest and pays the loan off sooner.
            </p>
            <Field
              id="extraMonthlyPayment"
              label="Extra each month"
              adornment="$"
              value={values.extraMonthlyPayment}
              onChange={set('extraMonthlyPayment')}
              error={fieldError('extraMonthlyPayment')}
              placeholder="0"
              inputMode="decimal"
            />
            <Field
              id="extraLumpSum"
              label="One-time extra payment"
              adornment="$"
              value={values.extraLumpSum}
              onChange={set('extraLumpSum')}
              error={fieldError('extraLumpSum')}
              placeholder="0"
              inputMode="decimal"
            />
            <Field
              id="lumpSumMonth"
              label="Apply one-time payment at month"
              value={values.lumpSumMonth}
              onChange={set('lumpSumMonth')}
              error={fieldError('lumpSumMonth')}
              placeholder="1"
              inputMode="numeric"
            />
          </div>
        )}
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Calculating…' : 'Calculate'}
      </button>
    </form>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  adornment?: string
  adornmentSide?: 'prefix' | 'suffix'
  placeholder?: string
  inputMode?: 'decimal' | 'numeric'
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  adornment,
  adornmentSide = 'prefix',
  placeholder,
  inputMode,
}: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div
        className={
          'input-shell' +
          (adornment ? ` has-${adornmentSide}` : '') +
          (error ? ' has-error' : '')
        }
      >
        {adornment && adornmentSide === 'prefix' && (
          <span className="adornment prefix">{adornment}</span>
        )}
        <input
          id={id}
          className="input"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          inputMode={inputMode}
          aria-invalid={!!error}
          autoComplete="off"
        />
        {adornment && adornmentSide === 'suffix' && (
          <span className="adornment suffix">{adornment}</span>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
