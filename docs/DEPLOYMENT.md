# Deployment Guide

This guide covers deploying the Class Registration System to Vercel with a **two-environment workflow**: Preview (staging) → Production (manual promotion).

## Live Environments

| Environment           | URL                                                                           | Branch       | Supabase DB                                |
| --------------------- | ----------------------------------------------------------------------------- | ------------ | ------------------------------------------ |
| **Preview (Staging)** | https://class-registration-system-git-master-jimeastburns-projects.vercel.app | `master`     | `class-registration-system`                |
| **Production**        | https://class-registration.austinaac.org                                      | `production` | `production-AAC-class-registration-system` |
| **Vercel Dashboard**  | https://vercel.com/jimeastburns-projects/class-registration-system            | —            | —                                          |

## Deployment Workflow

```
git push master → Preview deployment (auto) → Manual "Promote to Production" → Production
```

### 1. Push to `master` (Auto-Deploy to Preview)

Every push to `master` automatically creates a **Preview** deployment:

- Uses **Preview** environment variables (dev Supabase DB)
- Accessible at the Preview URL above
- Does **NOT** update the production site

### 2. Promote to Production (Manual)

When ready to update production:

1. Go to **[Deployments](https://vercel.com/jimeastburns-projects/class-registration-system/deployments)**
2. Find the Preview deployment to promote
3. Click the **⋮** (three dots) menu → **Promote to Production**
4. Vercel re-serves the build with **Production** environment variables

> **Note**: Vercel automatically substitutes `NEXT_PUBLIC_*` variables during promotion.

### 3. Alternative: Direct Production Deploy via CLI

```bash
# Deploy directly to production (bypasses preview)
npx vercel --prod
```

## Quick CLI Commands

```bash
# Deploy preview/staging (creates unique URL)
npx vercel

# Deploy to production
npx vercel --prod

# Sync environment variables from Vercel
npx vercel env pull
```

## Prerequisites

- GitHub repository with the project
- Vercel account (free tier works)
- Supabase projects: **dev** and **production** databases
- Stripe account with API keys

## Environment Variables

### Per-Environment Configuration

Environment variables are scoped per environment in the Vercel Dashboard. Go to **[Settings → Environment Variables](https://vercel.com/jimeastburns-projects/class-registration-system/settings/environment-variables)**.

#### Supabase (Different per environment)

| Variable                        | Production                                 | Preview / Development  |
| ------------------------------- | ------------------------------------------ | ---------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Production Supabase URL                    | Dev Supabase URL       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anon key                        | Dev anon key           |
| `SUPABASE_SERVICE_ROLE_KEY`     | Production service role key                | Dev service role key   |
| `NEXT_PUBLIC_APP_URL`           | `https://class-registration.austinaac.org` | Preview deployment URL |

#### Stripe

| Variable                             | Description                                       |
| ------------------------------------ | ------------------------------------------------- |
| `STRIPE_SECRET_KEY`                  | Stripe secret key (use `sk_live_` for production) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key                            |
| `STRIPE_WEBHOOK_SECRET`              | Webhook signing secret (see Stripe Webhooks)      |

#### Resend (Emails)

| Variable             | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `RESEND_API_KEY`     | API Key from Resend Dashboard                           |
| `EMAIL_FROM_ADDRESS` | Verified sender address (e.g., `onboarding@resend.dev`) |

#### Zoho Books (Accounting)

| Variable               | Description                             |
| ---------------------- | --------------------------------------- |
| `ZOHO_CLIENT_ID`       | OAuth Client ID                         |
| `ZOHO_CLIENT_SECRET`   | OAuth Client Secret                     |
| `ZOHO_ORGANIZATION_ID` | Your Zoho Books Org ID                  |
| `ZOHO_REFRESH_TOKEN`   | Long-lived refresh token for API access |

#### Other

| Variable                    | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| `BYPASS_EMAIL_CONFIRMATION` | Set to `true` to skip email verification (Preview only) |

## Stripe Webhooks

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Set the endpoint URL: `https://class-registration.austinaac.org/api/webhooks/stripe`
4. Select events to listen:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `charge.refunded`
5. Copy the **Signing secret** and add it as `STRIPE_WEBHOOK_SECRET` in Vercel

## Database Migrations

Run migration files in order via the Supabase SQL Editor, or use the CLI:

```bash
supabase db push
```

## Create Initial Admin User

1. Register a new account at `/register`
2. In Supabase SQL Editor, run:
   ```sql
   INSERT INTO profiles (id, email, role, first_name, last_name)
   VALUES ('user_uuid_here', 'your-email@example.com', 'super_admin', 'Admin', 'User')
   ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
   ```

## Git Branch Strategy

| Branch       | Purpose             | Auto-Deploy Target |
| ------------ | ------------------- | ------------------ |
| `master`     | Active development  | Preview (staging)  |
| `production` | Production releases | Production         |

- **Day-to-day development**: Push to `master`. Preview auto-deploys.
- **Release to production**: Promote a preview deployment via the Vercel Dashboard, or merge `master` → `production`.

## Vercel Settings

### Build Settings

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Production Branch**: `production`

### Key Configuration (`vercel.json`)

- `github.autoAlias: false` — Prevents automatic domain promotion on push
- Stripe webhook function timeout: 30s
- Health check cron: every 3 days at 8am UTC

## Pre-deployment Verification

```bash
npm run build   # Ensure production build passes
npm test        # Run all tests
```

## Troubleshooting

### Build Fails

- Check environment variables are set correctly
- Ensure `NEXT_PUBLIC_*` variables are prefixed correctly

### Webhook Not Working

- Verify the webhook URL matches your deployment
- Check Stripe Dashboard for webhook delivery logs
- Verify `STRIPE_WEBHOOK_SECRET` is correct

### Auth Issues

- Ensure `NEXT_PUBLIC_SUPABASE_URL` is correct
- **Email Rate Limits**: Supabase's default email service has strict limits (3 per hour).
  - Configure Custom SMTP (see below) or set `BYPASS_EMAIL_CONFIRMATION=true`.
- Add your Vercel domain to Supabase Auth settings:
  - Go to **Authentication → URL Configuration**
  - Add your domain to **Redirect URLs**

## Setup Custom SMTP (Recommended)

1. **Get SMTP Credentials**: Sign up for Resend (or SendGrid/Postmark), create an API key.
2. **Configure Supabase**: Go to **Authentication → Settings → SMTP Settings** → Enable Custom SMTP.
3. **Disable Link Tracking**: In your SMTP provider, disable link tracking to prevent breaking confirmation links.

## Custom Domain

1. In Vercel, go to **Settings → Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` environment variable
5. Update Stripe webhook URL
6. Update Supabase Auth redirect URLs
