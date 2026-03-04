# Gas Station Nigeria — Deployment Guide

Full-stack LPG retail platform. **Next.js 14 + PostgreSQL (Supabase) + Pusher + Vercel.**

---

## Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | NextAuth.js (JWT) |
| Realtime | Pusher WebSockets |
| Hosting | Vercel |
| Styling | CSS Modules + Google Fonts |

---

## Step 1 — Set up Supabase (Database)

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a region close to Nigeria (e.g. **eu-west-1** or **us-east-1**)
3. Once created, go to **Project Settings → Database**
4. Copy the two connection strings:
   - **Transaction pooler** → your `DATABASE_URL`
   - **Session pooler** → your `DIRECT_URL`

---

## Step 2 — Set up Pusher (Real-time)

1. Go to [pusher.com](https://pusher.com) → **Create App**
2. Name it `gasstation`, choose cluster **mt1** (closest to Nigeria)
3. Go to **App Keys** and copy:
   - `app_id`, `key`, `secret`, `cluster`

---

## Step 3 — Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@..."
DIRECT_URL="postgresql://postgres.[ref]:[password]@..."
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
PUSHER_APP_ID="..."
PUSHER_KEY="..."
PUSHER_SECRET="..."
PUSHER_CLUSTER="mt1"
NEXT_PUBLIC_PUSHER_KEY="..."
NEXT_PUBLIC_PUSHER_CLUSTER="mt1"
```

---

## Step 4 — Install & Run Locally

```bash
npm install
npm run db:push      # Push schema to Supabase
npm run db:seed      # Seed demo data (outlets, users, 30 days of transactions)
npm run dev          # Start at http://localhost:3000
```

---

## Step 5 — Deploy to Vercel

### Option A: Vercel CLI (fastest)
```bash
npm i -g vercel
vercel
# Follow prompts — it detects Next.js automatically
```

### Option B: GitHub (recommended for production)
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import repo
3. Add all environment variables from your `.env.local`
4. Change `NEXTAUTH_URL` to your Vercel domain: `https://your-app.vercel.app`
5. Click **Deploy**

After deploy, run the seed once via Vercel CLI:
```bash
vercel env pull .env.local   # pulls production env vars
npm run db:seed              # seeds production database
```

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@gasstation.ng | Admin@2026 |
| Outlet 1 (Lagos Island) | outlet1@gasstation.ng | Outlet1@26 |
| Outlet 2 (Surulere) | outlet2@gasstation.ng | Outlet2@26 |
| Outlet 3 (Ikeja) | outlet3@gasstation.ng | Outlet3@26 |
| Outlet 4 (Lekki Phase 1) | outlet4@gasstation.ng | Outlet4@26 |
| Customer A | demo.a@gasstation.ng | Demo@001 |
| Customer B | demo.b@gasstation.ng | Demo@002 |
| Customer C | demo.c@gasstation.ng | Demo@003 |

---

## Project Structure

```
gasstation-app/
├── app/
│   ├── (app)/              # Authenticated pages (sidebar layout)
│   │   ├── dashboard/      # Admin: live multi-outlet dashboard
│   │   ├── outlets/        # Admin: outlet management
│   │   ├── transactions/   # Admin + Outlet: transaction history
│   │   ├── customers/      # Admin: registered customers
│   │   ├── settings/       # Admin: price rate, platform config
│   │   ├── pos/            # Outlet staff: POS terminal
│   │   ├── outlet-dash/    # Outlet staff: own dashboard
│   │   └── profile/        # Customer: profile + history
│   ├── api/
│   │   ├── auth/           # NextAuth handler
│   │   ├── transactions/   # GET list, POST new sale
│   │   ├── dashboard/      # Aggregated stats
│   │   ├── cylinders/[id]/ # Cylinder ID lookup
│   │   ├── profile/        # Customer profile data
│   │   ├── price/          # Current rate
│   │   ├── register/       # New customer registration
│   │   └── admin/          # Price update, customers list
│   ├── login/              # Login page
│   └── register/           # Customer registration flow
├── components/
│   └── Sidebar.tsx         # Role-aware sidebar
├── lib/
│   ├── prisma.ts           # DB client singleton
│   ├── auth.ts             # NextAuth config
│   ├── pusher.ts           # Real-time client + server
│   └── utils.ts            # ₦ formatter, date helpers
├── prisma/
│   ├── schema.prisma       # Full DB schema
│   └── seed.js             # Demo data seeder
├── .env.example            # Environment variable template
├── vercel.json             # Vercel deployment config
└── README.md
```

---

## How Real-time Works

Every time a sale is recorded via the POS:
1. API saves to PostgreSQL
2. API triggers a Pusher event on `gasstation-public` channel
3. Admin dashboard + outlet dashboard receive the event instantly
4. KPI cards and transaction feed update without page refresh

---

## Adding a New Outlet

1. Insert a new row in the `Outlet` table (via Supabase dashboard or Prisma Studio)
2. Create a new user with `role = OUTLET_STAFF` and `outletId` pointing to the new outlet
3. That's it — the dashboard picks it up automatically

---

## Security Notes

- Passwords hashed with bcrypt (cost factor 12)
- JWT sessions expire after 8 hours of inactivity
- Outlet staff are scoped — API enforces `outletId` matching
- Customers can only see their own cylinder transactions
- Admin role required for price changes and customer list
- HTTPS enforced automatically by Vercel
