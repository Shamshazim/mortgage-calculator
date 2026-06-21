export interface CalculationInput {
  loanAmount: number
  downPayment: number
  annualInterestRate: number
  termYears: number
  // Optional prepayments — default to 0 / no prepayment.
  extraMonthlyPayment?: number
  extraLumpSum?: number
  lumpSumMonth?: number
}

export interface ScheduleRow {
  month: number
  payment: number
  principalPaid: number
  interestPaid: number
  cumulativePrincipal: number
  cumulativeInterest: number
  remainingBalance: number
}

/** One payoff scenario (baseline or accelerated). */
export interface Scenario {
  totalInterest: number
  totalCost: number
  numberOfPayments: number
  schedule: ScheduleRow[]
}

export interface Prepayment {
  extraMonthlyPayment: number
  extraLumpSum: number
  lumpSumMonth: number
  active: boolean
}

export interface Savings {
  interestSaved: number
  monthsSaved: number
}

export interface CalculationResult {
  input: CalculationInput
  principal: number
  monthlyPayment: number
  prepayment: Prepayment
  baseline: Scenario
  accelerated: Scenario
  savings: Savings
  // Back-compat top-level fields mirror the realized (accelerated) outcome.
  totalInterest: number
  totalCost: number
  numberOfPayments: number
  schedule: ScheduleRow[]
}

export interface ApiError {
  error: string
  fields?: Record<string, string>
}
