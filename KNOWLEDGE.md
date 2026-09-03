# Aduana — Project Knowledge

Living document for everything that is *not* derivable from the code: domain background, product decisions, roadmap, open questions, and reference material. `CLAUDE.md` covers how the code is built; this file covers *why* and *what's next*. Fill in the `TODO` sections as answers become known.

---

## 1. What the product is

A case-management tool for a Dominican Republic customs brokerage (agente aduanal). The brokerage handles import/export clearances on behalf of clients (importadores) and files declarations with the DGA. Each clearance is an **expediente**.

- **Agente aduanal (the brokerage):** ARMESSAG, SRL, código `1`. Default agent on new expedientes and Excel imports (`AGENTE_ADUANAL_DEFAULT`).
- **Users:** internal staff (admin, agent) plus a read-only client portal (see `docs/CLIENT_PORTAL.md`).
- **Default currency assumptions:** values in USD; `tasaCambio` defaults to 65 (RD$ per USD).

`TODO`: confirm who the real end users are, how many concurrent users, and whether the brokerage is the sole tenant.

## 2. Domain glossary

| Term (ES) | Meaning | Where in code |
|---|---|---|
| Expediente | Customs case file for one shipment/declaration | `Expediente` type |
| DGA | Dirección General de Aduanas, the DR customs authority | `buildSigaXml` |
| SIGA | Sistema Integrado de Gestión Aduanera, DGA's filing system; target of the SIGA XML export | `src/utils/xml.ts` |
| DUA | Declaración Única Aduanera, the SIGA declaration whose sections the SIGA XML mirrors | `buildSigaXml` |
| Declaración | The customs declaration header (ETA, tipo de despacho, administración, no. declaración, doc. embarque, país procedencia, factura) | `Declaracion` |
| Administración | The DGA regional office / port administration (e.g. Haina Oriental, Caucedo, Puerto Plata); has a numeric code | `ADMINISTRACIONES` |
| Tipo de despacho | Clearance type (SIGA list): GENERAL, NO MANIFIESTO, VENTA AL MERCADO LOCAL, ENTREGA PROVISIONAL, CENTRO LOGISTICO, COMPRA LOCAL Z.F | `TIPOS_DESPACHO` |
| Régimen aduanero | Customs regime (SIGA code); separate import and export lists | `REGIMENES_IMPORTACION`, `REGIMENES_EXPORTACION` |
| Importador / Consignatario | Client and receiving party; consignatario auto-mirrors importador until edited | `ExpedienteForm` Partes tab |
| Suplidor | Foreign supplier. On an expediente: código, nombre, nacionalidad. In master data: + TID, dirección, teléfono, fax, país | `Suplidor`, `SuplidorMaestro` |
| Cliente | Master-data record for an importador, mirroring SIGA's importer form and keyed by (tipoDocumento, documento) | `Cliente` |
| Relacionados | The master-data module (clientes + suplidores) | `relacionadosStore`, `RelacionadosPage` |
| Doc. Embarque / BL | Bill of lading or shipping document number | `declaracion.docEmbarque` |
| Partida / Renglón | Tariff line item (HS code, description, qty, unit, origin, FOB). UI says "Renglón"; code says `partida` | `Partida` |
| Factura DVA | Invoice reference on a partida (DVA = Declaración de Valor en Aduana) | `Partida.facturaDva` |
| FOB / CIF | Free on board / Cost+insurance+freight totals | `Valores` |
| Digitador | Data-entry staff assigned to the file | `Expediente.digitador` |
| Gestor | Case manager / dispatcher assigned to the file | `Expediente.gestor` |
| RNC / CED / PAS / TID | SIGA document types: tax ID, cédula, passport, foreign tax ID. Type + number identify a party | `TipoDocumento`, `Cliente.documento` |
| TID | Supplier tax ID in its own country | `SuplidorMaestro.tid` |

## 3. Expediente lifecycle

Statuses in order (`ExpedienteStatus`):

1. `registrado` — created
2. `manifestado` — appears on carrier manifest
3. `pendiente_info` — waiting on documents/info
4. `pre_liquidado` — duties pre-calculated
5. `presentado` — declaration filed with DGA
6. `proceso_verificacion` — under DGA review
7. `verificado` — DGA verified
8. `despacho` — released / dispatching
9. `completo` — done

Dashboard groups 1–4 as "Pendientes", 5–8 as "En Progreso", 9 as "Completados". The client portal shows the same order as a stepper.

**ETA highlighting rule (list view, `etaRowClass`):** if status is *before* `presentado` (1–4), the row turns orange when ETA has passed and yellow when ETA is within 7 days. Statuses 5–9 are never highlighted.

**Checklist (8 fixed items, `DEFAULT_CHECKLIST_LABELS`):** documents received, invoice verified, BL reviewed, tariff classification, permits, declaration generated, taxes paid, dispatch complete. Progress % = completed / 8. Toggling items auto-bumps status (any → Verificado, all → Completo).

`TODO`: is the checklist meant to be per-tipo (import vs export differ)? Should status be strictly derived from checklist, or independent?

## 4. Roadmap ("Episode 2")

Source: product notes from Freddie, Sept 2026. Status as of 2026-09-02.

### UI/UX
- [x] Less-bright light-mode palette
- [x] List columns: Fecha de llegada, Digitador, Gestor (now real fields on the expediente, editable in the Declaración tab, filterable in the list)
- [x] Country dropdown (full ISO list, `src/data/countries.ts`); selecting fills `paisProcedenciaCodigo`, shown read-only
- [x] "Código Administración" read-only field auto-filled from the Administración dropdown; dropdown lists the full SIGA area table with verified codes (see §6)
- [x] Tipo de despacho dropdown: the six real SIGA values (see §6); unknown stored values are still shown
- [x] Dynamic ETA cell styling

### Observations
- [x] "Agregar observación" replaces Notas
- [x] Chronological timeline with timestamp + user; edit/delete inline; Ctrl+Enter submits
- [x] Stored as `Observacion[]` (migrated from the pipe-delimited string via `migrateExpediente`)

### Expediente management
- [x] "Renglones" tab name
- [x] Clone renglón
- [x] Digitador and Gestor on the detail page (chips in the header, selects in the form)

### Data & interoperability
- [x] Excel parsing reads all sheets and all columns; unrecognised columns are surfaced in the preview and a warning. Alias table: `FIELD_ALIASES` in `src/utils/excel.ts`
- [x] Full XML export (every field, `buildFullXml`)
- [x] DGA SIGA XML export now follows the official `ImportDUA.xsd` / `ExportDUA.xsd` (copies in `docs/siga-xsd/`); one file per tipo. Still to confirm against a real SIGA upload: the codes SIGA expects for container type, unit of measure and required-document type.
- [ ] Re-import of the full XML (not requested; would make the full XML a backup format)

### Client-facing portal
- [x] v0 designed and implemented: `/portal` routes, role guard, client bound by importer code. Design doc: `docs/CLIENT_PORTAL.md`
- [ ] Real per-client auth, documents, notifications (needs backend)

### Relacionados (master data)
- [x] Sidebar module with Clientes/Importadores and Suplidores tabs, CRUD dialogs, country picker. The cliente form mirrors SIGA's importer form and is keyed by (tipo de documento, documento)
- [x] Partes tab picks importador / suplidor from master data (freeSolo, so unregistered names still work)
- [ ] Warn when an expediente's importador code has no matching cliente

## 5. Known technical debt

- Persistence is `localStorage` only, scoped to the login session: data survives a refresh and is wiped on logout (`clearPersistedData`). Fine for a single-user POC; a backend is required for multi-user use. Every store is `persist`-wrapped, so swapping storage for an API is the main job.
- Because the session lives in `sessionStorage` and the data in `localStorage`, closing the tab without logging out leaves the data in place until the next explicit logout. Acceptable for a POC on a trusted machine; a shared machine would want the data cleared on session end too.
- `ExpedienteForm` is one ~450-line component. Splitting per tab is straightforward when it grows.
- No component tests; only utilities are covered.
- `main` branch does not exist; everything deploys from `dev`.
- Bundle is a single ~1.9 MB chunk (MUI + DataGrid + xlsx + recharts). Route-level code splitting would help if load time matters.
- Dashboard/Reports still use untyped `GridColDef[]`.

## 6. Reference data

### Administraciones (SIGA `AreaCode`)

Official SIGA area table (supplied by Freddie on 2026-09-03 from the SIGA catalog; every entry in `ADMINISTRACIONES` is `verificado: true`). The area code is also the first segment of every declaration number (`10030-IC01-2310-0047D5` = area 10030, import declaration, Oct 2023) and liquidation number (`10030-CL11-…`).

| Código | Área |
|---|---|
| 10000 | DIRECCION GENERAL DE ADUANAS |
| 10010 | ADMINISTRACION SANTO DOMINGO |
| 10020 | ADMINISTRACION HAINA OCCIDENTAL |
| 10030 | ADMINISTRACION HAINA ORIENTAL |
| 10040 | ADMINISTRACION BOCA CHICA |
| 10050 | ADMINISTRACION SAN PEDRO DE MACORIS |
| 10060 | ADMINISTRACION LA ROMANA |
| 10070 | ADMINISTRACION PUERTO PLATA |
| 10080 | ADMINISTRACION AZUA |
| 10090 | ADMINISTRACION BARAHONA |
| 10100 | ADMINISTRACION CABO ROJO |
| 10110 | ADMINISTRACION MANZANILLO |
| 10120 | ADMINISTRACION SAMANA |
| 10130 | ADMINISTRACION SANCHEZ |
| 10140 | ADMINISTRACION PEDERNALES |
| 10150 | ADMINISTRACION PUERTO MULTIMODAL CAUCEDO |
| 10160 | ADMINISTRACION PUERTO LA CANA |
| 00406 | ADMINISTRACION ARROYO BARRIL |
| 20010 | AEROPUERTO INTERNACIONAL GREGORIO LUPERON PUERTO PLATA |
| 20020 | AEROPUERTO INTERNACIONAL LICEY (Cibao) |
| 20030 | AEROPUERTO DR. JOAQUIN BALAGUER (La Isabela) |
| 20040 | AEROPUERTO PUNTA CANA |
| 20050 | AEROPUERTO INTERNACIONAL JOSE FRANCISCO PEÑA GOMEZ (AILA carga) |
| 20051 | ADMINISTRACION AEROPORTUARIA AILA PASAJEROS |
| 20060 | AEROPUERTO MARIA MONTES (Barahona) |
| 20070 | AEROPUERTO INTERNACIONAL LA ROMANA |
| 20080 | AEROPUERTO JUAN BOSCH (EL CATEY) |
| 00428 | AEROPUERTO ARROYO BARRIL |
| 01197 | AEROPUERTO PUNTA CANA TERMINAL DE PASAJEROS |
| 30010 | ADMINISTRACION ELIAS PIÑA |
| 30020 | ADMINISTRACION DAJABON |
| 30030 | ADMINISTRACION JIMANI |
| 00447 | OFICINA SATELITE LA DESCUBIERTA |

The earlier web research had independently confirmed 10030, 10150 and 20050 from DGA rulings, which agree with this table. The seed data originally carried 10020 for Puerto Plata (really Haina Occidental) and 10040 for Caucedo (really Boca Chica); both are fixed, and `migrateExpediente` (store version 3) corrects persisted records by matching the stored administración name to the table.

### Regímenes (SIGA `RegimenCode`)

Also from the SIGA catalog. Import and export have different lists, so the form shows `regimenesFor(tipoExpediente)`.

| Importación | | Exportación | |
|---|---|---|---|
| 1 | DESPACHO A CONSUMO | 16 | EXPORTACION NACIONAL |
| 2 | ADMISION TEMPORAL | 2 | ADMISION TEMPORAL |
| 3 | ADMISIÓN TEMPORAL SIN TRANSFORMACIÓN | 4 | DEPOSITO LOGISTICO |
| 4 | DEPOSITO LOGISTICO | 5 | SALIDA TEMPORAL |
| 6 | DEPOSITO FISCAL | 11 | ZONAS FRANCAS INDUSTRIAL Y ESPECIALES |
| 7 | DEPOSITO DE REEXPORTACION | 17 | REEMBAQUE |
| 10 | ZONA FRANCA COMERCIAL | 20 | CONSUMO DE REEXPORTACION |
| 11 | ZONAS FRANCAS INDUSTRIAL Y ESPECIALES | | |
| 14 | REIMPORTACION | | |
| 15 | DEPOSITO PARTICULAR | | |

### Puertos (SIGA `EntryPort` / `DeparturePort`)

`src/data/puertos.ts` holds the Dominican entries of the DGA master port table (tabla-maestra-codigos-puertos-noviembre-2019-v2.xlsx, aduanas.gob.do). Codes are UN/LOCODE (DOHAI Río Haina, DOCAU Caucedo, DOSDQ Santo Domingo, DOPOP Puerto Plata, DOBCC Boca Chica, DOSPM San Pedro de Macorís...). The form stores the port name; `findPuerto` resolves it to the code for the SIGA XML.

### Tipos de despacho (SIGA `ClearanceType`)

The six values SIGA offers, in the order its dropdown shows them (screenshot from SIGA, 2026-09-03):

| Tipo de despacho | Note |
|---|---|
| GENERAL | Default; the ordinary manifested clearance |
| NO MANIFIESTO | Land borders, airports and advance (anticipada) declarations, per the DUA manual |
| VENTA AL MERCADO LOCAL | Free-zone goods sold into the local market |
| ENTREGA PROVISIONAL | Provisional release |
| CENTRO LOGISTICO | Logistics-centre movement |
| COMPRA LOCAL Z.F | Local purchase by a free-zone company |

SIGA shows labels only, so the XML carries the label. Earlier guesses (MANIFIESTO, ANTICIPADO, URGENTE, EXPRESO) are not SIGA values; `TIPO_DESPACHO_LEGACY` maps them (MANIFIESTO/URGENTE/EXPRESO → GENERAL, ANTICIPADO → NO MANIFIESTO) and `migrateExpediente` rewrites persisted records at store version 4.

### SIGA XML

The DGA publishes the XSDs SIGA accepts on upload ("Archivos XSD necesarios para trabajar en SIGA", aduanas.gob.do/de-interes/descargas). Copies are in `docs/siga-xsd/`. `buildSigaImportXml` / `buildSigaExportXml` follow `ImportDUA.xsd` / `ExportDUA.xsd` element by element. Fields the app does not track but the schema requires (TransportCompanyCode, TransportNationality, TransportMethod) are emitted empty so SIGA asks for them on upload. Codes for ContainerType, UnitCode, RequiredDocumentCode and ProductStatusCode are SIGA-internal and unknown; the app passes its own labels. Declaration numbers follow `<AreaCode>-IC01-<YYMM>-<seq>` for imports and liquidations `<AreaCode>-CL11-<YYMM>-<seq>`.

**Country codes:** ISO 3166-1 numeric, zero-padded to 3 chars (724 España, 356 India, 156 China, 764 Tailandia, 276 Alemania, 756 Suiza, 214 República Dominicana). Names uppercase Spanish. The DGA port table uses the same numeric codes, which confirms the convention.

### Identificación de clientes (documento dinámico)

The Relacionados cliente form mirrors SIGA's **Buscar Información de Importador** field for field: Tipo\*, Documento\* (type + number), Nombre\*, E-Mail, Calle, Ciudad, Teléfono, Zona, Fax, País de Origen\* (\* = required in SIGA).

**The primary key is the pair (tipoDocumento, documento)**, not any single field. SIGA's document types are CED, PAS, RNC and TID, so the same number under two types is two different parties. `clienteKey` renders the pair as `RNC:101000011`, comparing numbers with dashes, spaces and case removed; `entidadKey` computes the same key from a party stored on an expediente, defaulting to RNC for records written before the type field existed.

SIGA "Tipo" values, in its own order: Persona, Empresa Importadora, Empresa de Admisión Temporal, Empresa Industrial, Empresa Comercial, Empresa de Tiendas Z.F., Organización Externa, Empresa de Especial a Z.F., ExpressCompany, Empresa Compradora, Empresa Logística.

**Party codes in the DUA.** ImportDUA.xsd documents ConsigneeCode / ImporterCode / DeclarantCode as `[RNC|PAS][Country Code][Identity Number]` or `[CED][Identity Number]`. `sigaPartyCode` composes exactly that: `RNC214101000011` for a Dominican company, `PAS724X1234567` for a Spanish passport holder, `CED00112345678` for a cédula (no country segment). TID follows the RNC shape. This is why an expediente stores the document type and issuing country alongside the number, in the optional `tipoDocumento` / `paisDocumento` fields of `EntidadAduanal`.

Suplidores were left on their own `codigo` + `tid`; only the importer side was switched.

**Mock logins:** admin@aduana.com / admin123, agente@aduana.com / agente123, cliente@aduana.com / cliente123 (client bound to importer 8115, BRAVO S A).

**Excel import:** headers are matched after normalisation (lowercase, accents/spaces/punctuation removed), so "País de Procedencia", "PAIS PROCEDENCIA" and `paisProcedencia` all work. Rows sharing a Referencia (or No. Declaración) become one expediente; each row is one renglón; suplidor/documento/contenedor columns are collected across the group and de-duplicated. A "Notas"/"Observaciones" column becomes observations. All sheets are read.

`TODO`: attach a sample real input Excel to the repo (e.g. `docs/samples/`).

## 7. Links

- Repo: https://github.com/freddieg10/aduana
- Deployed (GitHub Pages): https://freddieg10.github.io/aduana/
- DGA administraciones directory (PDF): https://www.aduanas.gob.do/de-interes/administraciones-aduaneras-y-depositos/
- DGA downloads incl. SIGA XSD zip: https://www.aduanas.gob.do/de-interes/descargas/
- DGA port master table (xlsx): https://www.aduanas.gob.do/media/12xia04q/tabla-maestra-codigos-puertos-noviembre-2019-v2.xlsx
- SIGA DUA import manual (PDF): https://www.aduanas.gob.do/media/irwp5ta2/declaracion-importacion-uexterno-version2.pdf
- SIGA DUA export manual (PDF): https://www.aduanas.gob.do/media/naqhll4z/manual-declaracio-n-de-exportacio-n.pdf

## 8. Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-04-10 | HashRouter + `base: '/aduana/'` | GitHub Pages has no server-side rewrite for SPA routes |
| 2026-04-10 | Zustand over Redux/Context | Small POC, minimal boilerplate |
| 2026-06-26 | Observations stored inside `notes` string | Avoided a type migration while prototyping the timeline UI |
| 2026-09-02 | Observations become `Observacion[]`; persisted state migrated (store version 2) | The string encoding was duplicated in three pages and impossible to export cleanly |
| 2026-09-02 | `localStorage` persistence for all stores | Data loss on refresh made the POC unusable for real trials; cheapest fix without a backend |
| 2026-09-02 | Shared `ExpedienteForm` for create and detail | The two pages had drifted apart; every field change needed two edits |
| 2026-09-02 | Client portal inside the same SPA, keyed by importer code | No backend yet; importer code is already on every declaration |
| 2026-09-02 | Provisional codes for administraciones beyond the six confirmed | Roadmap asked for the full list; codes flagged in code and here until DGA list is obtained |
| 2026-09-03 | Administraciones renamed to the official DGA directory; codes 10030/10150/20050 verified from DGA rulings; Caucedo corrected from 10040 to 10150; SIGA export rewritten against the official XSDs | Research on aduanas.gob.do; no public code table exists, but declaration numbers embed the area code |
| 2026-09-03 | Full SIGA area table and import/export regime tables loaded into `catalogos.ts`; store version 3 remaps stale codes by name | Freddie supplied the SIGA catalog tables |
| 2026-09-03 | Real tipo de despacho list loaded; invented values mapped away at store version 4 | Freddie supplied the SIGA dropdown |
| 2026-09-03 | RNC became the cliente primary key and the importer code; the separate `codigo` field was dropped (relacionados store v1, expedientes store v5 remap old codes) | Freddie: "the codigo should be the RNC field, this will be the PK and is required". SIGA builds `ImporterCode` from the RNC, so one field serves both |
| 2026-09-03 | Session-scoped persistence: logout clears the persisted stores and resets them to seed, with a confirmation dialog | Freddie: "add a persistor to state, so I can refresh without losing data - cleared when logged out". Theme excluded as it is a display preference |
| 2026-09-03 | Cliente form rebuilt to match SIGA's importer form; the key became the dynamic pair (tipoDocumento, documento) rather than the RNC alone; party codes in the SIGA XML are now composed per the XSD | Freddie supplied the SIGA screen: the document type dropdown (CED/PAS/RNC/TID) makes the identifier dynamic |
| 2026-09-02 | Excel import matches normalised header aliases rather than exact names | Client spreadsheets vary in capitalisation and accents |
