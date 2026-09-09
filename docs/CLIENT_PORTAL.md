# Client Portal — Design

Status: **v0 implemented** (2026-09-02). This document records the design decisions behind the
first cut and what is intentionally deferred.

## Goal

Give each importer (cliente) a self-service, read-only view of the customs files the brokerage is
handling for them, so they stop calling to ask "where is my container". Staff keep working in the
main app; the portal is a separate, narrower surface on the same data.

## Decisions

| Question | Decision | Why |
|---|---|---|
| Same app or separate app? | Same SPA, separate route tree (`/portal`, `/portal/:id`) | One codebase, one deploy, same stores. A separate app can be split out later once there is a backend. |
| How is a client identified? | `User.clienteKey` = the cliente primary key, the pair (document type, number) rendered as `RNC:101000011` | The document already identifies the importer on every declaration, so no new join table is needed. |
| What can a client see? | Only expedientes whose `entidadKey(importador)` equals their `clienteKey` | Enforced in `ClientPortalPage` (list filter) and `ClientPortalDetailPage` (404 on mismatch). |
| What can a client do? | Nothing that writes. No edits, no observations, no checklist toggles. | Writes need an audit trail and a backend before they are safe. |
| Which observations? | Only those marked `publica`. Staff toggle each one, and the add box has a "visible para el cliente" switch. | Internal notes ("falta permiso", "cliente no responde") must never reach the portal. |
| Navigation | `Layout` filters `NAV_ITEMS` by role; clients only see "Mis Expedientes" and no notification bell | Notifications reference all expedientes and would leak other clients' data. |
| Route guard | `ProtectedRoute roles={['cliente']}` for portal, `roles={['admin','digitador']}` for staff; wrong role redirects to `homeForRole()` | A client who types `/expedientes` lands back on `/portal`; a staff user who types `/portal` lands on `/dashboard`. |
| Login landing | `homeForRole(user.role)` | Clients never see the staff dashboard. |

## What the client sees

**List (`/portal`)**: welcome by client name (from Relacionados), three counters (active /
completed / total), and one card per expediente showing reference, type, status chip,
shipping doc, ETA and checklist progress.

**Detail (`/portal/:id`)**: a `Stepper` over the nine statuses showing the current stage,
key declaration fields (ETA, declaration no., BL, clearance type, administration, country,
port, regime, CIF total, case manager), containers, line items, the checklist (disabled
checkboxes) and the observation timeline in read-only mode.

Deliberately hidden: valores breakdown beyond CIF total, suplidores, documentos/invoice
values, digitador, internal notes semantics. Revisit once the brokerage decides what is
client-facing.

## Deferred (needs a backend)

- Real authentication per client. Today there are two ways in: the mock user `cliente@aduana.com`, and an access link `#/acceso/<token>` an admin copies from the Relacionados grid. **The token is unsigned base64 of the cliente key** — fine for a POC, unacceptable in production.
- Multiple users per client company; a user linked to several documents.
- Document upload/download (BL, invoices, DGA release).
- Client-originated messages (would become observations tagged with origin = cliente).
- Email/WhatsApp notifications on status change.
- Branding per client (logo on the portal).

## Test accounts

| Email | Password | Sees |
|---|---|---|
| cliente@aduana.com | cliente123 | Expedientes of RNC 101-00001-1 (BRAVO S A), key `RNC:101000011` |
