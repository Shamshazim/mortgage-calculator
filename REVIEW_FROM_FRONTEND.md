# REVIEW_FROM_FRONTEND.md — Amortize backend

Reviewed by the Frontend agent against API.md, the backend code, and what the UI
actually consumes. I verified behavior by running the server and exercising
`/api/calculate` with valid, invalid, edge-case, and malformed-JSON requests.

## Verdict: Solid — ship it.

The backend matches API.md and the documented contract precisely. Every shape the
UI depends on is correct, and the response keys line up with my code with zero
adaptation. The calculator is fully wired and working against the real API.

### What I verified works
- `GET /api/health` → `{ "ok": true }`. ✓
- `POST /api/calculate` returns `{ input, principal, monthlyPayment, totalInterest,
  totalCost, numberOfPayments, schedule[] }` — exactly my `CalculationResult` type.
  Numbers are full-precision and the frontend formats them. ✓
- Each `ScheduleRow` has `month, payment, principalPaid, interestPaid,
  cumulativePrincipal, cumulativeInterest, remainingBalance` — drives both the
  Recharts stacked areas + balance line and the table directly. ✓
- Final row lands at `remainingBalance: 0` with an adjusted final payment (confirmed
  on both interest-bearing and **zero-rate** loans). The chart and table close out
  cleanly with no negative drift. ✓
- **Validation errors**: 400 with `{ error, fields }` where `fields` is keyed by the
  exact field names my form uses (`loanAmount`, `downPayment`, `annualInterestRate`,
  `termYears`). My form maps these straight onto the offending inputs — no key
  translation needed. ✓
- **Malformed JSON**: 400 `{ "error": "Invalid JSON in request body." }` with no
  `fields` — my error handler shows the banner and skips field highlighting. ✓
- **Empty body**: returns all four field errors (treated as missing). The UI never
  sends this because of client-side validation, but it degrades gracefully. ✓
- CORS enabled; unknown `/api/*` → 404 JSON. (UI uses the Vite proxy, so same-origin
  in dev — not strictly needed, but correct.)

## Minor notes (optional, non-blocking)

1. **Field error wording differs slightly from API.md examples.** API.md shows
   `"Down payment must be less than the loan amount."` — the live server returns that
   exact string, so we're good. Other messages (e.g. interest cap, term range) are
   sensibly worded but not quoted in API.md. The UI displays whatever the server
   sends verbatim, so no action required; just noting the doc only samples one message.

2. **Numeric-string coercion is one-directional in the echo.** `input` echoes the
   *coerced* numbers (e.g. `"350000"` → `350000`), which is what the UI wants. No issue
   — flagging only so the backend keeps echoing coerced (not raw) values; the UI relies
   on `input` being real numbers if it ever re-displays them.

3. **History endpoints (`/api/calculations*`) are correct but unused by the MVP UI.**
   DESIGN scopes out saving, so the calculator ignores them. They look right (newest-
   first list omits `schedule`, detail includes it, proper 400/404/204) should we ever
   surface a history feature. No change needed.

Nothing here blocks the frontend. The contract is clean and the integration is done.
