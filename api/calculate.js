// Vercel Serverless Function: POST /api/calculate
//
// Ports the authoritative amortization logic from the original Express backend
// (backend/src/amortize.js) so the serverless endpoint matches the contract the
// frontend depends on: it accepts numeric OR numeric-string inputs and returns
// the full result shape ({ input, principal, monthlyPayment, prepayment,
// baseline, accelerated, savings, ...back-compat fields }).

/**
 * Convert a value to a finite number, or null if it can't be.
 * Accepts numbers and numeric strings; rejects '', null, undefined, NaN, Infinity.
 */
function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Parse an optional non-negative number. Blank/missing -> 0. Invalid/negative -> false. */
function optionalNonNegative(v) {
  if (v === undefined || v === null || v === "") return 0;
  const n = toNumber(v);
  if (n === null || n < 0) return false;
  return n;
}

/**
 * Validate a calculation input object.
 * Returns { valid: true, value } on success or { valid: false, error, fields } on failure.
 */
function validateInput(body) {
  const fields = {};
  const out = {};

  if (body == null || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object.", fields: {} };
  }

  // loanAmount: required, number, > 0
  const loanAmount = toNumber(body.loanAmount);
  if (loanAmount === null) {
    fields.loanAmount = "Loan amount is required and must be a number.";
  } else if (!(loanAmount > 0)) {
    fields.loanAmount = "Loan amount must be greater than 0.";
  } else {
    out.loanAmount = loanAmount;
  }

  // downPayment: required, number, >= 0, < loanAmount
  const downPayment = toNumber(body.downPayment);
  if (downPayment === null) {
    fields.downPayment = "Down payment is required and must be a number.";
  } else if (downPayment < 0) {
    fields.downPayment = "Down payment cannot be negative.";
  } else if (loanAmount !== null && loanAmount > 0 && downPayment >= loanAmount) {
    fields.downPayment = "Down payment must be less than the loan amount.";
  } else {
    out.downPayment = downPayment;
  }

  // annualInterestRate: required, number, >= 0, <= 30
  const annualInterestRate = toNumber(body.annualInterestRate);
  if (annualInterestRate === null) {
    fields.annualInterestRate = "Interest rate is required and must be a number.";
  } else if (annualInterestRate < 0) {
    fields.annualInterestRate = "Interest rate cannot be negative.";
  } else if (annualInterestRate > 30) {
    fields.annualInterestRate = "Interest rate must be 30% or less.";
  } else {
    out.annualInterestRate = annualInterestRate;
  }

  // termYears: required, integer, 1..40
  const termYears = toNumber(body.termYears);
  if (termYears === null) {
    fields.termYears = "Loan term is required and must be a number.";
  } else if (!Number.isInteger(termYears)) {
    fields.termYears = "Loan term must be a whole number of years.";
  } else if (termYears < 1 || termYears > 40) {
    fields.termYears = "Loan term must be between 1 and 40 years.";
  } else {
    out.termYears = termYears;
  }

  // --- Optional prepayment fields (all default to "no prepayment") ---

  const extraMonthly = optionalNonNegative(body.extraMonthlyPayment);
  if (extraMonthly === false) {
    fields.extraMonthlyPayment = "Extra monthly payment must be a number of 0 or more.";
  } else {
    out.extraMonthlyPayment = extraMonthly;
  }

  const lump = optionalNonNegative(body.extraLumpSum);
  if (lump === false) {
    fields.extraLumpSum = "One-time extra payment must be a number of 0 or more.";
  } else {
    out.extraLumpSum = lump;
  }

  // lumpSumMonth: optional integer >= 1, within the term. Defaults to 1.
  let lumpSumMonth = 1;
  if (body.lumpSumMonth !== undefined && body.lumpSumMonth !== null && body.lumpSumMonth !== "") {
    const m = toNumber(body.lumpSumMonth);
    if (m === null || !Number.isInteger(m) || m < 1) {
      fields.lumpSumMonth = "Lump-sum month must be a whole number of 1 or more.";
    } else {
      lumpSumMonth = m;
    }
  }
  if (!fields.lumpSumMonth && out.termYears && lumpSumMonth > out.termYears * 12) {
    fields.lumpSumMonth = `Lump-sum month must fall within the ${out.termYears * 12}-month term.`;
  }
  if (!fields.lumpSumMonth) out.lumpSumMonth = lumpSumMonth;

  if (Object.keys(fields).length > 0) {
    return { valid: false, error: "Please fix the highlighted fields.", fields };
  }

  return { valid: true, value: out };
}

/**
 * Build the standard (baseline) amortization schedule — the contractual payoff with
 * no extra payments. Runs exactly `n` months and lands precisely at a zero balance.
 */
function buildBaseline(principal, r, monthlyPayment, n) {
  const schedule = [];
  let balance = principal;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;
  let totalPaid = 0;

  for (let month = 1; month <= n; month++) {
    const interestPaid = balance * r;
    let principalPaid = monthlyPayment - interestPaid;
    let payment = monthlyPayment;

    if (month === n) {
      principalPaid = balance; // pay off any rounding remainder on the last month
      payment = principalPaid + interestPaid;
    }

    balance -= principalPaid;
    if (balance < 0) balance = 0;

    cumulativePrincipal += principalPaid;
    cumulativeInterest += interestPaid;
    totalPaid += payment;

    schedule.push({
      month,
      payment,
      principalPaid,
      interestPaid,
      cumulativePrincipal,
      cumulativeInterest,
      remainingBalance: balance,
    });
  }

  return { schedule, totalInterest: totalPaid - principal, totalCost: totalPaid, numberOfPayments: n };
}

/**
 * Build an accelerated schedule that applies extra payments and stops as soon as the
 * loan is paid off.
 */
function buildAccelerated(principal, r, monthlyPayment, n, extraMonthly, lump, lumpSumMonth) {
  const schedule = [];
  let balance = principal;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;
  let totalPaid = 0;

  const cap = n + 1; // safety bound — accelerated can never exceed the scheduled term
  let month = 0;

  while (balance > 1e-9 && month < cap) {
    month++;
    const interestPaid = balance * r;
    const lumpThisMonth = month === lumpSumMonth ? lump : 0;

    let principalPaid = monthlyPayment - interestPaid + extraMonthly + lumpThisMonth;
    if (principalPaid < 0) principalPaid = 0;
    if (principalPaid > balance) principalPaid = balance;

    const payment = interestPaid + principalPaid;

    balance -= principalPaid;
    if (balance < 0) balance = 0;

    cumulativePrincipal += principalPaid;
    cumulativeInterest += interestPaid;
    totalPaid += payment;

    schedule.push({
      month,
      payment,
      principalPaid,
      interestPaid,
      cumulativePrincipal,
      cumulativeInterest,
      remainingBalance: balance,
    });
  }

  return { schedule, totalInterest: totalPaid - principal, totalCost: totalPaid, numberOfPayments: schedule.length };
}

/**
 * Compute the full amortization result for a validated input, including the baseline
 * schedule, the accelerated schedule (if any prepayments were supplied), and savings.
 */
function calculate(input) {
  const { loanAmount, downPayment, annualInterestRate, termYears } = input;
  const extraMonthlyPayment = input.extraMonthlyPayment || 0;
  const extraLumpSum = input.extraLumpSum || 0;
  const lumpSumMonth = input.lumpSumMonth || 1;

  const principal = loanAmount - downPayment;
  const r = annualInterestRate / 100 / 12;
  const n = termYears * 12;

  let monthlyPayment;
  if (r > 0) {
    const pow = Math.pow(1 + r, n);
    monthlyPayment = (principal * r * pow) / (pow - 1);
  } else {
    monthlyPayment = principal / n;
  }

  const baseline = buildBaseline(principal, r, monthlyPayment, n);

  const active = extraMonthlyPayment > 0 || extraLumpSum > 0;
  const accelerated = active
    ? buildAccelerated(principal, r, monthlyPayment, n, extraMonthlyPayment, extraLumpSum, lumpSumMonth)
    : baseline;

  const savings = {
    interestSaved: Math.max(0, baseline.totalInterest - accelerated.totalInterest),
    monthsSaved: Math.max(0, baseline.numberOfPayments - accelerated.numberOfPayments),
  };

  return {
    principal,
    monthlyPayment, // contractual minimum monthly payment (unchanged by prepayment)
    prepayment: { extraMonthlyPayment, extraLumpSum, lumpSumMonth, active },
    baseline,
    accelerated,
    savings,
    // Back-compat top-level fields mirror the realized (accelerated) outcome.
    totalInterest: accelerated.totalInterest,
    totalCost: accelerated.totalCost,
    numberOfPayments: accelerated.numberOfPayments,
    schedule: accelerated.schedule,
  };
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Invalid JSON body." });
      return;
    }
  }
  if (!body || typeof body !== "object") {
    body = {};
  }

  const v = validateInput(body);
  if (!v.valid) {
    res.status(400).json({ error: v.error, fields: v.fields });
    return;
  }

  try {
    const result = calculate(v.value);
    res.status(200).json({ input: v.value, ...result });
  } catch {
    res.status(500).json({ error: "Something went wrong while calculating." });
  }
}
