# UX_NOTES.md — Visual direction for Amortize

## Aesthetic: "Quiet Ledger"
A calm, trustworthy financial instrument. Think the considered restraint of a private bank statement crossed with a modern fintech dashboard: lots of breathing room, crisp typography, a single confident accent color, and data presented with the seriousness money deserves. No gradients-for-the-sake-of-it, no neon, no playful illustrations. Precision and clarity signal trust.

## Color palette
Light theme, warm-neutral paper background (not stark white — feels like quality stationery).

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#F7F5F0` | App canvas (warm paper) |
| Surface | `#FFFFFF` | Cards, panels, table |
| Ink (primary text) | `#1C2A24` | Headings, primary numbers |
| Muted text | `#5E6B64` | Labels, secondary text |
| Border / hairline | `#E4E0D7` | Card borders, table rules |
| Accent (primary) | `#1F6F54` | Buttons, links, focus, chart "principal" |
| Accent hover | `#175840` | Button hover/active |
| Accent soft | `#E3EFE9` | Accent-tinted fills, hero card bg |
| Interest (chart) | `#C9883B` | Chart "interest" series (warm gold) |
| Interest soft | `#F4E7D2` | Interest area fill |
| Balance line (chart) | `#3A4A43` | Remaining-balance line |
| Error | `#B23A3A` | Validation text/borders |

The two-color story is **deep green (principal/equity, the good part)** vs **warm gold (interest, the cost)**. This pairing carries the whole product: it's the chart legend, and it can subtly tint the related summary cards.

## Typography
- **Numbers & headings:** `"Fraunces", Georgia, serif` — a characterful display serif gives the calculator a premium, editorial, "this is about real money" feel. Use for the app title and the large summary figures.
- **UI & body & tables:** `"Inter", system-ui, -apple-system, sans-serif` — clean, highly legible for labels, inputs, and dense tabular data.
- **Tabular numbers:** enable `font-variant-numeric: tabular-nums` on all numeric output (summary figures and the table) so digits align.
- Load fonts via Google Fonts (`Fraunces`, `Inter`). If offline, the serif/sans fallbacks keep it readable.

### Type scale
- App title: Fraunces, 32–40px, weight 600.
- Section headings: Fraunces, 20–24px, weight 600.
- Hero number (Monthly Payment): Fraunces, 40–48px, weight 600.
- Card numbers: Fraunces, 26–30px.
- Labels / muted: Inter, 13–14px, weight 500, letter-spacing 0.01em, often uppercase for field labels.
- Body / table: Inter, 14–15px.

## Layout & spacing
- Centered single column, **max-width ~1080px**, generous side padding (24px mobile, 48px+ desktop).
- 8px spacing base unit; common gaps 8 / 16 / 24 / 32 / 48.
- Cards: 1px `#E4E0D7` border, `12px` radius, white surface, soft shadow (`0 1px 2px rgba(28,42,36,0.04), 0 8px 24px rgba(28,42,36,0.05)`). Avoid heavy drop shadows.
- Calculator panel: two columns on ≥860px (form left ~40%, summary right ~60%), stacked below.
- Summary cards: 2×2 grid; the Monthly Payment card spans visual prominence (larger number, accent-soft background `#E3EFE9`).
- Breakdown section full width below, chart above table.

## Components & interactions
- **Inputs:** white field, 1px border `#E4E0D7`, 8px radius, comfortable height (~44px). Currency/percent fields show a prefix/suffix adornment (`$`, `%`). Focus state: 2px accent ring `#1F6F54` + border color shift, no harsh browser outline. Labels sit above inputs in muted uppercase.
- **Primary button (Calculate):** solid accent `#1F6F54`, white text, 8px radius, full-width on mobile. Hover → `#175840`. Subtle press scale (0.99). Disabled while invalid → 50% opacity.
- **Validation:** inline message in `#B23A3A` below the field, field border turns red. Don't clear results when a new error appears; only update on a valid submit.
- **Summary cards:** label (muted, uppercase, small) above a large tabular-num figure. Animate value changes with a quick (~200ms) ease — a count-up or a simple fade is fine; keep it tasteful, not bouncy.
- **Chart:** use a lightweight React chart lib (e.g. Recharts). Stacked area: cumulative **principal** (green `#1F6F54` / fill `#E3EFE9`) and cumulative **interest** (gold `#C9883B` / fill `#F4E7D2`), plus a **remaining balance** line (`#3A4A43`). X-axis labeled in years (tick every few years, not every month). Tooltip shows the values at that point with formatted currency. Clear legend with the green/gold swatches. Hairline grid, no chart junk.
- **Table:** white surface, sticky header row, hairline row separators `#E4E0D7`, zebra striping optional with very subtle `#FBFAF7`. Right-align all numeric columns, tabular-nums. To keep the page light, show first 12 rows by default with a **"Show all N payments"** text button (accent) that expands; the expanded table is internally scrollable (max-height ~480px) with the sticky header.
- **Currency formatting:** USD, `$` prefix, thousands separators, 2 decimals (e.g. `$1,432.25`). Percent with up to 3 decimals. Years as plain integers.
- **Empty/error global state:** if the backend returns an error, show a small inline banner above the summary cards in error color; never blank the page.

## Tone of microcopy
Plain, calm, confident. Tagline suggestion: *"See what your mortgage really costs."* Field helper examples are fine (e.g., placeholder `30` for term). Avoid exclamation marks and jargon.

## Responsiveness
- ≥860px: two-column calculator, 2×2 summary grid, chart full width.
- <860px: everything stacks; summary becomes 1 column or 2×2 depending on width; table horizontally scrolls if needed.
- Touch targets ≥44px.
