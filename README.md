# MedFinder — Medicine Availability Search

MedFinder helps patients in Addis Ababa find nearby pharmacies that currently have a medicine in stock. It combines a patient search experience with pharmacy inventory tools, owner registration, and admin approval.

## Features

- **Patient search** with typo suggestions, distance, stock freshness, and availability states.
- **Pharmacy workspace** with per-row stock updates, "save all changes", CSV import, and a single-product add form.
- **Authentication** for normal users with secure, database-backed sessions.
- **Pharmacy owner applications** reviewed by an administrator before going live.
- **Admin console** to approve, reject, revoke, or permanently remove a pharmacy.
- Only **approved** pharmacies and their stock appear in patient search.
- Demo pharmacies, medicines, and an administrator account are seeded automatically.

## Tech stack

- Next.js 16 (App Router) and React 19
- TypeScript
- Tailwind CSS 4
- Drizzle ORM with PostgreSQL
- Node.js `crypto` for password hashing and session tokens (no external auth service)

## Getting started

### Prerequisites

- Node.js 20 or newer
- PostgreSQL 14 or newer

### Setup

```bash
npm install
```

Create your environment file:

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Create the database and push the schema:

```bash
createdb medfinder
npx drizzle-kit push
```

If your PostgreSQL runs on a different port or uses different credentials, update `DATABASE_URL` in `.env` first. Then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Demo pharmacies, medicines, and the admin account are seeded on the first request.

### Administrator access

| Field | Value |
| --- | --- |
| Email | `admin@medfinder.local` |
| Password | `Admin123!` |

You can override these with `ADMIN_EMAIL` and `ADMIN_PASSWORD` before the admin account is first created.

## Main flows

1. **Patients** search for a medicine by generic name, brand, or a close spelling, then compare nearby pharmacies by distance, availability, and how recently the stock was confirmed.
2. **Pharmacy owners** create a normal account, submit their pharmacy details from `/pharmacy/register`, and wait for admin approval. Once approved, they can manage stock from `/pharmacy`.
3. **Administrators** review applications at `/admin`, approve or reject them, and remove pharmacies that should not be listed.

### Adding inventory

- **Single product** — use **Add product** in the inventory panel to add one medicine at a time with strength, form, category, availability, quantity, and an optional price.
- **Bulk** — use **Import CSV** with `medicine`, `status`, and `quantity` columns. A template is available in the dashboard.

## Scripts

```bash
npm run dev        # start the development server
npm run build      # production build
npm run start      # start the production server
npm run lint       # run ESLint
npm run typecheck  # run the TypeScript compiler
```

## Notes

- This is a pilot/demo project. Availability data is sample data and is not live pharmacy stock.
- Stock listings older than 24 hours are marked as unconfirmed in patient search.
- Never commit `.env`. Use `.env.example` as the template for local configuration.
