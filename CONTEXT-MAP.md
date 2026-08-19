# Context Map

This repo has multiple bounded contexts. Each has its own `CONTEXT.md` glossary.

| Context | Glossary | Scope |
|---|---|---|
| backend | `./CONTEXT.md` | API-server hub: `cmd/`, `pkg/` |
| frontend | `./frontend/CONTEXT.md` | React SPA: `frontend/src/` |
| agent | _deferred_ | spoke cluster-agent operator — no source in this repo; add lazily when agent terms are resolved |

System-wide ADRs: `docs/adr/`. Frontend-specific ADRs: `frontend/docs/adr/`.

Working context for the design pass:

| File | Holds |
|---|---|
| `DESIGN-PRODUCT.md` | The product's design rules. If a rule and the code disagree, the code is wrong |
| `docs/design/redesign-log.md` | Why each rule changed, **newest first**. Reversals are recorded as reversals |
| `docs/tasks.md` | Work left — Now / Next / Done |
| `docs/session-log.md` | Session trail, newest first |
