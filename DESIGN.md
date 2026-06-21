# DESIGN.md — Amortize

## Vision
**Amortize** is a clean, instant mortgage calculator that turns four simple inputs into a clear financial picture: what you'll pay each month, how much interest you'll hand over, the true total cost of the loan, and a month-by-month breakdown of how each payment splits between principal and interest. It answers "what does this loan actually cost me?" at a glance, then lets the curious dig into the full schedule and watch principal overtake interest over the life of the loan.

## Target user
A prospective or current homebuyer (or anyone comparing loan offers) who is financially literate but not a spreadsheet wizard. They want a fast, trustworthy answer and a visual they can understand without reading a manual.

## MVP scope (deliberately small)
A single-page app. No accounts, no saving, no login. Enter inputs, see results recalculated on submit. One backend endpoint does the math and returns the schedule; the frontend renders summary cards, a chart, and a table.

### Features
1. **Input form** — loan amount, annual interest rate, loan term (years), down payment.
2. **Summary outputs** — monthly payment, total interest paid, total cost of loan, and (derived) loan principal = loan amount − down payment.
3. **Amortization chart** — line/area chart showing remaining balance, and principal-vs-interest portions over time.
4. **Amortization table** — full month-by-month schedule (payment #, payment date optional, principal paid, interest paid, remaining balance).
5. **Sensible validation & empty/error states.**

### Explicitly out of scope (MVP)
- Extra/early payments, PMI, property tax, insurance, HOA.
- Saving/sharing scenarios, comparison of multiple loans.
- Authentication, multi-currency, localization.
- Bi-weekly or custom payment frequencies (monthly only).

## Core user flow
1. User lands on the page; the form is pre-filled with a realistic example (so results show immediately).
2. User edits any field and clicks **Calculate** (or presses Enter).
3. Frontend POSTs inputs to the backend; backend validates and returns summary + full schedule.
4. Summary cards animate to new values; chart and table update.
5. User scrolls to explore the chart and scans/expands the table.
6. Invalid input (e.g., down payment ≥ loan amount, rate < 0) shows an inline error and no results change.

## The math (authoritative — backend implements this)
Let:
- `principal P = loanAmount − downPayment`
- `monthlyRate r = (annualInterestRate / 100) / 12`
- `n = termYears × 12` (total number of monthly payments)

Monthly payment:
- If `r > 0`: `M = P · r · (1 + r)^n / ((1 + r)^n − 1)`
- If `r == 0`: `M = P / n`

For each month `k` from 1..n:
- `interest_k = balance · r`
- `principal_k = M − interest_k`
- `balance = balance − principal_k` (clamp final balance to 0; adjust final payment for rounding so balance ends exactly at 0)

Totals:
- `totalPaid = M × n` (use summed actual payments to avoid rounding drift)
- `totalInterest = totalPaid − P`
- `totalCost = totalPaid` (this is total paid over the loan; principal + interest)

All monetary outputs rounded to cents for display; backend returns full-precision numbers and the frontend formats.

## Screens / pages
Single page (`/`) with three stacked regions inside a centered column:

### 1. Header
- App name "Amortize" + one-line tagline.

### 2. Calculator panel (two-column on desktop, stacked on mobile)
- **Left: Input form**
  - Loan amount (currency input)
  - Down payment (currency input)
  - Annual interest rate (% input, supports decimals)
  - Loan term in years (number input; common values 15/30)
  - "Calculate" primary button
  - Inline validation messages under offending fields
- **Right: Summary cards** (2×2 grid)
  - Monthly Payment (hero/emphasized)
  - Total Interest Paid
  - Total Cost of Loan
  - Loan Principal (amount financed)

### 3. Breakdown section
- **Chart**: x-axis = time (months/years), showing remaining balance over time plus a visual of principal vs interest. Default view shows cumulative principal paid vs cumulative interest paid as two areas, with remaining balance as a line.
- **Table**: month-by-month schedule. Columns: #, Payment, Principal, Interest, Remaining Balance. Scrollable with a sticky header; optionally collapsed to first 12 rows with a "Show all" toggle to keep the page light.

## Data entities
No persistence required for MVP. The "entities" are request/response shapes (see API.md for the wire contract).

- **CalculationInput**
  - `loanAmount: number` (> 0)
  - `downPayment: number` (>= 0, < loanAmount)
  - `annualInterestRate: number` (>= 0, e.g. 6.5)
  - `termYears: number` (integer 1..40)

- **CalculationResult**
  - `principal: number` (amount financed)
  - `monthlyPayment: number`
  - `totalInterest: number`
  - `totalCost: number`
  - `numberOfPayments: number`
  - `schedule: ScheduleRow[]`

- **ScheduleRow**
  - `month: number` (1-based)
  - `payment: number`
  - `principalPaid: number`
  - `interestPaid: number`
  - `cumulativePrincipal: number`
  - `cumulativeInterest: number`
  - `remainingBalance: number`

## Validation rules (shared)
- `loanAmount` required, number, > 0.
- `downPayment` required, number, >= 0, must be < `loanAmount`.
- `annualInterestRate` required, number, >= 0, <= 30 (sane cap).
- `termYears` required, integer, 1..40.
- On failure backend returns HTTP 400 with `{ error: string, fields?: {field: message} }`.

## Success criteria
- Loads with example values already calculated.
- Recalculates correctly (numbers match a known amortization calculator within rounding).
- Chart and table reflect the current result.
- Runs on a clean machine with Node + npm via the documented dev commands.
