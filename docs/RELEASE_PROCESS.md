# Release Process

This document outlines the procedure for promoting changes to production.

## 1. Development & Preview
- All work is done on feature branches.
- Opening a Pull Request (PR) triggers a **Vercel Preview Deployment**.
- **CI Checks** must pass:
  - `npm run lint`
  - `npm test` (Unit/Integration)
  - `npm run build` (Build verification)

## 2. Staging (Branch: `main`)
- When a PR is merged into `main`, Vercel automatically deploys to the **Staging** environment.
- This environment connects to the **Production** database but uses limited access keys (if applicable) or strict RLS.
- **Verification**:
  - Verify critical flows (Login, Class Browsing) on the Staging URL.

## 3. Production Promotion
- Navigate to the **Vercel Dashboard** > Deployments.
- Locate the successful Staging deployment (from `main`).
- Click **Promote to Production**.
- This ensures the *exact same build artifact* is used, eliminating "it works on my machine" issues.

## 4. Post-Deployment
- Monitor logs in Vercel.
- Check Supabase for any migration anomalies.
