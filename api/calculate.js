// Vercel Serverless Function: POST /api/calculate
//
// Recreates the original Express endpoint the frontend depends on. The math is
// the standard fixed-rate amortization formula (verified against the sample
// data in backend/data/amortize.json) extended with optional extra monthly
// payments and a one-time lump sum, mirroring the frontend's own validation.

function parseNumber(value) {
  if (typeof value !== "string") {
    return typeof value === "number" ? value : NaN;
  }
  const cleaned = value.replace(/,/g, "").trim();
  return cleaned === "" ? NaN : Number(cleaned);
}

function parseOptional(value) {
  if (typeof value === "string" && value.trim() === "") return 0;
  if (value === undefined || value === null) return 0;
  return parseNumber(value);
}

// Validate raw (string) input the same way the frontend does, returning a map
// of field -> message. An empty map means the input is valid.
function validate(body) {
  const fields = {};

  const loanAmount = parseNumber(body.loanAmount);
  const downPayment = parseNumber(body.downPayment);
  const annualInterestRate = parseNumber(body.annualInterestRate);
  const termYears = parseNumber(body.termYears);
  const extraMonthlyPayment = parseOptional(body.extraMonthlyPayment);
  const extraLumpSum = parseOptional(body.extraLumpSum);
  const lumpSumRaw = typeof body.lumpSumMonth === "string" ? body.lumpSumMonth : "";
  const lumpSumMonth = lumpSumRaw.trim() === "" ? 1 : parseNumber(body.lumpSumMonth);

  if (isBlank(body.loanAmount) || Number.isNaN(loanAmount) || loanAmount <= 0) {
    fields.loanAmount = "Enter a loan amount greater than 0.";
  }

  if (isBlank(body.downPayment) || Number.isNaN(downPayment) || downPayment < 0) {
    fields.downPayment = "Enter a down payment of 0 or more.";
  } else if (!fields.loanAmount && downPayment >= loanAmount) {
    fields.downPayment = "Down payment must be less than the loan amount.";
  }

  if (
    isBlank(body.annualInterestRate) ||
    Number.isNaN(annualInterestRate) ||
    annualInterestRate < 0 ||
    annualInterestRate > 30
  ) {
    fields.annualInterestRate = "Enter a rate between 0 and 30.";
  }

  if (
    isBlank(body.termYears) ||
    Number.isNaN(termYears) ||
    !Number.isInteger(termYears) ||
    termYears < 1 ||
    termYears > 40
  ) {
    fields.termYears = "Enter a whole number of years (1–40).";
  }

  if (Number.isNaN(extraMonthlyPayment) || extraMonthlyPayment < 0) {
    fields.extraMonthlyPayment = "Enter 0 or more.";
  }

  if (Number.isNaN(extraLumpSum) || extraLumpSum < 0) {
    fields.extraLumpSum = "Enter 0 or more.";
  }

  if (Number.isNaN(lumpSumMonth) || !Number.isInteger(lumpSumMonth) || lumpSumMonth < 1) {
    fields.lumpSumMonth = "Enter a whole month (1 or more).";
  } else if (!fields.termYears && lumpSumMonth > termYears * 12) {
    fields.lumpSumMonth = `Must be within the ${termYears * 12}-month term.`;
  }

  return {
    fields,
    input: {
      loanAmount,
      downPayment,
      annualInterestRate,
      termYears,
      extraMonthlyPayment,
      extraLumpSum,
      lumpSumMonth,
    },
  };
}

function isBlank(value) {
  return typeof value !== "string" || value.trim() === "";
}

function calculate(input) {
  const principal = input.loanAmount - input.downPayment;
  const monthlyRate = input.annualInterestRate / 100 / 12;
  const numberOfPayments = input.termYears * 12;

  let monthlyPayment;
  if (monthlyRate === 0) {
    monthlyPayment = principal / numberOfPayments;
  } else {
    const growth = Math.pow(1 + monthlyRate, numberOfPayments);
    monthlyPayment = (principal * monthlyRate * growth) / (growth - 1);
  }

  const schedule = [];
  let balance = principal;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;

  for (let month = 1; month <= numberOfPayments && balance > 1e-6; month++) {
    const interestPaid = balance * monthlyRate;
    let principalPaid = monthlyPayment - interestPaid + input.extraMonthlyPayment;
    if (month === input.lumpSumMonth) {
      principalPaid += input.extraLumpSum;
    }
    if (principalPaid > balance) {
      principalPaid = balance;
    }
    const payment = interestPaid + principalPaid;
    balance -= principalPaid;
    cumulativePrincipal += principalPaid;
    cumulativeInterest += interestPaid;

    schedule.push({
      month,
      payment,
      principalPaid,
      interestPaid,
      cumulativePrincipal,
      cumulativeInterest,
      remainingBalance: balance < 1e-6 ? 0 : balance,
    });
  }

  return {
    principal,
    monthlyPayment,
    totalInterest: cumulativeInterest,
    totalCost: principal + cumulativeInterest,
    numberOfPayments: schedule.length,
    schedule,
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

  const { fields, input } = validate(body);
  if (Object.keys(fields).length > 0) {
    res.status(400).json({ error: "Please fix the highlighted fields.", fields });
    return;
  }

  try {
    res.status(200).json(calculate(input));
  } catch (err) {
    res.status(500).json({ error: "Something went wrong while calculating." });
  }
}
