# Billio

Streamlined invoicing for freelancers and self-employed people, built with **Next.js 14 (App Router, JavaScript/JSX)**, **Tailwind CSS v4**, **shadcn/ui**, **pdf-lib**, **Resend** and **Supabase** (Postgres + Auth).

Each user configures their billing profile once (issuer, client, amount, currency and concept) and from then on can:

- **Issue and send an invoice in one click**: pick the month, review a preview, confirm. Billio generates the PDF and emails it with Resend.
- **Automate the monthly send**: a Vercel cron calls `/api/cron` on the 1st of every month at 14:00 UTC and issues invoices for every user with auto-send enabled, with no duplicates.
- **Browse the history**: every invoice (manual and automatic) with date, period, client, amount, concept, source and status, plus PDF download.
- **Void or delete**: sent invoices can be voided (kept in the history, period freed up); invoices that were never sent can be deleted.

---

## 1. Stack and structure

```
billio/
├── .env.example
├── jsconfig.json
├── next.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── tailwind.config.js
├── vercel.json                      # cron "0 14 * * *" -> /api/cron (daily)
├── app/
│   ├── globals.css
│   ├── layout.js                    # root layout + Toaster (Sonner)
│   ├── page.js                      # public landing page
│   ├── icon.svg                     # favicon
│   ├── apple-icon.jsx               # 180x180 Apple touch icon (ImageResponse)
│   ├── login/page.jsx
│   ├── auth/callback/route.js       # Google OAuth callback
│   ├── (app)/
│   │   ├── layout.js                # protected layout (redirects to /login)
│   │   ├── dashboard/page.jsx       # quick issue + summary
│   │   ├── invoices/page.jsx        # history
│   │   └── profile/page.jsx         # billing profile
│   └── api/
│       ├── auth/register/route.js   # POST  sign up (not exposed in the UI)
│       ├── auth/login/route.js      # POST  sign in (session cookie)
│       ├── auth/logout/route.js     # POST  sign out
│       ├── auth/me/route.js         # GET   user + profile
│       ├── profile/route.js         # GET / PUT profile
│       ├── invoices/route.js        # GET history / POST preview or issue
│       ├── invoices/preview/route.js   # POST draft PDF (no DB write)
│       ├── invoices/[id]/route.js   # DELETE unsent / POST void sent
│       ├── invoices/[id]/pdf/route.js  # GET PDF download
│       └── cron/route.js            # GET daily auto-send, per-account send day (Bearer CRON_SECRET)
├── components/
│   ├── app-nav.jsx
│   ├── auth-form.jsx
│   ├── invoice-history.jsx
│   ├── invoice-preview-dialog.jsx
│   ├── profile-form.jsx
│   ├── quick-issue.jsx
│   └── ui/                          # shadcn/ui components
│       ├── badge.jsx
│       ├── button.jsx
│       ├── card.jsx
│       ├── dialog.jsx
│       ├── input.jsx
│       ├── label.jsx
│       ├── select.jsx
│       ├── separator.jsx
│       ├── sonner.jsx
│       └── table.jsx
├── middleware.js                    # refreshes the Supabase session on every request
├── supabase/
│   └── migrations/
│       ├── 20261026120000_create_profiles_and_invoices.sql
│       ├── 20261026180000_add_reply_to_email.sql
│       ├── 20261026200000_add_recipient_name.sql
│       ├── 20261026210000_add_invoice_cancellation.sql
│       ├── 20261026220000_fix_table_privileges.sql
│       ├── 20261026230000_add_invoice_update_policy.sql
│       └── 20261026240000_grant_service_role_privileges.sql
└── lib/
    ├── api.js                       # JSON response and validation helpers
    ├── db.js                        # data access (profiles, invoices)
    ├── format.js                    # months, currency, dates, periods
    ├── invoices.js                  # issueInvoice / voidInvoice / removeInvoice
    ├── pdf.js                       # PDF generation with pdf-lib
    ├── resend.js                    # email delivery with Resend
    ├── utils.js                     # cn()
    └── supabase/
        ├── admin.js                 # secret-key client (cron only)
        ├── browser.js               # browser client (sign in/out)
        ├── server.js                # server client bound to the session
        └── session.js               # session refresh (middleware)
```

### Data model

Two tables in `public`, one row per account and one per invoice (see the migrations):

| Table | Contents |
|---|---|
| `profiles` | Billing data per account: issuer, client (`recipient_name`, `recipient_tax_id`, `recipient_email`), amount, currency, concept, `auto_send` and optional `reply_to_email`. `user_id` is the primary key. |
| `invoices` | Issued invoices: period, client (name, tax ID and email), amount, source (`manual`/`cron`), status (`pending`/`sent`/`failed`/`cancelled`), `resend_id`, `reply_to_email`, cancellation (`cancelled_at`, `cancel_reason`, `replaces_id`) and timestamps. |

Users live in **Supabase Auth** (`auth.users`); both tables reference it with `on delete cascade`.

### How idempotency works

`invoices` has a **partial** unique index on `(user_id, year, month) WHERE cancelled_at IS NULL`. `issueInvoice` inserts the invoice before sending it:

- If the insert hits the index, an active invoice already exists for that period → **409** (`already_issued`). If Vercel retries the cron, nothing is duplicated.
- If the send fails, the invoice is deleted (it never entered the history) and the period is free to retry.
- Voided invoices do not count, so a new one can be issued for the same period.

No locks are needed: the database guarantees uniqueness even if two requests arrive at the same time.

### Preview before sending

Manual issuing is a two-step flow to avoid mistakes:

1. **Review**: `POST /api/invoices` with `{ year, month, preview: true }` returns the draft (number, period, issuer, client, concept and amount) **without writing to the database or sending anything**. The "View PDF" button calls `POST /api/invoices/preview`, which renders the draft PDF in memory (it is a POST so there is no URL that can mint invoices without confirmation).
2. **Confirm**: `POST /api/invoices` with `{ year, month }` issues, sends and records the invoice.

The cron skips the preview and issues directly.

### Voiding and deleting invoices

A sent invoice is a fiscal record, so it is never deleted:

- **Void** (`POST /api/invoices/[id]` with `{ reason? }`): the invoice moves to `cancelled`, stores `cancelled_at` and the reason, and **the period becomes available again**. The new invoice is linked through `replaces_id`.
- **Delete** (`DELETE /api/invoices/[id]`): only for invoices that were never sent (`pending`/`failed`). Sent or cancelled invoices return **422**.

In the UI, cancelled invoices are **hidden by default** (with a counter and a "Show cancelled" toggle) so the history stays readable.

### Client replies (Reply-To)

The `From` address is always the domain verified in Resend (`facturas@lowfly.travel`), because Gmail, Outlook and friends reject mail whose domain does not authorise it (SPF/DKIM/DMARC). So replies go to the right person through `Reply-To`:

- The profile has an optional **Reply-to email** field. If empty, the Supabase account email is used.
- The value is stored in `profiles.reply_to_email` and copied to `invoices.reply_to_email` when the invoice is issued (a record of where replies went).
- It is used as `replyTo` in Resend, shown in the email body as the contact address and printed in the PDF under the issuer name.

The client just hits "Reply" and the message reaches the person who invoices, without each user configuring their own SMTP.

### Security

- Sign up, sign in and passwords are handled by **Supabase Auth** (session in `httpOnly` cookies refreshed by the middleware on every request).
- **RLS enabled** on `profiles` and `invoices`: each person only reads and writes their own rows (`auth.uid() = user_id`). Default privileges are revoked and only the needed ones are granted.
- The secret key (`SUPABASE_SECRET_KEY`) is only used server-side, by the cron, to read profiles with auto-send enabled.
- `/api/cron` requires `Authorization: Bearer <CRON_SECRET>`; a missing or wrong header returns **401**.

---

## 2. shadcn/ui setup

The components in `components/ui/` were generated with the official shadcn CLI (`shadcn@latest`), not written by hand. The dependencies it adds (`radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `lucide-react`, `sonner`, `next-themes`) are already in `package.json`.

> Tailwind is **v4**: there is no `theme.extend` in `tailwind.config.js` (colours live in `app/globals.css` as `oklch()` variables) and animations come from `tw-animate-css` instead of `tailwindcss-animate`.

To regenerate them or add more:

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card input label select table badge dialog separator sonner
```

Components import `cn` from `@/lib/utils` and primitives from the unified `radix-ui` package.

`components.json` (equivalent to what `shadcn init` generates):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": false,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

---

## 3. Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (`https://xxxx.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`). Safe to expose to the browser. |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_...`). **Server only** (cron). Never prefix it with `NEXT_PUBLIC_`. |
| `RESEND_API_KEY` | Resend API key (`re_...`). |
| `RESEND_FROM` | Sender on a domain verified in Resend (e.g. `Billio <facturas@lowfly.travel>`). For testing: `Billio <onboarding@resend.dev>`. |
| `CRON_SECRET` | Cron secret. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically. |

---

## 4. Service configuration

### 4.1 Resend

1. Create an account at <https://resend.com> and generate an API key under **API Keys**.
2. Use a domain already verified under **Domains**. If the domain is verified in your account (from another project), there is nothing to add: just change the sender in `RESEND_FROM`. For a new domain, add it and publish the DNS records Resend shows you.
3. While the domain is unverified, Resend only allows sending from `onboarding@resend.dev` and only to your own account address.

### 4.2 Supabase (Postgres + Auth)

1. Create a project at <https://supabase.com/dashboard>.
2. Apply the migrations. With the Supabase CLI:

   ```bash
   pnpm dlx supabase@latest link --project-ref <project-ref>
   pnpm dlx supabase@latest db push
   ```

   Or paste each file from `supabase/migrations/` into the dashboard **SQL Editor**, in filename order.
3. Copy the URL, the publishable key and the secret key from **Settings → API** into `.env.local` (and into the Vercel environment variables).
4. Under **Authentication → Providers → Email**, decide whether to require email confirmation: with it enabled, people get an email after signing up and sign in afterwards; without it, signing up opens a session directly.
5. Under **Authentication → URL Configuration**, add the production URL and `http://localhost:3000` as *Redirect URLs*.

### 4.3 Google sign-in (optional)

1. At <https://console.cloud.google.com> create a project → **APIs & Services → OAuth consent screen** (type *External*, add your email as a test user).
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. Under **Authorized redirect URIs** put exactly the Supabase callback:
   `https://<project-ref>.supabase.co/auth/v1/callback`
4. Copy the *Client ID* and *Client Secret* into Supabase: **Authentication → Providers → Google** → enable it, paste them and save.
5. Under **Authentication → URL Configuration → Redirect URLs** add `http://localhost:3000/auth/callback` and `https://your-app.vercel.app/auth/callback`.

Google is the **only** sign-in method in the UI: `/login` shows a single "Iniciar sesión con Google" button and there is no separate registration page — the account is created on first sign-in. The callback lives in `app/auth/callback/route.js` and stores the session in cookies. The email/password endpoints (`app/api/auth/register`, `app/api/auth/login`) still exist server-side, so the method can be re-enabled by adding the fields back to `components/auth-form.jsx`.

### 4.4 Cron

`vercel.json` already contains:

```json
{
  "crons": [{ "path": "/api/cron", "schedule": "0 14 * * *" }]
}
```

Vercel calls `/api/cron` **every day at 14:00 UTC** with `Authorization: Bearer $CRON_SECRET`. Each profile stores its own `sendDay` (1–28); the endpoint only issues an invoice for accounts whose `sendDay` matches today's UTC day, and skips the rest as `not_today`.

The billed period depends on `sendDay` (`periodForSendDay` in `lib/format.js`):

| `sendDay` | Period billed |
|---|---|
| `1` | The current month |
| `2`–`28` | The previous month |

The day is capped at 28 so it exists in every month, including February.

#### What the cron needs to work

All of these are required; if any is missing the run fails:

| Requirement | Where | What happens without it |
|---|---|---|
| `CRON_SECRET` | Vercel env vars | Every call returns **401** and Vercel marks the run as failed. |
| `RESEND_API_KEY` + `RESEND_FROM` | Vercel env vars | `issueInvoice` throws, the invoice is deleted and every account reports `failed`. |
| `SUPABASE_SECRET_KEY` | Vercel env vars | `getAutoSendUsers()` throws (no session available) → **500**. |
| A redeploy after adding the variables | Vercel | Env vars only apply to a new build. |
| **Auto-send enabled** in the profile | `/profile` | The run returns `processed: 0` and does nothing. |

#### Timing notes

- `currentPeriod()` uses **UTC**, so the billed month is the UTC month at 14:00 on the 1st. That is correct for time zones from UTC-14 to UTC+10. If you ever move the schedule to 00:00 UTC, negative-offset zones would bill the previous month.
- On the **Hobby** plan crons run at most once per day and may fire up to ~59 minutes late. `0 14 * * *` fits that limit; the unique index makes a late or retried run harmless.

#### Diagnosing a cron run

1. **Vercel → Settings → Cron Jobs**: check the job exists and its last run status.
2. **Vercel → Logs**, filter by `/api/cron`: the endpoint returns a JSON summary with `processed`, `sent`, `skipped`, `failed` and a per-account `results` array.
3. Common outcomes:
   - `401` → `CRON_SECRET` missing in Vercel or the deployment predates it.
   - `500` → `SUPABASE_SECRET_KEY` missing or invalid.
   - `failed` with `reason: "42501"` and `permission denied for table profiles` → the `service_role` role lacks table privileges. Apply `20261026240000_grant_service_role_privileges.sql`. If it persists, the code path is using the session client instead of the secret-key client: `issueInvoice({ ..., admin: true })` must be passed from the cron.
   - `processed: 0` → no profile has `auto_send = true`.
   - `failed` with `send_failed` → Resend key missing/invalid or the sender domain is not verified.
   - `skipped` with `already_issued` → expected: that period already has an active invoice.
   - `not_today` → that account's `sendDay` is not today; nothing to do.

---

## 5. Deploying to Vercel

1. Push the repository to GitHub/GitLab/Bitbucket.
2. In Vercel, **Add New → Project** and import the repository. Framework: **Next.js** (auto-detected); Vercel uses `pnpm install` thanks to `pnpm-lock.yaml`.
3. Under **Settings → Environment Variables** add the six variables from `.env.example` (Supabase, Resend and `CRON_SECRET`) for Production, Preview and Development.
4. **Deploy**. The cron shows up under **Settings → Cron Jobs**.
5. Open the URL, create an account, fill in the profile and try a manual issue.

> The Vercel Hobby plan allows crons that run once per day; `0 14 1 * *` (monthly) fits. Pro plans can use finer schedules.

---

## 6. Running locally

```bash
pnpm install
cp .env.example .env.local   # fill in the values
pnpm dev                     # http://localhost:3000
```

Manual issuing walkthrough:

1. Sign in with Google at `/login` (the account is created on first sign-in).
2. At `/profile` fill in issuer, client email, amount, currency and concept, then save.
3. At `/dashboard` pick the month, press **Generate and send invoice**, review the preview and confirm.
4. Check the recipient inbox (or **Emails** in Resend) and the new row at `/invoices`.
5. Repeat with the same month: the API responds **409** (`already_issued`).

### Testing `/api/cron` with curl

```bash
# No header -> 401
curl -i http://localhost:3000/api/cron

# Wrong secret -> 401
curl -i -H "Authorization: Bearer wrong" http://localhost:3000/api/cron

# Correct secret -> 200 and a summary
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron | jq
```

Example response:

```json
{
  "period": { "year": 2026, "month": 10 },
  "processed": 1,
  "sent": 1,
  "skipped": 0,
  "failed": 0,
  "results": [{ "userId": "...", "status": "sent", "invoiceId": "...", "number": "BIL-202610-XXXXXX" }]
}
```

Run it twice in a row: the second run must return `skipped` with `reason: "already_issued"` for accounts already billed.

### Testing the other endpoints

```bash
# Sign up (not exposed in the UI; returns { signedIn: false } when Supabase requires email confirmation)
curl -c cookies.txt -X POST http://localhost:3000/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"name":"Ana","email":"ana@test.com","password":"password123"}'

curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"ana@test.com","password":"password123"}'

# Profile
curl -b cookies.txt -X PUT http://localhost:3000/api/profile \
  -H 'content-type: application/json' \
  -d '{"issuerName":"Ana Garcia","recipientEmail":"client@company.com","amount":1200,"currency":"EUR","description":"Web design services","autoSend":true}'

# Preview (no DB write, no email)
curl -b cookies.txt -X POST http://localhost:3000/api/invoices \
  -H 'content-type: application/json' -d '{"year":2026,"month":9,"preview":true}'

# Manual issue
curl -b cookies.txt -X POST http://localhost:3000/api/invoices \
  -H 'content-type: application/json' -d '{"year":2026,"month":9}'

# History
curl -b cookies.txt http://localhost:3000/api/invoices

# Void a sent invoice
curl -b cookies.txt -X POST http://localhost:3000/api/invoices/<id> \
  -H 'content-type: application/json' -d '{"reason":"Wrong amount"}'

# Delete an invoice that was never sent
curl -b cookies.txt -X DELETE http://localhost:3000/api/invoices/<id>
```

### Testing notes

- With an invalid `RESEND_API_KEY`, issuing returns **502** (`send_failed`) and the invoice is **not** saved; the period stays free to retry.
- The PDF can be regenerated and downloaded at any time from `/api/invoices/<id>/pdf`.
- If an invoice shows as `pending` in the history after a successful send, the `UPDATE` policy on `invoices` is missing — apply `20261026230000_add_invoice_update_policy.sql`.

---

## 7. Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Development server. |
| `pnpm build` | Production build. |
| `pnpm start` | Production server (requires `pnpm build`). |
| `pnpm lint` | ESLint (`next lint`). |
