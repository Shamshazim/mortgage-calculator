'use strict';

const express = require('express');
const { validateInput, calculate } = require('../amortize');
const db = require('../db');

const router = express.Router();

/**
 * POST /api/calculate
 * Compute an amortization schedule. Stateless — does NOT persist.
 */
router.post('/calculate', (req, res) => {
  const v = validateInput(req.body);
  if (!v.valid) {
    return res.status(400).json({ error: v.error, fields: v.fields });
  }
  const result = calculate(v.value);
  return res.json({ input: v.value, ...result });
});

/**
 * POST /api/calculations
 * Compute AND save the calculation to history. Returns the saved record.
 */
router.post('/calculations', (req, res) => {
  const v = validateInput(req.body);
  if (!v.valid) {
    return res.status(400).json({ error: v.error, fields: v.fields });
  }
  const result = calculate(v.value);
  const label = typeof req.body.label === 'string' && req.body.label.trim()
    ? req.body.label.trim().slice(0, 120)
    : null;

  const saved = db.insertCalculation({
    label,
    ...v.value,
    principal: result.principal,
    monthlyPayment: result.monthlyPayment,
    totalInterest: result.totalInterest,
    totalCost: result.totalCost,
    numberOfPayments: result.numberOfPayments,
    schedule: result.schedule,
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json(saved);
});

/**
 * GET /api/calculations
 * List saved calculations (newest first), without schedules.
 */
router.get('/calculations', (req, res) => {
  return res.json(db.listCalculations());
});

/**
 * GET /api/calculations/:id
 * Fetch a single saved calculation including its full schedule.
 */
router.get('/calculations/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid calculation id.' });
  }
  const row = db.getCalculation(id);
  if (!row) {
    return res.status(404).json({ error: 'Calculation not found.' });
  }
  return res.json(row);
});

/**
 * DELETE /api/calculations/:id
 * Remove a saved calculation.
 */
router.delete('/calculations/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid calculation id.' });
  }
  const removed = db.deleteCalculation(id);
  if (!removed) {
    return res.status(404).json({ error: 'Calculation not found.' });
  }
  return res.status(204).end();
});

module.exports = router;
