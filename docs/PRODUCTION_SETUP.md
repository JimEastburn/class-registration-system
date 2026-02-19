# Production Environment Setup — Vercel + Supabase

## Background

The project currently has:

- A **Vercel deployment** at `class-registration-system-two.vercel.app` (single environment, pointing to the development Supabase instance).
- A **development Supabase** project with 30 migrations applied.
- Stripe (test mode), Resend, and Zoho integrations configured for dev.

The goal is to create a **separate production environment** so dev and prod are fully isolated. The production app will be served at `https://class-registration.austinaac.org`.

## Decisions Required

> [!IMPORTANT]
> **Decisions needed before proceeding:**
>
> 1. **Supabase production project name** — e.g. `aac-registration-prod`.
> 2. **Supabase region** — Same as dev, or different?
> 3. **Stripe live mode** — Do you have live-mode keys (`sk_live_*`, `pk_live_*`), or keep test keys for now?
> 4. **Zoho Books** — Same org/credentials, or a separate sandbox?
> 5. **Resend** — Same account/sender, or different?

---

## Phase 1: Create Production Supabase Project

| Step | Action                          | Details                                                                                                                |
| ---- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1.1  | **Create new Supabase project** | Via Supabase Dashboard → New Project. Name appropriately (e.g. `aac-registration-prod`). Choose desired region.        |
| 1.2  | **Run all 30 migrations**       | Use `supabase db push --linked` or run all SQL files from `supabase/migrations/` in order via the SQL Editor.          |
| 1.3  | **Copy Supabase credentials**   | Collect: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.                     |
| 1.4  | **Configure Auth settings**     | Set Site URL to `https://class-registration.austinaac.org`, add Redirect URLs, configure Custom SMTP (Resend).         |
| 1.5  | **Create initial admin user**   | Register an account on the production app, then promote to `super_admin` via SQL (see [DEPLOYMENT.md](DEPLOYMENT.md)). |

---

## Phase 2: Configure Custom Domain (Wix + Vercel)

Since the main domain `austinaac.org` is hosted on Wix, a CNAME record is needed to route the subdomain to Vercel.

### Step 2.1: Add Domain in Vercel

1. Vercel Dashboard → Project → **Settings** → **Domains**
2. Add `class-registration.austinaac.org`
3. Vercel will display the required CNAME target: `cname.vercel-dns.com`

### Step 2.2: Add CNAME Record in Wix

1. Wix Dashboard → **Settings** → **Domains** → click `austinaac.org`
2. Click **Manage DNS Records** → **+ Add Record**
3. Configure:

| Field           | Value                  |
| --------------- | ---------------------- |
| **Type**        | `CNAME`                |
| **Name / Host** | `class-registration`   |
| **Value**       | `cname.vercel-dns.com` |
| **TTL**         | `3600` (1 Hour)        |

4. Save. SSL will be provisioned automatically by Vercel (may take minutes to hours).

> [!NOTE]
> The main site at `www.austinaac.org` is unaffected — only the `class-registration` subdomain is routed to Vercel.

---

## Phase 3: Configure Vercel Production Environment Variables

In the Vercel dashboard, scope **Production** env vars to the new Supabase project. Keep Preview/Development pointing to dev Supabase.

| Variable                             | Value Source                               | Notes                            |
| ------------------------------------ | ------------------------------------------ | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`           | New prod Supabase project                  | Different from dev               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | New prod Supabase project                  | Different from dev               |
| `SUPABASE_SERVICE_ROLE_KEY`          | New prod Supabase project                  | Different from dev               |
| `STRIPE_SECRET_KEY`                  | Stripe live (`sk_live_*`)                  | Or test key if not ready         |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe live (`pk_live_*`)                  | Or test key if not ready         |
| `STRIPE_WEBHOOK_SECRET`              | New webhook endpoint (Phase 4)             | Different from dev               |
| `NEXT_PUBLIC_APP_URL`                | `https://class-registration.austinaac.org` | Production domain                |
| `BYPASS_EMAIL_CONFIRMATION`          | `false`                                    | Must be disabled for production  |
| `RESEND_API_KEY`                     | Resend dashboard                           | Same or different account        |
| `FROM_EMAIL`                         | Verified sender                            | e.g. `noreply@austinaac.org`     |
| `ZOHO_CLIENT_ID`                     | Zoho dashboard                             | Same or different org            |
| `ZOHO_CLIENT_SECRET`                 | Zoho dashboard                             | Same or different org            |
| `ZOHO_REFRESH_TOKEN`                 | Zoho dashboard                             | Same or different org            |
| `ZOHO_ORGANIZATION_ID`               | Zoho dashboard                             | Same or different org            |
| `ZOHO_INVOICE_SUBJECT`               | Business-specific                          | e.g. `AAC Fall '26 Registration` |

---

## Phase 4: Configure Stripe Production Webhook

| Step | Action                                 | Details                                                                                                    |
| ---- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 4.1  | **Create production webhook endpoint** | Stripe Dashboard → Webhooks → Add endpoint: `https://class-registration.austinaac.org/api/webhooks/stripe` |
| 4.2  | **Subscribe to events**                | `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`                                |
| 4.3  | **Copy signing secret**                | Set as `STRIPE_WEBHOOK_SECRET` in Vercel (Production scope only)                                           |

---

## Phase 5: Deploy & Verify

| Step | Action                        | Details                                                                   |
| ---- | ----------------------------- | ------------------------------------------------------------------------- |
| 5.1  | **Trigger production deploy** | `npx vercel --prod` or promote a staging deployment from Vercel dashboard |
| 5.2  | **Smoke test auth**           | Register account, verify email confirmation, log in                       |
| 5.3  | **Smoke test class browsing** | Browse classes, verify data loads (should be empty initially)             |
| 5.4  | **Smoke test checkout**       | Attempt a payment flow to verify Stripe integration                       |
| 5.5  | **Verify webhook delivery**   | Check Stripe dashboard for successful webhook delivery                    |
| 5.6  | **Seed production data**      | Run seed script or manually create initial classes and admin account      |

---

## Phase 6: Documentation Updates

| Step | Action                        | Details                                                                                   |
| ---- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| 6.1  | **Update DEPLOYMENT.md**      | Add production Supabase project URL, update "Live Environments" table with production URL |
| 6.2  | **Update RELEASE_PROCESS.md** | Clarify that staging points to dev Supabase and production points to prod Supabase        |
| 6.3  | **Update `.env.example`**     | Add comments clarifying which values differ per environment                               |

---

## Manual vs. Automated Steps

| Task                    | Automated? | Notes                                          |
| ----------------------- | :--------: | ---------------------------------------------- |
| Create Supabase project |     ❌     | Supabase Dashboard (billing, region selection) |
| Run migrations on prod  |     ✅     | Via CLI or MCP                                 |
| Add CNAME in Wix        |     ❌     | Wix Dashboard → DNS Records                    |
| Add domain in Vercel    |     ❌     | Vercel Dashboard → Settings → Domains          |
| Set Vercel env vars     |     ❌     | Vercel Dashboard or CLI                        |
| Create Stripe webhook   |     ❌     | Stripe Dashboard                               |
| Update documentation    |     ✅     | Direct file edits                              |
| Deploy to production    |     ✅     | Via `npx vercel --prod`                        |

---

## Verification Checklist

- [ ] Supabase production project exists with all 30 migrations applied
- [ ] Auth settings configured (Site URL, Redirect URLs, Custom SMTP)
- [ ] CNAME record added in Wix, verified in Vercel with SSL
- [ ] Vercel environment variables scoped correctly (Production vs. Preview)
- [ ] Stripe production webhook delivering events successfully
- [ ] Can register, log in, browse classes, and complete checkout on production
