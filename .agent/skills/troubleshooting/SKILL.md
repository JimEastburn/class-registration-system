---
name: troubleshooting
description: Systematic debugging workflow to identify, isolate, and fix application issues. Use when the user asks to debug, fix an error, or troubleshoot a problem.
---

# Troubleshooting & Debugging

## Overview

A systematic, scientific approach to troubleshooting application issues. This skill enforces rigor to prevent "shotgun debugging" (trying random fixes until something works) and ensures that fixes are permanent and verified.

## When to Use This Skill

- User reports a bug or error
- CI/CD build failures
- Application crashes or unhandled exceptions
- "It doesn't work" requests
- Performance regressions

## The Scientific Method Workflow

Follow these steps sequentially. Do not skip steps.

#### 1. Gather & Observe

**Goal:** deeply understand the failure state.

- **Read the Logs:** Look for the _first_ error in the stack trace, not just the last one.
- **Check the Environment:** Is this prod, dev, or local? What changed recently?
- **Isolate the Variable:** Use `grep_search` or `view_file` to find where the error comes from.

#### 2. Reproduce (The Critical Step)

**Goal:** Create a controlled environment where the bug happens 100% of the time.

- **"No reproduction, no fix."** You cannot confirm a fix if you cannot replicate the bug.
- **Create a Reproduction Script:** Write a small script or test case that triggers the error.
- **Use Existing Tests:** Can you make an existing test fail by changing inputs?
- **Document the Steps:** Write down exactly how to trigger the issue.

#### 3. Analyze & Hypothesize

**Goal:** Determine _why_ it is broken.

- **Trace the Execution:** Follow the code path. Where does it diverge from expectation?
- **Form a Hypothesis:** "I believe component X is failing because input Y is null."
- **Verify the Hypothesis:** Add logs or breakpoints to confirm your theory _before_ writing the fix.

#### 4. Implement Fix

**Goal:** Correct the defect without introducing regressions.

- **Apply the Fix:** Write the code to correct the valid issue.
- **Refactor if Needed:** If the code is hard to debug, it's hard to maintain. Clean it up.

#### 5. Verify & Validate

**Goal:** Prove the fix works.

- **Run the Reproduction Script:** It should now pass.
- **Run the Suite:** Ensure no regressions were introduced.
- **Remove Debug Code:** Clean up any `console.log` or print statements added during analysis.

## Key Principles

1.  **Read the Error Message**: Read it three times. It usually tells you exactly what is wrong.
2.  **Change One Thing at a Time**: If you change two variables and it works, you don't know which one fixed it.
3.  **Don't Assume**: "I think that variables is defined" vs "I have logged the variable and seen it is defined".
4.  **Fix the Root Cause**: Don't just patch the symptom (e.g., adding `if (x) ...` without knowing why `x` is null).
5.  **Leave the Campground Cleaner**: If you touched a messy file to fix a bug, format it or add types as you leave.

## Common Troubleshooting Tactics

- **Binary Search**: Comment out half the code. Does it still crash? If yes, the bug is in the active half. Repeat.
- **Rubber Ducking**: Explain the code logic line-by-line to the user (or yourself). You often find the bug just by explaining it.
- **Log Everything**: When in doubt, log the state of _every_ variable on the suspicious line.

## Checklist

- [ ] Identified the exact error message/symptom
- [ ] Created a reproduction case (test or script)
- [ ] Confirmed the hypothesis (why it fails)
- [ ] Implemented the fix
- [ ] Verified the reproduction case now passes
- [ ] Verified no regressions in existing tests
