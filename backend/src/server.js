'use strict';

const express = require('express');
const cors = require('cors');

const db = require('./db');
const { ensureSeed } = require('./seed');
const calculationsRouter = require('./routes/calculations');

const PORT = 3001;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api', calculationsRouter);

// JSON 404 for unknown API routes.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Centralized error handler — always JSON.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body.' });
  }
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Seed sample data on first run, then start.
ensureSeed();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Amortize backend listening on http://localhost:${PORT} (db: ${db.backend})`);
});

module.exports = app;
