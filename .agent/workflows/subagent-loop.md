---
description: continuous subagent loop for clearing a task list
---

# Subagent Loop Workflow

## Configuration

TASKS_PER_CONTEXT_REFRESH = 150
MAX_CONSECUTIVE_REWORKS = 3

This workflow dictates a strict loop for clearing tasks from a task list using specialized subagent personae.

---

## Phase 1: Task Identification

1.  **Read Task List**:
    - Check the active `task.md` artifact (e.g., `.gemini/antigravity/brain/.../task.md`) OR `docs/TASKS.md`.
    - Identify the **first** incomplete task (unchecked `[ ]`).
    - **STOP if no tasks remain** → Notify user "All tasks complete."

2.  **Context Extraction**:
    - Read the specific task description.
    - Identify necessary context (files, architectural constraints) relevant _only_ to this task.

---

## Phase 2: Implementation (The "Implementer")

3.  **Dispatch Implementer**:
    - You are now the **Implementer**.
    - **Goal**: Implement the task exactly as described.
    - **Rules**:
      - strict TDD (Red-Green-Refactor) if applicable.
      - strict adherence to the spec.
      - Self-review before finishing.
    - **Action**: Write code, run tests, commit changes.

---

## Phase 3: Specification Review (The "Spec Reviewer")

4.  **Dispatch Spec Reviewer**:
    - You are now the **Spec Reviewer**.
    - **Goal**: Verify _what was requested_ matches _what was built_.
    - **Process**:
      - Read the original task description.
      - **Check `tests/features/*.feature` for relevant Gherkin acceptance criteria.**
      - Read the actual code changes (not just the summary).
      - Check for: Missing requirements, misunderstandings.
    - **Decision**:
      - ✅ **Pass**: Proceed to Phase 4.
      - ❌ **Fail**: Return to Phase 2 (Implementer) to fix specific gaps.
        - **Metric**: Increment `consecutive_first_pass_failures`.
        - **SAFETY CHECK**: If this is the 3rd failure for the same task, **STOP** → Execute Context Refresh Protocol.

---

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
        - **SAFETY CHECK**: If this is the 3rd failure for the same task, **STOP** → Execute Context Refresh Protocol.

---

## Phase 5: Completion & Loop

6.  **Mark Complete**:
    - Check the box `[x]` in the task list for the current task.
    - Reset `consecutive_first_pass_failures` to 0.
    - Increment `tasks_completed_this_session`.

7.  **Loop & Safety**:
    - **Context Check**: If `tasks_completed_this_session` >= `TASKS_PER_CONTEXT_REFRESH`, execute **Context Refresh Protocol**.
    - **Error Velocity Check**: If `consecutive_first_pass_failures` >= `MAX_CONSECUTIVE_REWORKS`, execute **Context Refresh Protocol**.
    - **Auto-Maintenance**: If you feel context degrading (repeating yourself, forgetting recent changes), use `context-window-management` skill to summarize, then **CONTINUE**.
    - **CONTINUE**: Return to **Phase 1** immediately until all tasks are done.

---

## Context Refresh Protocol

When a context refresh is required:

1.  **Summarize Progress**:
    - Count completed tasks vs remaining tasks.
    - Note the task ID of the **next** incomplete task.
    - If stopped due to repeated failures, note the problematic task ID.

2.  **Notify User with Restart Instructions**:
    - Output a message like:

    ```
    ⏸️ CONTEXT REFRESH REQUIRED

    Progress: [X] of [Y] tasks completed.
    Next task: <!-- id: Z.Z.Z -->
    Reason: [Context limit reached / Repeated failures on task Z.Z.Z]

    To continue, start a new conversation and say:
    `/subagent-loop`

    I will automatically resume from the next incomplete task.
    ```

3.  **STOP execution** (do not attempt further tasks in this session).

---

## User Quick Reference

| Command           | Effect                                      |
| ----------------- | ------------------------------------------- |
| `/subagent-loop`  | Start or resume autonomous task execution   |
| "pause" or "stop" | Halt execution after current task completes |
| "skip task X.Y.Z" | Mark a task as skipped and continue         |

---

## Notes

- Tasks are identified by `<!-- id: X.Y.Z -->` markers in the task list.
- The workflow reads `docs/TASKS.md` as the default task source.
- All completed tasks persist across sessions (marked `[x]` in the file).
- Skipped tasks should be marked `[~]` with a comment explaining why.
