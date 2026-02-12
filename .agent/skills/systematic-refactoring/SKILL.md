---
name: systematic-refactoring
description: Enforces a thorough audit process for cross-cutting code changes like property renames, type changes, and interface modifications. Use when renaming fields, changing types, refactoring interfaces, moving properties, or making any change that could ripple through multiple files. Triggers on "rename", "refactor", "change column", "change field", "update type", "fix references", or any property/schema change that affects more than one file.
---

# Systematic Refactoring

## Overview

Changing a property name in one file is easy. Finding every ripple effect is hard. Missed references compile silently until they reach production — or worse, create subtle data bugs where `undefined` replaces real values.

**Core principle:** NEVER change a type, property, or column name without tracing the FULL data pipeline first.

## The Iron Law

```
NO EDITS UNTIL THE FULL IMPACT MAP IS COMPLETE
```

If you haven't completed the Impact Analysis phase, you cannot start editing files.

## When to Use

**ALWAYS use for:**

- Renaming a database column or table
- Renaming a property in a TypeScript interface/type
- Changing a Supabase `.select()` query shape
- Modifying the return type of a server action or API route
- Moving a field from one interface to another
- Any change described as "fix all references to X"

**Use this ESPECIALLY when:**

- The change spans server actions → components (data pipeline)
- Multiple interfaces mirror the same shape (duplicated types)
- There are mapping/transform layers between data source and UI
- The codebase has backward-compatibility shims

## Phase 1: Impact Analysis (Before ANY Edits)

### Step 1: Map the Data Pipeline

For the property/type being changed, identify ALL layers:

```
Database Column
  → Supabase .select() queries
    → Server action return types
      → Mapping/transform shims
        → Component prop interfaces
          → JSX rendering
```

Trace BOTH directions:

- **Downstream:** Where does this data flow TO? (producers → consumers)
- **Upstream:** Where does this data come FROM? (who creates/transforms it?)

### Step 2: Comprehensive Search

Run ALL of these searches. Do not skip any.

- [ ] **Exact property name** — `grep "propertyName"` across all `.ts`/`.tsx` files
- [ ] **Type/interface definitions** — `grep "propertyName: "` (with colon) to find type declarations
- [ ] **Supabase select queries** — `grep "select.*propertyName"` or `grep "tableName(propertyName"`
- [ ] **Transform/mapping layers** — `grep "propertyName"` in action files for `.map()` or spread patterns
- [ ] **Interface/type names** — Identify all types that reference the property, then search for those type names to find all consumers
- [ ] **String literals** — Check for the property name in string form (template literals, object keys)
- [ ] **Test files** — `grep "propertyName"` in test files and fixtures

### Step 3: Build the Change Manifest

Before editing, create a complete list:

```markdown
## Change Manifest: [old] → [new]

### Type Definitions (change property name)

- [ ] file.ts:L12 — InterfaceName.oldProp → newProp

### Supabase Queries (change select field)

- [ ] actions.ts:L45 — .select('oldProp') → .select('newProp')

### Mapping/Transform Layers (remove shims)

- [ ] actions.ts:L88-92 — Remove name→title compat shim

### Component Props (change interface)

- [ ] Component.tsx:L28 — interface prop oldProp → newProp

### JSX Rendering (change property access)

- [ ] Component.tsx:L73 — data.oldProp → data.newProp

### Tests

- [ ] test.ts:L15 — mock data uses oldProp → newProp
```

## Phase 2: Execute Changes

### Step 4: Edit in Dependency Order

Apply changes in this order to maintain type safety:

1. **Database/schema** (if applicable — migrations)
2. **Server action types and queries** (data source)
3. **Remove mapping/compat shims** (transform layer)
4. **Component interfaces** (consumer types)
5. **JSX/rendering** (display layer)
6. **Tests and fixtures** (validation layer)

### Step 5: Verify Completeness

After ALL edits:

- [ ] Re-run the exact same searches from Step 2
- [ ] Confirm zero remaining references to old name (except comments)
- [ ] Run `npm run build` to catch type mismatches
- [ ] Run tests if applicable

## Red Flags — STOP and Re-Audit

If you catch yourself:

- Editing a file and discovering NEW references you didn't map → **STOP. Return to Phase 1.**
- Finding a "backward compatibility" mapping layer → **Add it to the manifest. It MUST be updated or removed.**
- Seeing `as unknown as` or `as any` type casts → **These hide type mismatches. Investigate what they're casting.**
- A build error reveals a file you didn't touch → **Your impact analysis was incomplete. Re-audit.**

## Common Traps

| Trap                                   | Reality                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------- |
| "I'll just grep for `X.oldProp`"       | Misses type definitions, interfaces, and mapping layers                    |
| "Only the query and JSX need changing" | Interfaces, transform shims, and test fixtures also reference the property |
| "The type cast handles it"             | `as unknown as X` silences errors that would catch real bugs               |
| "It's just a comment, doesn't matter"  | Comments with outdated names mislead future developers                     |
| "I found 4 files, that's probably all" | There's almost always a 5th. Run ALL searches.                             |

## Quick Reference Checklist

Copy this checklist for every refactoring task:

```markdown
## Refactoring: [old] → [new]

### Phase 1: Impact Analysis

- [ ] Mapped full data pipeline (DB → query → action → transform → props → JSX)
- [ ] Searched for exact property name in all .ts/.tsx
- [ ] Searched for type/interface definitions containing property
- [ ] Searched for Supabase select queries with property
- [ ] Searched for mapping/transform layers
- [ ] Searched for all interface/type consumers
- [ ] Searched test files
- [ ] Built complete change manifest

### Phase 2: Execute

- [ ] Edited in dependency order (schema → actions → shims → props → JSX → tests)
- [ ] Re-ran all searches, confirmed zero remaining references
- [ ] Build passes
- [ ] Tests pass
```
