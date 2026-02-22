---
description: Push pending Supabase migrations to both databases (production + dev) and verify alignment
---

# Push Migrations to Both Databases

// turbo-all

## 1. Push to production (currently linked)

```bash
supabase db push
```

Confirm `Y` when prompted.

## 2. Verify production alignment

```bash
supabase migration list
```

All rows should show matching Local and Remote timestamps. If any are mismatched, repair before continuing.

## 3. Link to dev/preview database

```bash
supabase link --project-ref nztngdpneuyhhnrkhehq
```

## 4. Push to dev/preview

```bash
supabase db push
```

Confirm `Y` when prompted. If there are migration history conflicts:

- Use `supabase migration repair --status applied <versions>` for migrations already applied to the schema
- Use `supabase migration repair --status reverted <versions>` for stale remote-only entries
- Then retry `supabase db push`

## 5. Verify dev/preview alignment

```bash
supabase migration list
```

All rows should show matching Local and Remote timestamps.

## 6. Re-link back to production

```bash
supabase link --project-ref jakjpigeafqqgispwlhl
```

## 7. Final confirmation

Report that both databases are aligned and linked back to production.
