# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A proof-of-concept front-end for a Dominican Republic customs brokerage ("aduana"). It manages *expedientes* (customs case files) for imports/exports, tracks a per-file checklist and status, imports Excel, exports XML (a lossless app format and a DGA SIGA layout), keeps master data for clientes/suplidores, and exposes a read-only client portal. Everything is client-side: no backend, mock auth, `localStorage` persistence. The domain language of the UI and data model is Spanish.

Domain background, roadmap, and non-obvious decisions live in [KNOWLEDGE.md](KNOWLEDGE.md). The portal design is in [docs/CLIENT_PORTAL.md](docs/CLIENT_PORTAL.md). Read those before touching the data model, import/export, or anything named in the roadmap.

## Commands

```bash
npm run dev          # Vite dev server (HMR)
npm run build        # tsc -b (type-check, noEmit) then vite build -> dist/
npm run lint         # eslint . (flat config, TS + react-hooks + react-refresh)
npm test             # vitest run  (src/**/*.test.ts, node environment)
npm run test:watch
npx vitest run src/utils/excel.test.ts   # single file
```

Tests cover the pure utilities only (`src/utils/*`, store migration). There are no component tests. `tsconfig.app.json` has `noUnusedLocals` / `noUnusedParameters` on, and eslint does **not** exempt `_`-prefixed variables, so unused destructured fields fail lint. Fast-refresh lint rule: component files may only export components; put shared constants/functions in `src/utils/` or `src/data/`.

## Deployment

Pushing to `dev` triggers `.github/workflows/deploy.yml`, which builds and deploys `dist/` to GitHub Pages. Two things exist only because of this:

- `vite.config.ts` sets `base: '/aduana/'`.
- `App.tsx` uses `HashRouter`, not `BrowserRouter`, so deep links work on Pages. All in-app URLs are `#/...`.

`dev` is the only branch on the remote; there is currently no `main`.

## Architecture

**Stack:** React 19 + TypeScript 6 + Vite 5, MUI v9 (`@mui/material`, `@mui/x-data-grid`), Zustand 5 for state, react-router 7, react-i18next, `xlsx` for Excel, Recharts for charts, Vitest for tests.

**Routing** (`src/App.tsx`): `/login` is public. Two guarded route trees, each wrapped in `ProtectedRoute` (with a `roles` prop) and then `Layout`:

- staff (`admin`, `digitador`): `/dashboard`, `/expedientes`, `/expedientes/new`, `/expedientes/:id`, `/relacionados`, `/import-export`, `/reports`
- admin only: `/settings`
- cliente: `/portal`, `/portal/:id`
- public: `/login` and `/acceso/:token` (client access link)

A wrong-role user is redirected to `homeForRole()` from `authStore`. `Layout` filters `NAV_ITEMS` by role and hides the notification bell for clients. Adding a staff page: create it under `src/features/<feature>/`, add a `<Route>` in the staff tree, add to `NAV_ITEMS` in `Layout.tsx`, add `nav.<key>` to both locale files.

**State** is six Zustand stores in `src/store/`:

| Store | Persistence | Notes |
|---|---|---|
| `expedientesStore` | `localStorage` (`aduana-expedientes`, version 7) | Core domain store. Seeded on first load. Has a `migrate` that upgrades old persisted shapes (see below). Also owns observation CRUD. |
| `relacionadosStore` | `localStorage` (version 3) | Clientes, suplidores (both keyed by document type + number) and depósitos, seeded from the expediente seed. |
| `notificationStore` | `localStorage` | Notifications reference expedientes by id. |
| `authStore` | `sessionStorage` (`auth-user-v2`) | Three hard-coded `MOCK_USERS`. Client user carries `clienteKey`. Bump the storage key when the user shape changes. |
| `settingsStore` | `localStorage` (session-scoped) | Tasa USD, Art. 52 window, tarifario, and the digitador/gestor lists the form reads. |
| `themeStore` | `localStorage` | light/dark. Deliberately outlives logout. |

**Persistence is session-scoped.** `src/store/persistence.ts` is the single place that knows which stores hold session data: expedientes, relacionados and notifications. They survive a refresh, and `clearPersistedData()` resets each one to its seed and then drops its localStorage key — in that order, because `resetToSeed` is a `set` and the persist middleware would otherwise write the seed straight back. `authStore.logout()` calls it, so logging out leaves the browser empty; `Layout` confirms first because that is destructive. The theme store is deliberately excluded: a display preference should outlive a session. A new persisted store must implement `resetToSeed` and be registered in `PERSISTED_STORES`.

To get back to seed data by hand, call `clearPersistedData()` or a single store's `resetToSeed()` from the console. **If you change the `Expediente` shape, bump `version` in `expedientesStore` and extend `migrateExpediente`**, otherwise existing browsers keep the old shape.

**Data model** (`src/types/index.ts`): `Expediente` is a large nested record mirroring the DGA declaration form: `declaracion`, parties (`importador`, `agenteAduanal`, `consignatario`, `compradorExportacion`, `suplidores`), `documentos`, `contenedores`, `valores` (FOB/CIF), `regimenAduanero`, `pesoMercancia`, `partidas` (tariff lines, "Renglones" in the UI), plus `digitador`, `gestor`, `checklist`, and `observaciones: Observacion[]`. `ExpedienteFormData` is the editable subset used by the form. `ExpedienteStatus` is a `const` object + derived union type, not an enum; iterate it with `Object.values(ExpedienteStatus)`.

**Catalogs** live in `src/data/`: `countries.ts` (ISO 3166-1 numeric codes, Spanish uppercase names; `findCountryByCode/Name`), `puertos.ts` (DGA port master table, UN/LOCODE; `findPuerto`), `catalogos.ts` (the SIGA area table as `ADMINISTRACIONES`, `TIPOS_DESPACHO` with IC38 codes, `REGIMENES_IMPORTACION` / `REGIMENES_EXPORTACION` with `regimenesFor(tipo)`, `ESTADOS_PRODUCTO` (IC04), `ACUERDOS`, `REMARK_ESTANDAR`, unidades, staff names, default checklist, brokerage defaults). These are the real SIGA values; do not invent new ones. See KNOWLEDGE.md §6.

**The form is shared.** `src/components/ExpedienteForm.tsx` is the tabbed editor (Declaración / Partes / Docs & Contenedores / Valores & Régimen / Renglones, plus optional `extraTabs`). It is fully controlled: `value: ExpedienteFormData`, `onChange(next)`. `ExpedienteCreatePage` and `ExpedienteDetailPage` are thin wrappers that own the state and call the store on save. Country and administración selects auto-fill their code fields; importador/suplidor name fields are `freeSolo` autocompletes over the relacionados store; importador edits mirror into consignatario until consignatario is edited by hand.

**Observations** are `Observacion[]` on the expediente and are rendered by `src/components/ObservationsTimeline.tsx` (props: `items`, `onAdd/onEdit/onDelete`, `readOnly`). On the detail and list pages they write straight to the store, independent of the Save button. On the create page they are held locally until create. The legacy pipe-delimited `notes` string is only understood by `parseLegacyNotes` (store migration and Excel import).

**Parties are keyed by a document pair.** `Cliente` mirrors SIGA's importer form and its primary key is (`tipoDocumento`, `documento`) where the type is CED / PAS / RNC / TID — the same number under two types is two different parties. `src/utils/documento.ts` owns the rules: `clienteKey`, `entidadKey` (same key from an expediente party), `sigaPartyCode` (the `[RNC|PAS|TID][country][number]` / `[CED][number]` form the XSD documents) and `clienteToEntidad`. Never compare document numbers directly; they are matched with dashes and case stripped. The portal binds a client user through `User.clienteKey`.

**Renglones.** `Partida` carries far more than the grid shows: `src/utils/partida.ts` owns `emptyPartida`, `migratePartida` and `withDerived`. **`unitario` is always derived** (FOB / cantidad) — never write it directly, always route edits through `withDerived`. The fields behind the eye icon live in `PartidaDetailDialog`; they map one-to-one onto ImportDUA.xsd elements, so adding one means adding it to the XML builders too.

**Roles are capability-based.** `src/utils/permisos.ts` maps each role to capabilities; `Layout`'s nav, the Reportería tabs and the Relacionados tabs all filter on `can(role, cap)` rather than checking role names. Adding a page means adding a capability there too. A cliente can also arrive through `#/acceso/<token>`; `buildAccessToken` explains why that token is not a security boundary.

**Checklist drives status.** `toggleChecklistItem` auto-sets status to `Completo` when all items are checked and `Verificado` when some are. The status dropdown can also set it directly.

**Reporting and validation utilities** are pure and unit-tested, and the pages only render them: `reportes.ts` (the five reports plus the product-history dedup rule), `art52.ts` (late-presentation surcharge; only meaningful for files not yet presented), `vuce.ts` (permit rules by HS chapter, and the non-temporary check), `hojaRegistro.ts` (the printable sheet as standalone HTML).

**Import/Export** (`src/utils/excel.ts`, `src/utils/xml.ts`, `ImportExportPage`):
- Excel: `parseWorkbook` reads every sheet and every column. Headers are normalised (accents/spaces/punctuation stripped) and matched against `FIELD_ALIASES`; unmatched columns are kept in `row.extra` and shown in the preview but not imported. `rowsToExpedientes` groups rows by reference (one expediente, one partida per row) and fills catalog names from codes and vice versa. **To support a new spreadsheet layout, add aliases to `FIELD_ALIASES`; do not special-case in the page.**
- Full XML (`buildFullXml`): every field, meant to be lossless.
- SIGA XML (`buildSigaImportXml` / `buildSigaExportXml`, `buildSigaXmlFiles` for a mixed selection): follows the official DGA `ImportDUA.xsd` / `ExportDUA.xsd` in `docs/siga-xsd/`. Both schemas are `xs:sequence`, so element order in the builders must match the XSD. Untracked required fields are emitted empty on purpose.

**i18n:** `src/i18n/config.ts` loads `es.json` and `en.json`; default and fallback is `es`. Status labels are looked up as `status.<value>` and expediente type as `expediente.tipo_<value>`, so keys must match values in `types/index.ts`. Both locale files must stay key-for-key in sync.

**Dates:** stored as ISO strings; displayed via `fmtDate` / `fmtDateTime` (`src/utils/date.ts`, dd/mm/yyyy). `declaracion.eta` is a bare `YYYY-MM-DD`. ETA row highlighting logic is `etaRowClass` in `src/utils/eta.ts`.

**Theme:** `createAppTheme(mode)` in `App.tsx` holds the entire MUI theme including per-component overrides. Prefer theme tokens (`background.paper`, `divider`, `text.secondary`) over hard-coded colors so dark mode keeps working.

## Gotchas

- MUI DataGrid `valueGetter` is the v7+ form `(value, row)`; row selection model is `{ type: 'include', ids: Set }`. Type columns as `GridColDef<Expediente>[]` to get `row` typed.
- MUI `Autocomplete` `renderOption` props include `key`; destructure it out before spreading (`const { key, ...rest } = props`).
- `README.md` is a short project readme; the Vite template boilerplate and its CSS/asset files were removed. Don't reintroduce `src/index.css` / `App.css`.
- The dev server URL includes the base path: `http://localhost:5173/aduana/`.
