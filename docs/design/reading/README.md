# Reading — rules extracted from outside sources

Jaseem reads; this folder is where what he reads turns into something checkable.

**One file per source.** Each file has the same four parts:

| Part | What goes in it |
|---|---|
| **Source** | What it is, where it is, when it was read |
| **What it says** | The source's own claims, in its own vocabulary — no editorialising |
| **Against ours** | Every claim mapped to a `DESIGN-PRODUCT.md` § — *confirms*, *extends*, *contradicts*, or *new* |
| **Rules extracted** | Only the *new* and *contradicts* rows, written as rules we could check. Each carries a status |

**A rule here is not law.** It is a candidate. It becomes law by moving into
`DESIGN-PRODUCT.md` with Jaseem's call on it, and the row here changes to
`→ §n`. Nothing in this folder overrides the product file.

| Status | Means |
|---|---|
| `proposed` | Extracted, not yet put to Jaseem |
| `accepted` | Jaseem said yes — move it into `DESIGN-PRODUCT.md` and link back |
| `rejected` | Jaseem said no. **Keep the row** — it stops the same idea being re-proposed |
| `→ §n` | Landed. The product file is now authoritative |

## Sources

| Source | Read | Status |
|--------|------|--------|
| [Layout & Alignment](alignment.md) | 2026-08-23 | notes taken, **source text not yet read at full fidelity** |
| [Style Details](style-details.md) | 2026-08-23 | notes taken, legible, quotes transcribed |
| [Color Details](color-details.md) | 2026-08-23 | notes taken; one measurement run — `--chart-*` is not lightness-normalised |
| [Typography Details](typography-details.md) | 2026-08-23 | notes taken; audit run — 44 copy strings on a typewriter apostrophe |
| [Compositing — Layered Shadows](compositing.md) | 2026-08-23 | verbatim; audit run — `--shadow-2xl` is single-layer in both themes |

**All of these are one series: [Interface Craft](https://www.interfacecraft.dev/) by
Josh Puckett.** The site is gated — fetching an article URL without a session
returns 404 — so every note here is transcribed from Jaseem's exports and should
be read as close paraphrase, not verbatim quotation.

The footers run `Layout & Alignment → Style Details → Color Details →
Typography Details → Interactions & State Design`. **The last has not been
shared yet.**
