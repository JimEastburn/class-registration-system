# Plan: Real-Time Full-Text Search for /admin/classes

## Goal
Replace the manual "Search classes..." button/Enter-key search on `/admin/classes` with a debounced, auto-triggering full-text search that matches any visible field after typing 1+ characters.

## Current State
- **Page**: `src/app/(dashboard)/admin/classes/page.tsx` — Server Component, passes `search` param to `getAllClasses()`
- **Table**: `src/components/admin/AdminClassTable.tsx` — Client Component with local search state; requires Enter key or "Search" button click to update URL
- **Server action**: `src/lib/actions/classes.ts` → `getAllClasses()` — searches only `name.ilike` and `description.ilike`
- **Pagination**: Server-side via `page`/`limit` query params (20 per page)
- **No debounce library** is installed

## Changes Required

### 1. Expand server-side search (`src/lib/actions/classes.ts`)
Update `getAllClasses()` to search across **all fields visible on the page**:
- Text fields: `name`, `description`, `status`, `location`, `day_of_week`, `day`, `block`
- Numeric fields (cast to text): `capacity`, `age_min`, `age_max`, `current_enrollment`
- Teacher fields (joined): `teacher.first_name`, `teacher.last_name`

Use a single `.or()` query string with `ilike` matching:
```
name.ilike.%term%,description.ilike.%term%,status.ilike.%term%,...
capacity::text.ilike.%term%,age_min::text.ilike.%term%,...
teacher.first_name.ilike.%term%,teacher.last_name.ilike.%term%
```

### 2. Add debounced auto-search (`src/components/admin/AdminClassTable.tsx`)
- Remove the requirement to click the "Search" button or press Enter
- Keep the Search input and its current icon/styling
- Add `useEffect` + `setTimeout` (300ms debounce) on the `search` state
- Trigger URL update on every keystroke (≥ 1 character), or when cleared to empty
- Reset `page` to 1 on every new search term
- Use `useTransition` to show a loading spinner on the input during server roundtrips
- Convert the "Search" button to a "Clear" (×) button that appears when text is entered; clicking it clears the input and resets results

### 3. Tests
- Update `src/app/(dashboard)/admin/classes/__tests__/page.test.tsx` if search param handling changes
- Add/update component tests for `AdminClassTable` verifying debounce behavior, ≥1-char threshold, and clearing

## Approach Notes
- **Server-side filtering** is required because the user explicitly wants this to "work across pagination"
- **No new dependencies** needed; debounce implemented with native `setTimeout`/`useEffect`
- The existing URL-based pattern (`?search=term&page=1`) is preserved; only the trigger mechanism changes from manual to debounced
- SQL injection is not a concern because Supabase/PostgREST parameterizes `.or()` filters; we will still sanitize the term by stripping `%` and `_` to prevent accidental wildcard abuse
