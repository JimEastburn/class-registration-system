# agent-browser Test Scripts

> **🤖 AI AGENT:** Use workflow `/browser-tests` to run these scripts with auto-approval enabled.

Browser automation tests using `agent-browser` CLI for testing class creation flow.

## Prerequisites

1. **agent-browser CLI** installed globally:
   ```bash
   npm install -g agent-browser
   agent-browser install  # Download Chromium
   ```

2. **Dev server running** at `http://localhost:3000`:
   ```bash
   npm run dev
   ```

3. **Environment variables** configured in `.env.local`

## Usage

### Step 1: Setup Authentication

Run once to create a test teacher and save auth state:

```bash
./scripts/browser-tests/setup-auth-state.sh
```

This:
- Creates a test teacher user via Supabase admin API
- Logs in via browser automation
- Saves session state to `auth-state.json`

### Step 2: Run Tests

Run class creation test (skips login):

```bash
./scripts/browser-tests/test-class-creation.sh
```

This:
- Loads saved auth state (no login needed)
- Navigates to `/teacher/classes/new`
- Fills and submits the class creation form
- Verifies the class was created
- Saves screenshots to `screenshots/`

## Files

| File | Purpose |
|------|---------|
| `setup-auth-state.sh` | Login and save session state |
| `test-class-creation.sh` | Test class creation (uses saved state) |
| `create-test-teacher.ts` | Node helper to create test users |
| `auth-state.json` | Saved browser session (gitignored) |
| `.test-creds.json` | Test credentials (gitignored) |
| `screenshots/` | Test screenshots output |

## Notes

- Auth state files contain session tokens - **never commit them**
- If tests fail with auth errors, re-run `setup-auth-state.sh`
- Set `NEXT_PUBLIC_APP_URL` to test against different environments
