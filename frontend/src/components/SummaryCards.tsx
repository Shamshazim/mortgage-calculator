import type { CalculationResult } from '../types'
import { formatCurrency, formatMonths } from '../format'
import AnimatedNumber from './AnimatedNumber'

interface Props {
  result: CalculationResult
}

export default function SummaryCards({ result }: Props) {
  const { prepayment, baseline, accelerated, savings, monthlyPayment } = result
  const active = prepayment.active
  const effectiveMonthly = monthlyPayment + prepayment.extraMonthlyPayment

  return (
    <div className="summary">
      {active && (savings.interestSaved > 0 || savings.monthsSaved > 0) && (
        <div className="savings-banner" role="status">
          <span className="savings-spark">▲</span>
          <div className="savings-text">
            <strong>
              You save <AnimatedNumber value={savings.interestSaved} format={formatCurrency} /> in
              interest
            </strong>{' '}
            and pay the loan off <strong>{formatMonths(savings.monthsSaved)}</strong> sooner — debt-free
            in {formatMonths(accelerated.numberOfPayments)} instead of{' '}
            {formatMonths(baseline.numberOfPayments)}.
          </div>
        </div>
      )}

      <div className="summary-grid">
        <div className="summary-card hero accent-tint">
          <span className="summary-label">Monthly payment</span>
          <span className="summary-value hero-value">
            <AnimatedNumber value={monthlyPayment} format={formatCurrency} />
          </span>
          <span className="summary-sub">
            {active && prepayment.extraMonthlyPayment > 0
              ? `+ ${formatCurrency(prepayment.extraMonthlyPayment)} extra = ${formatCurrency(
                  effectiveMonthly,
                )}/mo`
              : 'Required each month'}
          </span>
        </div>

        <div className="summary-card interest-tint">
          <span className="summary-label">Total interest paid</span>
          <span className="summary-value">
            <AnimatedNumber value={accelerated.totalInterest} format={formatCurrency} />
          </span>
          {active && savings.interestSaved > 0 && (
            <span className="summary-sub">
              <span className="was">{formatCurrency(baseline.totalInterest)}</span>
              <span className="saved">−{formatCurrency(savings.interestSaved)}</span>
            </span>
          )}
        </div>

        <div className="summary-card">
          <span className="summary-label">Total cost of loan</span>
          <span className="summary-value">
            <AnimatedNumber value={accelerated.totalCost} format={formatCurrency} />
          </span>
          {active && baseline.totalCost - accelerated.totalCost > 0 && (
            <span className="summary-sub">
              <span className="was">{formatCurrency(baseline.totalCost)}</span>
              <span className="saved">−{formatCurrency(baseline.totalCost - accelerated.totalCost)}</span>
            </span>
          )}
        </div>

        <div className="summary-card">
          <span className="summary-label">Time to pay off</span>
          <span className="summary-value">{formatMonths(accelerated.numberOfPayments)}</span>
          {active && savings.monthsSaved > 0 ? (
            <span className="summary-sub">
              <span className="was">{formatMonths(baseline.numberOfPayments)}</span>
              <span className="saved">−{formatMonths(savings.monthsSaved)}</span>
            </span>
          ) : (
            <span className="summary-sub">{accelerated.numberOfPayments} payments</span>
          )}
        </div>
      </div>
    </div>
  )
}
