'use strict';

const db = require('./db');
const { calculate } = require('./amortize');

/**
 * A few realistic saved scenarios so the history has something on first run.
 */
const SAMPLES = [
  { label: '30-year fixed — starter home', loanAmount: 350000, downPayment: 70000, annualInterestRate: 6.5, termYears: 30 },
  { label: '15-year fixed — aggressive payoff', loanAmount: 350000, downPayment: 70000, annualInterestRate: 5.75, termYears: 15 },
  { label: 'Condo — low down payment', loanAmount: 220000, downPayment: 11000, annualInterestRate: 6.875, termYears: 30 },
];

/**
 * Insert sample calculations only if the store is empty.
 */
function ensureSeed() {
  if (db.count() > 0) return;

  // Space out createdAt so the list ordering looks natural.
  const base = Date.now();
  SAMPLES.forEach((s, i) => {
    const result = calculate(s);
    db.insertCalculation({
      label: s.label,
      loanAmount: s.loanAmount,
      downPayment: s.downPayment,
      annualInterestRate: s.annualInterestRate,
      termYears: s.termYears,
      principal: result.principal,
      monthlyPayment: result.monthlyPayment,
      totalInterest: result.totalInterest,
      totalCost: result.totalCost,
      numberOfPayments: result.numberOfPayments,
      schedule: result.schedule,
      createdAt: new Date(base - (SAMPLES.length - i) * 60000).toISOString(),
    });
  });

  // eslint-disable-next-line no-console
  console.log(`[seed] inserted ${SAMPLES.length} sample calculations`);
}

module.exports = { ensureSeed };

// Allow running `npm run seed` directly.
if (require.main === module) {
  ensureSeed();
  console.log('Seed complete.');
}
