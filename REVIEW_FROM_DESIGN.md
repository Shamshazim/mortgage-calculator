# REVIEW_FROM_DESIGN.md — Amortize

Reviewed the full build against DESIGN.md and UX_NOTES.md. I read all backend and
frontend source, ran the backend (health + calculate + zero-rate + bad-input), and ran a
production frontend build. **Overall: this is a strong, faithful implementation.** The
amortization math is correct, validation matches the spec, the visual identity ("Quiet
Ledger") is implemented closely, and both halves run on a clean Node machine.

Verification highlights:
- `POST /api/calculate` for the example loan returns monthlyPayment ≈ **$1,769.79**, total
  interest ≈ **$357,124.57**, total cost ≈ **$637,124.57** — matches reference calculators.
- Zero-rate loan: monthly $1,000, total interest $0, final balance exactly 0. ✅
- `downPayment >= loanAmount` returns 400 with the correct field error. ✅
- `npm run build` (tsc + vite) passes with no type errors. ✅
- SQLite native build is unavailable on this machine; JSON fallback activates as specified. ✅

The items below are refinements, not blockers. Priorities: **P1** = should fix, **P2** =
worth doing, **P3** = polish.

---

## Frontend items

### P2 — Summary grid leaves an awkward empty cell
UX_NOTES specifies a **2×2 summary grid** with Monthly Payment as the emphasized cell. The
implementation makes the hero card span the full width (`grid-column: 1 / -1`), which leaves
three cards (Total Interest, Total Cost, Loan Principal) flowing into a 2-column grid below.
The result is: hero (full row) → Interest + Total Cost → **Principal alone, with an empty
bottom-right cell**. That dangling gap reads as unfinished.
Pick one of:
- Keep the true **2×2**: hero occupies the top-left cell (emphasized via the larger number
  and accent-soft tint it already has), the other three fill the remaining cells — no gap.
- Or intentionally do **hero full-width + a 3-across row** of the remaining cards below it.
Either is fine; the current half-and-half is the problem.

### P2 — "Calculate" button isn't disabled on invalid input
UX_NOTES says the primary button should be "Disabled while invalid → 50% opacity." Currently
it's only disabled while `loading`; invalid fields are caught on submit instead. The
submit-time validation is actually decent UX, so either is acceptable — but please reconcile
spec and behavior: either disable+dim the button while the form is invalid, or I'll update
UX_NOTES to bless submit-time validation. Don't leave them contradictory.

### P3 — Chart tooltip shows "Year 0" for sub-year months
The tooltip uses `Math.floor(month / 12)`, so months 1–11 render as "Year 0 · Month 6", etc.
"Year 0" reads oddly. Consider showing `Year ${Math.ceil(month/12)}` or just "Month N (Year
N)" so the first year reads as Year 1.

### P3 — Chart mixes cumulative-stacked areas with the balance line
The stacked areas (cumulative principal + cumulative interest) climb to ~total cost (~$637k),
which sets the Y-axis max, while the Remaining Balance line tops out at the principal (~$280k)
and falls to 0 — so the balance line lives in the lower ~45% of the plot. This matches what
the spec asked for and the legend is clear, so it's acceptable; just flagging that the
"principal vs interest crossover" story (the moment more of each payment goes to principal)
isn't directly visible in a *cumulative* view. Optional enhancement: a short caption, or a
toggle to a per-payment principal-vs-interest view, would make the headline insight pop. Not
required for MVP.

### P3 — Dead code: `formatPercent`
`format.ts` exports `formatPercent`, but the rate is never displayed as an output, so it's
unused. Either drop it or use it (e.g., echo the rate in the breakdown subheading). Trivial.

---

## Backend items

### P3 — Noisy console output on the JSON fallback
When `better-sqlite3` is absent, `db.js` logs the full `Require stack:` error to the console
before falling back. It works perfectly, but the stack trace looks alarming on first run.
Downgrade to a single calm info line, e.g. `"[db] better-sqlite3 unavailable — using JSON
store."` so operators don't think something broke.

### Note (no action) — History endpoints are unused by the frontend
`POST/GET/DELETE /api/calculations` (the saved-history feature) exist and satisfy the
"DB-backed persistence" convention, but the frontend never calls them. That's fine and within
scope — the core flow is correctly stateless via `/api/calculate`. No change needed unless you
later want a "save scenario" UI (explicitly out of MVP scope per DESIGN.md).

---

## Spec/contract conformance — confirmed good
- Math (monthly payment, zero-rate branch, final-payment adjustment, totals from summed
  payments) matches the authoritative DESIGN.md section. ✅
- Validation rules and 400 error shape (`{ error, fields }`) match DESIGN.md + API.md. ✅
- Full-precision numbers returned; frontend formats to `$` + 2 decimals + tabular-nums. ✅
- Single-page flow with pre-filled example calculated on load. ✅
- Palette, Fraunces/Inter typography, card styling, focus ring, error states, sticky-header
  scrollable table with "Show all N payments", green/gold chart series — all per UX_NOTES. ✅
- Ports (3001 / 5173), `/api` proxy, `/api/health`, CORS — all per conventions. ✅

**Bottom line:** ship-quality. Address the P2 summary-grid gap and the button-disable
spec reconciliation; the rest are optional polish.
