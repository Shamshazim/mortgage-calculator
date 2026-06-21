import { useEffect, useState } from 'react'
import type { CalculationInput, CalculationResult } from './types'
import { calculate, CalculationError } from './api'
import CalculatorForm from './components/CalculatorForm'
import SummaryCards from './components/SummaryCards'
import AmortizationChart from './components/AmortizationChart'
import AmortizationTable from './components/AmortizationTable'

const EXAMPLE: CalculationInput = {
  loanAmount: 350000,
  downPayment: 70000,
  annualInterestRate: 6.5,
  termYears: 30,
}

export default function App() {
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | undefined>(undefined)

  const runCalculation = async (input: CalculationInput) => {
    setLoading(true)
    setError(null)
    setFieldErrors(undefined)
    try {
      const res = await calculate(input)
      setResult(res)
    } catch (e) {
      if (e instanceof CalculationError) {
        setError(e.message)
        setFieldErrors(e.fields)
      } else {
        setError('Something went wrong.')
      }
      // Per UX notes: keep previous results visible on error.
    } finally {
      setLoading(false)
    }
  }

  // Calculate the example on first load so results show immediately.
  useEffect(() => {
    runCalculation(EXAMPLE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="page">
      <header className="site-header">
        <h1 className="brand">Amortize</h1>
        <p className="tagline">See what your mortgage really costs.</p>
      </header>

      <main>
        <section className="calculator-panel">
          <CalculatorForm
            initial={EXAMPLE}
            loading={loading}
            serverFieldErrors={fieldErrors}
            onCalculate={runCalculation}
          />

          <div className="results">
            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}
            {result ? (
              <SummaryCards result={result} />
            ) : (
              !error && <div className="loading-block">Calculating your loan…</div>
            )}
          </div>
        </section>

        {result && (
          <section className="breakdown card">
            <div className="breakdown-head">
              <h2 className="panel-heading">Payment breakdown</h2>
              <p className="breakdown-sub">
                How each payment splits between principal and interest, and how your balance
                falls over time.
                {result.prepayment.active &&
                  ' The dashed line is your balance without extra payments — the gap is what prepaying buys you.'}
              </p>
            </div>
            <AmortizationChart result={result} />
            <h3 className="panel-subheading">Amortization schedule</h3>
            <AmortizationTable schedule={result.schedule} />
          </section>
        )}
      </main>

      <footer className="site-footer">
        <p>Estimates only — figures are rounded for display and exclude taxes and insurance.</p>
      </footer>
    </div>
  )
}
