---
description: continuous subagent loop for clearing a task list
---

# Subagent Loop Workflow

## Configuration

TASKS_PER_CONTEXT_REFRESH = 150
MAX_CONSECUTIVE_REWORKS = 3

This workflow dictates a strict loop for clearing tasks from a task list using specialized subagent personae.

## Phase 1: Task Identification

1.  **Read Task List**:
    - Check the active `task.md` artifact (e.g., `.gemini/antigravity/brain/.../task.md`) OR `docs/TASKS.md`.
    - Identify the **first** incomplete task (unchecked `[ ]`).
    - **STOP if no tasks remain.**

2.  **Context Extraction**:
    - Read the specific task description.
    - Identify necessary context (files, architectural constraints) relevant _only_ to this task.

## Phase 2: Implementation (The "Implementer")

3.  **Dispatch Implementer**:
    - You are now the **Implementer**.
    - **Goal**: Implement the task exactly as described.
    - **Rules**:
      - strict TDD (Red-Green-Refactor) if applicable.
      - strict adherence to the spec.
      - Self-review before finishing.
    - **Action**: Write code, run tests, commit changes.

## Phase 3: Specification Review (The "Spec Reviewer")

4.  **Dispatch Spec Reviewer**:
    - You are now the **Spec Reviewer**.
    - **Goal**: Verify _what was requested_ matches _what was built_.
    - **Process**:
      - Read the original task description.
      - Read the actual code changes (not just the summary).
      - Check for: Missing requirements, extra unrequested features, misunderstandings.
    - **Decision**:
      - ✅ **Pass**: Proceed to Phase 4.
      - ❌ **Fail**: Return to Phase 2 (Implementer) to fix specific gaps.
        - **Metric**: Increment `consecutive_first_pass_failures`.
        - **SAFETY CHECK**: If this is the 3rd failure for the same task, **STOP**.

## Phase 4: Code Quality Review (The "Code Reviewer")

5.  **Dispatch Code Reviewer**:
    - You are now the **Code Reviewer**.
    - **Goal**: Verify code health and maintainability.
    - **Process**:
      - Review code for: Naming, complexity, test coverage, pattern consistency.
    - **Decision**:
      - ✅ **Pass**: Proceed to Phase 5.
      - ❌ **Fail**: Return to Phase 2 (Implementer) to fix quality issues.
        - **Metric**: Increment `consecutive_first_pass_failures`.
        - **SAFETY CHECK**: If this is the 3rd failure for the same task, **STOP**.

## Phase 5: Completion & Loop

6.  **Mark Complete**:
    - Check the box `[x]` in the task list for the current task.

7.  **Loop & Safety**:
    - **Context Check**: You have `TASKS_PER_CONTEXT_REFRESH` tasks before a forced refresh.
    - **Error Velocity Check**: If `consecutive_first_pass_failures` >= `MAX_CONSECUTIVE_REWORKS`, **STOP** and force a context refresh.
    - **Auto-Maintenance**: If you feel context degrading, perform a self-correction or summary using `context-window-management`, then **CONTINUE**.
    - **CONTINUE**: Return to **Phase 1** immediately until all tasks are done.
