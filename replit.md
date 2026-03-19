# Recoonlytics — replit.md

## Overview

Recoonlytics is a professional data analysis SaaS platform. Users upload CSV, Excel, or PDF files, and the app processes them entirely in the browser — no data ever hits the server. The backend handles authentication, usage tracking, and email only.

**Key capabilities:**
- File upload: CSV, XLSX, PDF with drag-and-drop (up to 20MB)
- Data normalization, cleaning, statistics, duplicates detection, interactive charts
- AI-powered insights and natural language queries (premium)
- Multi-file merging and PDF data extraction (premium)
- Full SaaS with signup/login, email verification, usage limits, and plan tiers

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend (React + Vite)

- **Framework**: React 18 + TypeScript, bundled by Vite
- **Routing**: `wouter` with these routes:
  - `/` → Home page (upload)
  - `/dashboard` → Analysis dashboard
  - `/pricing` → Pricing page with plan comparison + Cashfree buy buttons
  - `/verify-email?token=...` → Email verification
  - `/forgot-password` → Password reset request
  - `/reset-password?token=...` → Password reset completion
  - `/payment-success?order_id=...` → Post-payment verification page
  - `/payment-failed` → Payment failure page
  - `/privacy`, `/terms`, `/security`, `/contact` → Legal pages
- **State management**: React Context API
  - `DataContext` — uploaded data, cleaning state, columns, normalization
  - `ThemeContext` — light/dark mode (persisted in localStorage)
  - `AuthContext` — JWT session, user info, login/signup/logout
  - `UsageContext` — browser tracking, anonymous limits, feature gates, modals

### Auth System

- **JWT tokens** stored in `localStorage` (key: `rco_token`)
- **Browser ID** stored in `localStorage` (key: `rco_browser_id`) for anonymous tracking
- **Anonymous users**: 2 free analyses lifetime (localStorage tracked)
- **Free users (signed in)**: 3 analyses per day (server-tracked)
- **Premium users**: 300 analyses per month (server-tracked)

### Plans

| Plan | Price | Limit | Duration |
|---|---|---|---|
| Free | ₹0 forever | 3/day | Unlimited |
| Founder | ₹2,999 one-time | 300/month | 365 days (first 300 buyers) |
| Early | ₹2,999 one-time | 300/month | 180 days (next 300 buyers) |
| Pro | ₹2,999 one-time | 300/month | 30 days (after 600 buyers) |

### Gumroad Payment Integration (Primary)

- **Provider**: Gumroad external checkout
- **Product URL**: https://recoonlytics.gumroad.com/l/bfkkx ($34/month)
- **Flow**:
  1. Authenticated user clicks "Get Pro" on `/pricing` or `PricingModal`
  2. Frontend calls `POST /api/payment/initiate-gumroad` → marks `pendingPayment=true`, `paymentProvider="gumroad"` in DB
  3. User redirected to Gumroad checkout URL
  4. After paying, user returns to app and sees banner: "I have completed payment"
  5. User clicks banner button → `POST /api/payment/confirm-gumroad` → activates Pro plan (30 days, 300 uploads/month)
- **Pending state fields on users**: `pendingPayment`, `pendingPlan`, `pendingDate`, `paymentProvider`
- **Banner**: `PendingPaymentBanner` component shown globally when `user.pendingPayment === true`
- **Files**: `server/routes.ts` (Gumroad routes), `client/src/components/PendingPaymentBanner.tsx`

### Cashfree Payment Integration (Backup)

- **Provider**: Cashfree Payment Gateway (kept for reference)
- **Env vars**: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV`
- **Files**: `server/cashfree.ts`, routes `/api/payment/create-order`, `/api/payment/verify`

### Feature Gates (premium only)

| Feature | Key |
|---|---|
| AI Report | `ai_report` |
| AI Assistant chat | `ai_assistant` |
| Combine files | `combine_files` |
| PDF extraction | `pdf_upload` |
| Advanced cleaning | `advanced_cleaning` |
| Fuzzy duplicate detection | `fuzzy_duplicates` |

### Backend (Express)

- **Auth routes** (`server/routes.ts`):
  - `POST /api/auth/signup` — Create account, send verification email
  - `POST /api/auth/login` — JWT login with rate limiting (10 attempts per 15min)
  - `GET /api/auth/me` — Get current user (JWT required)
  - `POST /api/auth/verify-email` — Verify email with token
  - `POST /api/auth/resend-verification` — Resend verification email
  - `POST /api/auth/forgot-password` — Send password reset email
  - `POST /api/auth/reset-password` — Complete password reset
  - `POST /api/auth/record-usage` — Increment usage counter (enforces limits)
  - `GET /api/config/spots` — Get founder/early plan spots remaining
- **Payment routes** (`server/routes.ts`):
  - `POST /api/payment/create-order` — Creates Cashfree order, stores pending payment
  - `POST /api/payment/verify` — Verifies Cashfree order status, activates plan + updates tier counters
- **Storage** (`server/storage.ts`): PostgreSQL via Drizzle ORM (`PgStorage`)
- **Email** (`server/email.ts`): ZeptoMail SMTP — verification, welcome, password reset HTML emails

### Database Schema (`shared/schema.ts`)

| Table | Purpose |
|---|---|
| `users` | User accounts with plan, usage counters, email verification, planStartDate, planEndDate |
| `verification_tokens` | Email verification (24hr expiry, UUID) |
| `reset_tokens` | Password reset (1hr expiry, single-use) |
| `plan_config` | Founder/Early spot counters (founderSpotsUsed, earlySpotsUsed) |
| `payments` | Payment records (orderId, status, planType, paidAt, Cashfree) |

### Key Client Contexts

| Context | File | Purpose |
|---|---|---|
| `AuthContext` | `context/AuthContext.tsx` | JWT session, user info, login/signup/logout |
| `UsageContext` | `context/UsageContext.tsx` | Browser ID, usage limits, feature gates, modals |
| `ThemeContext` | `context/ThemeContext.tsx` | Light/dark mode |
| `DataContext` | `context/DataContext.tsx` | File parsing, data state |

### Key Auth Components

| Component | Purpose |
|---|---|
| `auth/AuthModal.tsx` | Login/signup modal (Escape key + backdrop to close) |
| `auth/PricingModal.tsx` | Upgrade prompt with plan cards (Escape key + backdrop) |
| `auth/LimitModal.tsx` | Usage limit reached dialog |
| `auth/FeatureLock.tsx` | Overlay lock for premium features |
| `auth/AccountPanel.tsx` | User avatar dropdown with usage bar, logout, upgrade |
| `auth/UsageBar.tsx` | Compact usage progress bar (used in navbar/header) |

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Recommended | JWT signing secret (defaults to hardcoded fallback) |
| `SMTP_HOST` | For email | ZeptoMail SMTP host (smtp.zeptomail.in) |
| `SMTP_PORT` | For email | SMTP port (465) |
| `SMTP_USER` | For email | SMTP username (emailapikey) |
| `SMTP_PASS` | For email | SMTP password/API key |
| `EMAIL_FROM` | For email | From address (support@recoonlytics.com) |
| `APP_URL` | For email | App base URL for email links |
| `NODE_ENV` | No | dev / production |

---

## Data Flow

```
Anonymous user uploads file
  → UsageContext.recordAnalysis() checks localStorage (max 2)
  → If limit: show LimitModal → prompt to signup
  → Else: DataContext.processFile() → parse in browser → navigate to /dashboard

Signed-in free user uploads file
  → recordAnalysis() → POST /api/auth/record-usage (checks 3/day)
  → If limit: show LimitModal → prompt to upgrade
  → Else: process in browser → dashboard

Premium user uploads file
  → recordAnalysis() → POST /api/auth/record-usage (checks 300/month)
  → Process in browser → dashboard with all features unlocked
```

---

## Important Configuration Notes

- **vite.config.ts** MUST have: `host: "0.0.0.0"`, `port: 5000`, `allowedHosts: true`
- **server/index.ts**: simple `httpServer.listen(PORT, "0.0.0.0", callback)` — NO retry/fuser logic
- **Two Button components coexist**: `button.tsx` (shadcn) and `Button.tsx` (custom) — intentional
- **pdfjs worker**: uses `new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href`
- **Support email**: support.reconlytics@gmail.com (NOT updated in branding changes)
- **Date format**: "5 Jan 2024" (D Mon YYYY) — cleaning engine standard
