# Deployment Guide

This guide covers deploying the Class Registration System to Vercel.

## Live Environments

| Environment | URL |
|-------------|-----|
| **Production** | https://class-registration-system-two.vercel.app |
| **Vercel Dashboard** | https://vercel.com/jimeastburns-projects/class-registration-system |

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
- Supabase project with database ready
- Stripe account with API keys

## Step 1: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

## Step 2: Configure Environment Variables

In the Vercel project settings, add these environment variables:

### Supabase
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for webhooks) |

### Stripe
| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (use `sk_live_` for production) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (see Step 4) |

### Application
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL (e.g., `https://your-app.vercel.app`) |
| `BYPASS_EMAIL_CONFIRMATION` | Set to `true` to skip email verification (use for testing) |

## Step 3: Deploy

1. Click **"Deploy"** in Vercel
2. Wait for the build to complete
3. Your app is now live at `your-app.vercel.app`

## Pre-deployment Verification

Before deploying or merging changes, ensure that all tests are passing:

```bash
# Run all tests
npm test

# Check code coverage
npm run test:coverage
```

## Step 4: Configure Stripe Webhooks

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Set the endpoint URL: `https://your-app.vercel.app/api/webhooks/stripe`
4. Select events to listen:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `charge.refunded`
5. Copy the **Signing secret** and add it as `STRIPE_WEBHOOK_SECRET` in Vercel

## Step 5: Run Database Migrations

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Run the following migration files in order:
    - `supabase/migrations/001_initial_schema.sql` (Initial Setup)
    - `supabase/migrations/004_waitlist.sql` (Waitlist feature)
    - `supabase/migrations/005_recurring_schedules.sql` (Recurring Schedules)
    - `supabase/migrations/006_class_materials.sql` (Class Materials)
    - `supabase/migrations/20260122112000_robust_profile_trigger.sql` (Robust Profile Trigger)

Or, if you have the Supabase CLI installed, you can simply run:
```bash
supabase db push
```

## Step 6: Create Initial Admin User

1. Register a new account at `/register`
2. In Supabase SQL Editor, run:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

## Vercel Settings

### Build Settings
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### Environment Variables Scope
- Set all variables for **Production**, **Preview**, and **Development**

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
  - **Option A (Fixed)**: [Configure Custom SMTP](#setup-custom-smtp-recommended).
  - **Option B (Bypass)**: Set `BYPASS_EMAIL_CONFIRMATION=true` in Vercel env vars.
- Add your Vercel domain to Supabase Auth settings:
  - Go to **Authentication → URL Configuration**
  - Add your domain to **Redirect URLs**

## Setup Custom SMTP (Recommended)

To avoid "email rate limit exceeded" errors in production, you should use a custom SMTP provider like [Resend](https://resend.com).

1.  **Get SMTP Credentials**:
    - Sign up for Resend (or SendGrid/Postmark).
    - Create an API key.
    - Find your SMTP settings (Host: `smtp.resend.com`, Port: `587`, User: `resend`).
2.  **Configure Supabase**:
    - Go to your **Supabase Dashboard**.
    - Navigate to **Authentication → Settings → SMTP Settings**.
    - Toggle **Enable Custom SMTP** to ON.
    - Fill in the host, port, user, and password (your Resend API key).
    - Save changes.
3.  **Disable Link Tracking**:
    - In your SMTP provider settings, ensure "Link Tracking" is disabled to prevent breaking Supabase's confirmation links.

## Custom Domain (Optional)

1. In Vercel, go to **Settings → Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` environment variable
5. Update Stripe webhook URL
6. Update Supabase Auth redirect URLs
