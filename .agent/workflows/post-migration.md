---
description: Regenerate Supabase types and verify build after any database migration. MUST be run after every migration — referenced by GEMINI.md rule.
---

# Post-Migration Workflow

Run this workflow after **every** database migration to keep types in sync with the schema.

## Steps

// turbo-all

1. Regenerate Supabase types from the production database:

```bash
npx supabase gen types --lang=typescript --project-id jakjpigeafqqgispwlhl --schema public > src/types/database.ts
```

2. Run the production build to verify no type errors were introduced:

```bash
npm run build
```

3. If the build fails, fix all type errors before proceeding with any other work.

4. If the build passes, types are confirmed in sync — continue with your task.
