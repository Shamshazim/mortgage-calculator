# API.md — Amortize Backend Contract

Base URL (dev): `http://localhost:3001`. The Vite dev server proxies `/api/*` here.
All requests and responses are JSON. CORS is enabled for local dev.

The core flow needs only **`POST /api/calculate`**. The remaining `/api/calculations`
endpoints provide an optional saved-history feature (the DB-backed extra the conventions
require); the frontend may use them or ignore them.

---

## Data shapes

### CalculationInput (request body)
```jsonc
{
  "loanAmount": 350000,          // number, > 0           (required)
  "downPayment": 70000,          // number, >= 0, < loanAmount (required)
  "annualInterestRate": 6.5,     // number, >= 0, <= 30   (required, percent e.g. 6.5)
  "termYears": 30                // integer, 1..40        (required)
}
```

### ScheduleRow
```jsonc
{
  "month": 1,                    // 1-based payment number
  "payment": 1769.79,            // full-precision; frontend rounds for display
  "principalPaid": 252.46,
  "interestPaid": 1517.33,
  "cumulativePrincipal": 252.46,
  "cumulativeInterest": 1517.33,
  "remainingBalance": 279747.54
}
```
The final row's `remainingBalance` is exactly `0` and its `payment` is adjusted for
rounding so the loan pays off precisely.

### CalculationResult
```jsonc
{
  "principal": 280000,           // amount financed = loanAmount - downPayment
  "monthlyPayment": 1769.79,
  "totalInterest": 357124.57,
  "totalCost": 637124.57,        // total paid over the loan (principal + interest)
  "numberOfPayments": 360,
  "schedule": [ /* ScheduleRow, length = numberOfPayments */ ]
}
```

### Error body
```jsonc
{
  "error": "Please fix the highlighted fields.",
  "fields": {                    // present only for field-level validation errors
    "downPayment": "Down payment must be less than the loan amount."
  }
}
```

---

## Endpoints

### `GET /api/health`
Liveness check.

- **200** → `{ "ok": true }`

---

### `POST /api/calculate`
Compute an amortization schedule. **Stateless — does not persist.** This is the
endpoint the calculator UI calls on every submit.

- **Request body:** `CalculationInput`
- **200** → `CalculationResult` plus an `input` echo of the validated values:
  ```jsonc
  { "input": { "loanAmount": 350000, "downPayment": 70000, "annualInterestRate": 6.5, "termYears": 30 },
    "principal": 280000, "monthlyPayment": 1769.79, "totalInterest": 357124.57,
    "totalCost": 637124.57, "numberOfPayments": 360, "schedule": [ ... ] }
  ```
- **400** → error body (with `fields`) when validation fails, or
  `{ "error": "Invalid JSON in request body." }` when the body isn't valid JSON.

**Validation rules**
| Field | Rule |
|-------|------|
| `loanAmount` | required, number, `> 0` |
| `downPayment` | required, number, `>= 0`, `< loanAmount` |
| `annualInterestRate` | required, number, `>= 0`, `<= 30` |
| `termYears` | required, integer, `1..40` |

Numeric strings (e.g. `"350000"`) are accepted and coerced; empty string / null are rejected.

---

### `POST /api/calculations`
Compute **and save** the calculation to history.

- **Request body:** `CalculationInput` plus optional `"label": string` (≤120 chars).
- **201** → the saved record:
  ```jsonc
  { "id": 4, "label": "30-year fixed", "loanAmount": 350000, "downPayment": 70000,
    "annualInterestRate": 6.5, "termYears": 30, "principal": 280000,
    "monthlyPayment": 1769.79, "totalInterest": 357124.57, "totalCost": 637124.57,
    "numberOfPayments": 360, "schedule": [ ... ], "createdAt": "2026-06-20T10:00:00.000Z" }
  ```
- **400** → validation error body (same rules as `/api/calculate`).

---

### `GET /api/calculations`
List saved calculations, **newest first**. Schedules are omitted to keep the payload small.

- **200** → array of saved records **without** the `schedule` field:
  ```jsonc
  [ { "id": 3, "label": "Condo — low down payment", "loanAmount": 220000,
      "downPayment": 11000, "annualInterestRate": 6.875, "termYears": 30,
      "principal": 209000, "monthlyPayment": 1373.10, "totalInterest": 285315.92,
      "totalCost": 494315.92, "numberOfPayments": 360, "createdAt": "..." } ]
  ```

---

### `GET /api/calculations/:id`
Fetch one saved calculation **including** its full `schedule`.

- **200** → saved record (same shape as the `POST /api/calculations` 201 response).
- **400** → `{ "error": "Invalid calculation id." }` if `:id` isn't a positive integer.
- **404** → `{ "error": "Calculation not found." }`.

---

### `DELETE /api/calculations/:id`
Remove a saved calculation.

- **204** → no content, on success.
- **400** → `{ "error": "Invalid calculation id." }`.
- **404** → `{ "error": "Calculation not found." }`.

---

## Notes for integration
- Money values are returned **full-precision**; the frontend formats to `$` with 2 decimals
  and `tabular-nums` (per UX_NOTES.md).
- Unknown `/api/*` routes return **404** `{ "error": "Not found." }`.
- **Persistence:** SQLite via `better-sqlite3` when its native build is available; otherwise
  the server automatically falls back to a JSON-file store (`backend/data/`). Behavior and
  responses are identical either way. On this machine (Node 26) the JSON fallback is active.
- On first run the store is **seeded** with 3 realistic sample calculations.

---

## Update — Prepayment modeling (extra payments)

`POST /api/calculate` and `POST /api/calculations` now accept **optional** prepayment fields and return both a baseline and an accelerated scenario plus the resulting savings. Omitting these fields preserves the original behavior exactly.

### Additional request fields (all optional)

| Field | Type | Default | Rules |
|-------|------|---------|-------|
| `extraMonthlyPayment` | number | `0` | ≥ 0. Added to every monthly payment. |
| `extraLumpSum` | number | `0` | ≥ 0. One-time extra payment. |
| `lumpSumMonth` | integer | `1` | ≥ 1 and ≤ `termYears*12`. Month the lump sum is applied. |

### Additional response fields

```jsonc
{
  "monthlyPayment": 1769.79,            // contractual minimum (unchanged by prepayment)
  "prepayment": { "extraMonthlyPayment": 200, "extraLumpSum": 0, "lumpSumMonth": 1, "active": true },
  "baseline":    { "totalInterest": 357124.57, "totalCost": 637124.57, "numberOfPayments": 360, "schedule": [ /* ScheduleRow[] */ ] },
  "accelerated": { "totalInterest": 255841.38, "totalCost": 535841.38, "numberOfPayments": 273, "schedule": [ /* ScheduleRow[] */ ] },
  "savings":     { "interestSaved": 101283.19, "monthsSaved": 87 },

  // Back-compat: top-level totalInterest / totalCost / numberOfPayments / schedule
  // mirror the realized (accelerated) outcome.
  "totalInterest": 255841.38,
  "totalCost": 535841.38,
  "numberOfPayments": 273,
  "schedule": [ /* ScheduleRow[] */ ]
}
```

When no prepayment is supplied, `accelerated` equals `baseline` and `savings` is all zeros.
