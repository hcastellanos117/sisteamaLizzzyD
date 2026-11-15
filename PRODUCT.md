# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary users:** Lizzy Dinora Viera and Sandra Viera, co-owners and stylists at **Salón Lizzy & Sandra**.
- **Usage environment:** Used directly at the salon on the main Windows PC (`http://localhost:3000`) and on their mobile phones over the salon's local Wi-Fi network (`http://<PC-IP>:3000`).

## Product Purpose

Provide fast, friction-free daily cash register control, service charge tracking, personal advances (`vales`), salon expenses (`gastos`), and daily/biweekly (`quincenal`) closeouts so Lizzy and Sandra always know how much cash should be in the drawer and how much each stylist earned without manual spreadsheets or paper notebooks.

## Positioning

A zero-dependency, offline-first local salon register built specifically for two co-working stylists (Lizzy & Sandra) with automatic 50/50 split calculation, instant WhatsApp closeout receipts, and strict cash-session accountability—without requiring internet access, external accounts, or complex POS hardware.

## Operating Context

- **Offline / Local LAN operation:** Runs locally via `Iniciar_Salon.bat` (`node server/index.js`) with a local `db.json` file and automatic daily snapshots in `backups/`.
- **Shift lifecycle:** Each shift starts with an **Apertura de caja** (initial cash float, no password required, locked once registered), followed by service registrations (single or combined services, cash or transfer, optional client/reference), `vales` or `gastos`, and ends with a manual **Corte de caja** (supporting multiple cuts per day with `openedAt`/`closedAt` timestamps) that resets the active register to zero.
- **Sharing:** Closeout summaries (daily and biweekly) are formatted as ready-to-send WhatsApp messages.

## Capabilities and Constraints

- **Currency:** Honduran Lempiras (`Lps`).
- **Revenue split:** Services assigned to Lizzy, Sandra, or both (`Ambas`, split 50/50 automatically). Salon expenses (`gastos`) are deducted directly from Sandra Viera's biweekly payout (`sandraTotal = sandraGross - sandraVales - gastosTotal`).
- **Mandatory cash opening:** New services cannot be registered while the cash register is `closed`.
- **Immutable opening float:** Once the opening cash amount is registered for a shift, it cannot be edited.
- **Admin protection:** Editing or deleting jobs, `vales`, `gastos`, or saved cuts requires the admin password (`Admin911!`, verified via SHA-256 on both client and server).
- **No external internet dependency:** Must work reliably over local HTTP (`http://`) without requiring HTTPS-only browser APIs.

## Brand Commitments

- **Name:** Salón Lizzy & Sandra
- **Language:** Spanish (Honduras / Latin America, `Lps`).

## Product Principles

1. **Speed at the chair:** Registering a service or expense must take seconds on a phone between clients.
2. **Cash accuracy first:** Every shift's opening float, cash payments, `vales`, and `gastos` must reconcile cleanly to physical cash in the drawer.
3. **Zero accidental loss:** Destructive edits/deletions require admin authorization, and daily `backups/` protect local data.
4. **Offline reliability:** Everything works on local Wi-Fi without internet, external CDNs, or HTTPS-only dependencies.

