# agent-browser Test Scripts

> **🤖 AI AGENT:** Use workflow `/browser-tests` to run these scripts with auto-approval enabled.

Browser automation tests using `agent-browser` CLI for testing the class registration system.

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

**For all roles at once:**

```bash
./scripts/browser-tests/setup-all-auth-states.sh
```

**For a specific role:**

```bash
./scripts/browser-tests/setup-all-auth-states.sh parent
./scripts/browser-tests/setup-all-auth-states.sh student
./scripts/browser-tests/setup-all-auth-states.sh admin
./scripts/browser-tests/setup-all-auth-states.sh scheduler
./scripts/browser-tests/setup-all-auth-states.sh superadmin
```

This creates:

- A test user with the specified role via Supabase admin API
- Logs in via browser automation
- Saves session state to `auth-state-{role}.json`

**Legacy (teacher only):**

```bash
./scripts/browser-tests/setup-auth-state.sh
```

### Step 2: Run Tests

Run class creation test (uses saved auth state):

```bash
./scripts/browser-tests/test-class-creation.sh
```

## Auth State Files

| File                         | Role             | Dashboard          |
| ---------------------------- | ---------------- | ------------------ |
| `auth-state-parent.json`     | Parent           | `/parent`          |
| `auth-state-student.json`    | Student          | `/student`         |
| `auth-state-admin.json`      | Admin            | `/admin`           |
| `auth-state-scheduler.json`  | Class Scheduler  | `/class-scheduler` |
| `auth-state-superadmin.json` | Super Admin      | `/admin`           |
| `auth-state.json`            | Teacher (legacy) | `/teacher`         |

## Files

| File                       | Purpose                                     |
| -------------------------- | ------------------------------------------- |
| `setup-all-auth-states.sh` | Create auth state for all or specific roles |
| `setup-auth-state.sh`      | Legacy: Login as teacher and save state     |
| `test-class-creation.sh`   | Test class creation (uses saved state)      |
| `create-test-user.ts`      | Node helper to create test users (any role) |
| `create-test-teacher.ts`   | Legacy: Node helper for teacher users       |
| `auth-state-*.json`        | Saved browser sessions (gitignored)         |
| `.test-creds-*.json`       | Test credentials (gitignored)               |
| `screenshots/`             | Test screenshots output                     |

## Notes

- Auth state files contain session tokens - **never commit them**
- If tests fail with auth errors, re-run the auth setup script
- Set `NEXT_PUBLIC_APP_URL` to test against different environments
