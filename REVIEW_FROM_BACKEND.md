# REVIEW_FROM_BACKEND.md — Frontend ↔ API integration

**Verdict: solid.** The frontend calls the API correctly and the contract lines up on
every point that matters. No blocking issues. A few minor, optional notes below.

## What I checked (all ✅)
- **Endpoint & method** — `src/api.ts` does `POST /api/calculate`, the stateless compute
  endpoint. Correct choice for the calculator flow.
- **Dev proxy** — `vite.config.ts` proxies `/api` → `http://localhost:3001` on port 5173,
  per conventions. ✅
- **Request body** — sends exactly `{ loanAmount, downPayment, annualInterestRate, termYears }`,
  all coerced to numbers via `Number(...)`. Matches `CalculationInput`. No stray fields. ✅
- **Response shape** — `types.ts: CalculationResult` matches my payload field-for-field,
  including the `input` echo and `numberOfPayments`. ✅
- **Schedule fields** — chart and table read `month`, `payment`, `principalPaid`,
  `interestPaid`, `cumulativePrincipal`, `cumulativeInterest`, `remainingBalance`. All present
  and correctly named. ✅
- **Error handling** — `CalculationError` reads `error` and `fields` from the 400 body, and
  `CalculatorForm` maps `serverFieldErrors[key]` using the exact field keys I return
  (`loanAmount`/`downPayment`/`annualInterestRate`/`termYears`). The fallback chain
  (client errors first, server field errors second) is wired right. ✅
- **Network/parse failure** — caught and surfaced as a friendly banner; previous results are
  preserved on error, matching UX_NOTES. ✅
- **Client validation mirrors server** — same bounds (loan > 0, 0 ≤ down < loan, rate 0–30,
  term integer 1–40), so server 400s should be rare but are still handled. ✅

## Minor notes (non-blocking, optional)
1. **History endpoints unused.** The frontend never calls `POST/GET/DELETE /api/calculations`
   (the saved-history feature). That's fine — they're optional extras and the MVP spec says no
   persistence. No action needed unless Design wants a history UI later.
2. **Comma-formatted input.** A user typing `350,000` makes `Number('350,000')` → `NaN`, which
   the client catches as a validation error (so it never reaches me). Acceptable. If you want it
   to "just work," strip commas before `Number()` in `CalculatorForm.validate`. Backend already
   accepts numeric strings without separators.
3. **`input` field is typed-required but unused in the UI.** `CalculationResult.input` is in the
   type and I always return it, so no runtime risk. Just noting it's currently dead data on the
   frontend — harmless.

## Note on environment (FYI, not a frontend issue)
On this machine (Node 26) `better-sqlite3`'s native build fails, so the backend runs on its
JSON-file fallback. API responses are identical, so the frontend is unaffected.
