---
name: context-window-management
description: 'Strategies for managing LLM context windows including summarization, trimming, routing, and avoiding context rot. Use when: context window, token limit, context management, context engineering, long context.'
---

# Context Window Management

Context is a finite resource with diminishing returns. More tokens doesn't mean better results — the art is in curating the right information at the right position.

## When to Use This Skill

- Context window is filling up during a long conversation
- Planning how to structure a complex prompt
- Deciding what to include vs. exclude from context
- Debugging degraded response quality mid-conversation
- Building systems that manage context programmatically

## Core Principles

1. **Serial Position Effect**: LLMs attend most strongly to the beginning and end of context. Critical instructions belong there.
2. **Lost-in-the-Middle**: Information buried in the middle of long contexts is weighted less. Never place important constraints in the middle.
3. **Diminishing Returns**: Beyond a certain point, adding more context hurts quality by diluting attention.

## Pattern 1: Token Budget Allocation

Allocate your context window into tiers with explicit budgets:

| Tier | % of Window | Contents | Priority |
|------|------------|----------|----------|
| **System** | 15–20% | System prompt, project rules, persona | Always included |
| **Critical** | 10–15% | Current task definition, acceptance criteria | Always included |
| **Recent History** | 30–40% | Last N conversation turns, recent tool outputs | Rolling window |
| **Retrieved Context** | 20–30% | File contents, search results, documentation | On-demand |
| **Buffer** | 5–10% | Reserved for response generation | Never fill |

**Rules:**
- Never let Retrieved Context crowd out System or Critical tiers
- When approaching limits, trim Recent History before System
- Buffer must always remain — filling 100% of context degrades output

## Pattern 2: Serial Position Optimization

Place information strategically based on attention distribution:

```
┌─────────────────────────────────────────┐
│  HIGH ATTENTION — System prompt,        │  ← Put constraints, rules, persona here
│  critical instructions, format specs    │
├─────────────────────────────────────────┤
│                                         │
│  LOW ATTENTION — Background context,    │  ← Bulk reference material, file contents
│  file contents, retrieved documents     │
│                                         │
├─────────────────────────────────────────┤
│  HIGH ATTENTION — Current task,         │  ← Put current question, recent errors,
│  recent conversation, user's question   │     task-specific instructions here
└─────────────────────────────────────────┘
```

**Practical application:**
- System prompt → top of context
- Large file dumps → middle (read once, reference later)
- Current error message or task → immediately before response
- Checklist or format requirements → both top AND bottom for reinforcement

## Pattern 3: Progressive Summarization

When conversation history grows too long, summarize in stages instead of truncating:

**Stage 1 — Full (recent turns):**
> User asked to fix the enrollment capacity check. I found that `checkCapacity()` in `enrollment-actions.ts` counts only `confirmed` enrollments but the UI shows `confirmed + pending`. The fix requires updating the count query to include both statuses. Test written, currently failing.

**Stage 2 — Condensed (older turns):**
> Fixed enrollment capacity check: updated count query in `enrollment-actions.ts` to include both `confirmed` and `pending` statuses. Tests passing.

**Stage 3 — Key facts only (oldest turns):**
> Capacity check fix shipped. Counts confirmed + pending.

**When to summarize:**
- After completing a subtask, summarize it before starting the next
- When context exceeds 60% of window, summarize the oldest third
- Before switching topics, capture key decisions from current topic

## Pattern 4: Selective Retrieval

Don't dump entire files into context. Retrieve only what's needed:

| Situation | Approach |
|-----------|----------|
| Need a function signature | View only the function (line range) |
| Need to understand a file's role | View first 50 lines for imports/exports |
| Searching for a pattern | Use grep, then view matching lines |
| Need full file context | View entire file but summarize after reading |

**Rule of thumb**: If a file is > 200 lines, always use targeted line ranges instead of full file reads.

## Anti-Patterns

### ❌ Naive Truncation

Cutting context at a fixed token count without considering what's being cut. This often removes system instructions or critical constraints.

**Instead**: Use tiered budgets (Pattern 1). Trim from the middle-priority tier first.

### ❌ Context Stuffing

Dumping every relevant file into context "just in case." This dilutes attention across irrelevant material.

**Instead**: Use selective retrieval (Pattern 4). Read file headers first, then drill into specific sections.

### ❌ Ignoring Token Costs

Treating all context as free. Large tool outputs (file listings, search results) consume significant tokens.

**Instead**: Use targeted tool calls. Limit `grep` results, use line ranges for `view_file`, cap search results.

### ❌ Repeating Information

Including the same information in multiple forms (full file + summary + inline quote).

**Instead**: Include once, in the highest-attention position. Reference by name elsewhere.

### ❌ One-Size-Fits-All

Using the same context strategy for every task. A debugging task needs recent errors; a planning task needs project structure.

**Instead**: Adapt the budget allocation per task type:
- **Debugging**: 50% recent history (errors, logs), 30% relevant code, 20% system
- **Planning**: 30% project structure, 30% requirements, 20% system, 20% recent discussion
- **Implementation**: 40% relevant code, 25% system/rules, 20% task spec, 15% recent history
