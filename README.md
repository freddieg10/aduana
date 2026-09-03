# Aduana

Case-management app for a Dominican Republic customs brokerage. Tracks **expedientes** (customs
files) through the DGA clearance lifecycle, with a checklist per file, an observation timeline,
Excel import, XML export (including a DGA SIGA layout), master data for clients and suppliers,
and a read-only client portal.

Proof of concept: everything runs in the browser. There is no backend; data persists in
`localStorage`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173/aduana/
```

Demo logins:

| Role | Email | Password |
|---|---|---|
| admin | admin@aduana.com | admin123 |
| agent | agente@aduana.com | agente123 |
| client | cliente@aduana.com | cliente123 |

## Scripts

```bash
npm run build      # type-check + production build to dist/
npm run lint
npm test           # vitest, unit tests under src/**/*.test.ts
npm run preview    # serve dist/
```

## Deploy

Pushing to `dev` runs the GitHub Actions workflow that builds and publishes `dist/` to GitHub
Pages. The app is served under `/aduana/` and uses hash routing for that reason.

## Docs

- [CLAUDE.md](CLAUDE.md) — architecture and conventions for working in the code.
- [KNOWLEDGE.md](KNOWLEDGE.md) — domain glossary, roadmap, decisions, open questions.
- [docs/CLIENT_PORTAL.md](docs/CLIENT_PORTAL.md) — client portal design.
