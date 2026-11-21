<div align="center">

# 💊 Sama Pharmacy — Desktop Pharmacy Management System

**Offline-first, Arabic-first Windows application for running an Egyptian pharmacy — built so a cashier can finish a full sale without touching the mouse.**

![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Vite](https://img.shields.io/badge/electron--vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

</div>

---

## 🎯 Design Principles

1. **The counter is the product** — every other screen exists to keep the sales screen accurate.
2. **Keyboard first** — barcode scanner + keyboard only at the POS.
3. **Offline by default** — no internet needed to sell.
4. **Batches, not products** — stock is tracked per batch with its own expiry and cost.
5. **Nothing is deleted** — corrections are reversing entries, every movement is audited.

## ✨ Modules

| Area | What it covers |
|---|---|
| 🧾 **Sales (POS)** | Fast barcode sales, FEFO batch allocation, sales returns |
| 📥 **Purchases** | Supplier invoices, bonus quantities, landed cost, purchase returns |
| 📦 **Stock & Warehouses** | Batch/expiry tracking, multi-warehouse, full stock-move ledger |
| 💵 **Cash & Shifts** | Cash drawer, shift open/close and reconciliation |
| 👥 **Customers & Suppliers** | Credit accounts and balances |
| 🏥 **Insurance** | Insurance-company sales and claims |
| ⚠️ **Narcotics Register** | Regulated-drug tracking as required in Egypt |
| 📊 **Reports & Audit** | Sales reports and a complete audit log |
| ⚙️ **Settings & Hardware** | Receipt printers and barcode scanners |

## 🏗️ Architecture

A typed **monorepo** with a strict boundary between UI and data:

```
packages/core     Pure domain logic (money, FEFO, landed cost, Arabic normalisation) — unit tested
packages/db       Schema, migrations, repositories (better-sqlite3)
packages/api      Service layer — the IPC / HTTP seam
packages/shared   Types, IPC contracts, zod schemas
apps/desktop      Electron main process, utilityProcess for SQLite, preload bridge
apps/renderer     React UI (Arabic, RTL, Cairo font)
```

**Engineering highlights**
- 💰 Money stored as **integer piastres** — no floating-point errors
- 🧵 SQLite runs in an Electron **`utilityProcess`** so the UI never freezes
- 🔒 `contextIsolation: true`, `nodeIntegration: false` — renderer talks only through a typed preload bridge
- 🔤 Arabic text normalised on write for reliable search
- ⌨️ Keyboard handling uses `event.code` so scanners work even with an Arabic keyboard layout
- 🧪 Vitest unit tests for the core domain logic

📚 Design docs live in [`docs/`](./docs) — spec, architecture & UI blueprint, schema and hardware notes.

## 🚀 Getting Started

```bash
git clone https://github.com/mos1239487394823939839223/samaPharmacy.git
cd samaPharmacy
npm install            # also rebuilds better-sqlite3 for Electron
npm run dev
```

| Script | Description |
|---|---|
| `npm run dev` | Run the app in development |
| `npm test` | Core + database tests |
| `npm run typecheck` | TypeScript check |
| `npm run package:win` | Build the Windows installer (NSIS) |

---

<div align="center">

Built by **[Mustafa Anwer Hamed](https://github.com/mos1239487394823939839223)**

</div>
