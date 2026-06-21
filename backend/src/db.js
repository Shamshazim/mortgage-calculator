'use strict';

/**
 * Persistence layer for Amortize.
 *
 * Stores a history of saved calculations. Uses better-sqlite3 when its native
 * binary is available; otherwise transparently falls back to a JSON-file store
 * so the app still runs on a clean machine.
 *
 * Public API (identical for both backends):
 *   insertCalculation(record) -> savedRecord (with id, createdAt)
 *   listCalculations()        -> array of records (newest first), without schedule
 *   getCalculation(id)        -> record (with schedule) or undefined
 *   deleteCalculation(id)     -> boolean (true if a row was removed)
 *   count()                   -> number of stored records
 */

const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SQLITE_PATH = path.join(DATA_DIR, 'amortize.db');
const JSON_PATH = path.join(DATA_DIR, 'amortize.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

let impl;
let backend;

try {
  impl = createSqliteBackend();
  backend = 'sqlite';
} catch (err) {
  // Native build unavailable — fall back to JSON file store.
  // Keep this calm: it's an expected, supported path, not a crash.
  // eslint-disable-next-line no-console
  console.info('[db] better-sqlite3 unavailable — using JSON store.');
  impl = createJsonBackend();
  backend = 'json';
}

function createSqliteBackend() {
  // This throw is caught above if the native module fails to load/build.
  const Database = require('better-sqlite3');
  const db = new Database(SQLITE_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS calculations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT,
      loanAmount REAL NOT NULL,
      downPayment REAL NOT NULL,
      annualInterestRate REAL NOT NULL,
      termYears INTEGER NOT NULL,
      principal REAL NOT NULL,
      monthlyPayment REAL NOT NULL,
      totalInterest REAL NOT NULL,
      totalCost REAL NOT NULL,
      numberOfPayments INTEGER NOT NULL,
      schedule TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  const insertStmt = db.prepare(`
    INSERT INTO calculations
      (label, loanAmount, downPayment, annualInterestRate, termYears,
       principal, monthlyPayment, totalInterest, totalCost, numberOfPayments,
       schedule, createdAt)
    VALUES
      (@label, @loanAmount, @downPayment, @annualInterestRate, @termYears,
       @principal, @monthlyPayment, @totalInterest, @totalCost, @numberOfPayments,
       @schedule, @createdAt)
  `);

  const listStmt = db.prepare(`
    SELECT id, label, loanAmount, downPayment, annualInterestRate, termYears,
           principal, monthlyPayment, totalInterest, totalCost, numberOfPayments,
           createdAt
    FROM calculations
    ORDER BY id DESC
  `);

  const getStmt = db.prepare(`SELECT * FROM calculations WHERE id = ?`);
  const deleteStmt = db.prepare(`DELETE FROM calculations WHERE id = ?`);
  const countStmt = db.prepare(`SELECT COUNT(*) AS c FROM calculations`);

  return {
    insertCalculation(record) {
      const row = {
        label: record.label ?? null,
        loanAmount: record.loanAmount,
        downPayment: record.downPayment,
        annualInterestRate: record.annualInterestRate,
        termYears: record.termYears,
        principal: record.principal,
        monthlyPayment: record.monthlyPayment,
        totalInterest: record.totalInterest,
        totalCost: record.totalCost,
        numberOfPayments: record.numberOfPayments,
        schedule: JSON.stringify(record.schedule),
        createdAt: record.createdAt,
      };
      const info = insertStmt.run(row);
      return this.getCalculation(info.lastInsertRowid);
    },
    listCalculations() {
      return listStmt.all();
    },
    getCalculation(id) {
      const row = getStmt.get(id);
      if (!row) return undefined;
      return { ...row, schedule: JSON.parse(row.schedule) };
    },
    deleteCalculation(id) {
      const info = deleteStmt.run(id);
      return info.changes > 0;
    },
    count() {
      return countStmt.get().c;
    },
  };
}

function createJsonBackend() {
  let state = { nextId: 1, rows: [] };

  if (fs.existsSync(JSON_PATH)) {
    try {
      state = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    } catch {
      state = { nextId: 1, rows: [] };
    }
  }

  function persist() {
    fs.writeFileSync(JSON_PATH, JSON.stringify(state, null, 2));
  }

  return {
    insertCalculation(record) {
      const row = {
        id: state.nextId++,
        label: record.label ?? null,
        loanAmount: record.loanAmount,
        downPayment: record.downPayment,
        annualInterestRate: record.annualInterestRate,
        termYears: record.termYears,
        principal: record.principal,
        monthlyPayment: record.monthlyPayment,
        totalInterest: record.totalInterest,
        totalCost: record.totalCost,
        numberOfPayments: record.numberOfPayments,
        schedule: record.schedule,
        createdAt: record.createdAt,
      };
      state.rows.push(row);
      persist();
      return JSON.parse(JSON.stringify(row));
    },
    listCalculations() {
      return state.rows
        .slice()
        .sort((a, b) => b.id - a.id)
        .map((r) => {
          // omit schedule from list view
          const { schedule, ...rest } = r;
          return rest;
        });
    },
    getCalculation(id) {
      const row = state.rows.find((r) => r.id === Number(id));
      return row ? JSON.parse(JSON.stringify(row)) : undefined;
    },
    deleteCalculation(id) {
      const idx = state.rows.findIndex((r) => r.id === Number(id));
      if (idx === -1) return false;
      state.rows.splice(idx, 1);
      persist();
      return true;
    },
    count() {
      return state.rows.length;
    },
  };
}

module.exports = {
  ...impl,
  backend,
  insertCalculation: (r) => impl.insertCalculation(r),
  listCalculations: () => impl.listCalculations(),
  getCalculation: (id) => impl.getCalculation(id),
  deleteCalculation: (id) => impl.deleteCalculation(id),
  count: () => impl.count(),
};
