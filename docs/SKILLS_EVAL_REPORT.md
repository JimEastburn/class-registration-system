# Skills Eval Report

**Date:** 2026-03-17
**Method:** Functional testing -- each skill was read, then applied to a relevant prompt against this codebase. A subagent evaluated whether the skill produced clear, actionable, and accurate guidance.

## Summary

| # | Skill | Result | Key Issue |
|---|-------|--------|-----------|
| 1 | accessibility-compliance | PASS | Solid WCAG 2.2 patterns; found real issues in enrollment forms |
| 2 | agent-browser | FAIL | `@anthropic-ai/agent-browser` package does not exist in npm |
| 3 | brainstorming | PASS | Clear "one question at a time" process; caught CLAUDE.md constraints |
| 4 | brand-identity | FAIL | Border radius wrong (0.5rem vs 0.625rem); 70% of tokens missing; incomplete voice/tone |
| 5 | code-reviewer | PASS | Structured 7-pillar review found real bugs (race condition, RLS inconsistency) |
| 6 | context-window-management | FAIL | File appears truncated; stub content only; no actionable strategies |
| 7 | context7 | FAIL | Depends on context7.com API which is blocked by network egress proxy |
| 8 | e2e-testing-patterns | FAIL | Too generic (50% Cypress content irrelevant); no auth state or multi-role guidance; missing referenced files |
| 9 | error-handling-patterns | PASS | Result type, graceful degradation patterns applicable; missing webhook-specific guidance |
| 10 | find-skills | PASS* | Well-structured process but skills.sh registry returned zero results for all queries |
| 11 | frontend-design | PASS* | Good Tailwind v4/shadcn coverage but says "NEVER use Inter" while project uses Inter |
| 12 | gemini-skill-creator | PASS | Clear template and process for creating skills; minor gaps in discovery guidance |
| 13 | generating-gherkin | PASS | Produced accurate Gherkin scenarios covering all enrollment code paths |
| 14 | next-best-practices | PASS | Highly relevant; async patterns, RSC boundaries, data patterns all match project conventions |
| 15 | nextjs-supabase-auth | FAIL | Extremely shallow; no code examples; misses RBAC, self-healing, getUser vs getSession |
| 16 | planning | PASS | Rigid TDD-first structure with mandatory self-check; produces actionable task lists |
| 17 | playwright | PASS | Complete browser automation setup; complements (doesn't conflict with) existing E2E suite |
| 18 | pr-creator | FAIL | No fallback for missing PR template; `npm run preflight` doesn't exist; assumes `main` not `master` |
| 19 | responsive-design | PASS | Directly applicable table patterns; aligns with project's Tailwind breakpoint conventions |
| 20 | stripe-best-practices | PASS* | Correctly recommends Checkout Sessions API; too shallow for production review (no idempotency, currency, refund guidance) |
| 21 | subagent-driven-development | PASS | Well-defined two-stage review workflow with adversarial spec checking |
| 22 | supabase-postgres-best-practices | PASS | N+1 guidance confirmed existing queries are well-optimized; 30 reference files |
| 23 | systematic-debugging | PASS | 4-phase process found real bug: trigger counts `confirmed` only but app checks `confirmed + pending` |
| 24 | systematic-refactoring | PASS | Impact-analysis-first approach would correctly surface all 76 files with enrollment status literals |
| 25 | typescript-expert | PASS | Checklist found 160 `as unknown as` casts, unsafe JSON coercion, inconsistent return types |
| 26 | using-superpowers | FAIL | No skill catalog or routing logic; "1% chance" threshold makes orchestration meaningless |
| 27 | vercel-deployment | FAIL | Headers-only stubs; project's own docs/DEPLOYMENT.md is far superior |
| 28 | vercel-react-best-practices | PASS | 57 rules with before/after examples; waterfall elimination guidance directly applicable |

## Overall Results

- **PASS:** 18 skills (64%)
- **PASS with caveats:** 3 skills (marked with * above)
- **FAIL:** 10 skills (36%)

## Detailed Findings by Category

### FAIL -- Non-Functional (tool/service unavailable)

| Skill | Issue |
|-------|-------|
| agent-browser | CLI tool `@anthropic-ai/agent-browser` does not exist in npm registry |
| context7 | Depends on `context7.com` API blocked by network egress; no fallback |

### FAIL -- Content Too Shallow/Incomplete

| Skill | Issue |
|-------|-------|
| context-window-management | File appears truncated at line 18 ("Your cor"); patterns/anti-patterns are stubs with no content |
| nextjs-supabase-auth | 58 lines total; names patterns but zero code examples or implementation detail |
| vercel-deployment | Every section is a one-liner stub; project's own docs far more complete |
| using-superpowers | Meta-skill with no skill catalog or meaningful routing criteria |

### FAIL -- Inaccurate or Misaligned with Project

| Skill | Issue |
|-------|-------|
| brand-identity | Border radius mismatch (0.5rem vs 0.625rem); missing 70% of design tokens; fabricated hover color |
| e2e-testing-patterns | 50% Cypress content (irrelevant); no guidance on auth state, multi-role flows, or DB-backed setup; referenced resource files missing |
| pr-creator | References `npm run preflight` (doesn't exist), assumes `main` branch (project uses `master`), no fallback for missing PR template |

### PASS -- Strong Skills (directly applicable, produced real findings)

| Skill | Highlights |
|-------|------------|
| accessibility-compliance | Found 8 real WCAG issues in enrollment components |
| code-reviewer | Found race condition in capacity check, RLS inconsistency in admin force-enroll |
| systematic-debugging | Discovered trigger/application mismatch in enrollment counting |
| typescript-expert | Found 160 unsafe type casts, incorrect webhook types, unguarded JSON coercion |
| next-best-practices | All patterns directly map to project conventions; identified parallelization opportunities |
| systematic-refactoring | Would correctly surface all 76 files needing changes for status enum refactor |
| supabase-postgres-best-practices | Confirmed existing queries are well-optimized; comprehensive 30-file reference set |
| vercel-react-best-practices | 57 prioritized rules with concrete before/after examples |

### PASS -- Solid Process Skills

| Skill | Highlights |
|-------|------------|
| brainstorming | Prevented premature solutioning; caught CLAUDE.md constraint against auto-waitlist |
| planning | Rigid TDD structure with mandatory self-check gate |
| subagent-driven-development | Two-stage review (spec then quality) with adversarial checking |
| generating-gherkin | Produced complete Gherkin scenarios covering all enrollment paths |
| gemini-skill-creator | Usable template for creating new skills |
| playwright | Complete self-contained browser automation; auto-installs dependencies |
| responsive-design | Table patterns directly applicable; Tailwind conventions aligned |

## Recommendations

### High Priority -- Fix or Replace

1. **context-window-management** -- Truncated file. Rewrite with actual strategies, token budgets, and summarization templates.
2. **brand-identity** -- Update `design-tokens.json` to match `globals.css` (fix border-radius, add missing tokens for dark mode, enrollment statuses, role badges).
3. **nextjs-supabase-auth** -- Expand with actual code examples, `getUser()` vs `getSession()` guidance, RBAC patterns, and self-healing profile logic.
4. **pr-creator** -- Add fallback PR body template, detect available npm scripts instead of hardcoding `preflight`, detect default branch name.

### Medium Priority -- Improve

5. **e2e-testing-patterns** -- Remove Cypress content or split into separate skill. Add auth state management, multi-role flow patterns. Create referenced resource files.
6. **vercel-deployment** -- Either flesh out with real configuration examples or delete in favor of `docs/DEPLOYMENT.md`.
7. **using-superpowers** -- Add a skill inventory table mapping task types to specific skills.
8. **frontend-design** -- Remove "NEVER use Inter" anti-pattern (conflicts with project) or scope it to new projects only.
9. **stripe-best-practices** -- Add webhook idempotency, currency handling, refund flow, and testing guidance.
10. **find-skills** -- Verify skills.sh registry is populated; add local skill search fallback.

### Low Priority -- Nice to Have

11. **agent-browser** -- Verify tool availability or add installation instructions.
12. **context7** -- Add fallback for when API is unreachable; consider MCP integration.
13. **error-handling-patterns** -- Add webhook/event-processing specific patterns.
