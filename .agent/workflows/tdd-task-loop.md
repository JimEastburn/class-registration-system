---
description: Standard TDD loop for completing tasks: Implement -> Test -> Verify -> Commit -> Update -> Loop.
---

1. **Identify Task**: Read the task list (e.g., `docs/TASKS.md` or the active `task.md` artifact) to find the next pending item.
2. **Implement**: Write the code to complete the identified task.
3. **Test**: Write and run automated tests (Unit/Integration) to validate the new code. Ensure strict TDD (Red-Green-Refactor) where possible.
4. **Verify**: Perform any necessary manual or system verification to ensure the feature works as expected.
5. **Commit & Push**:
   - Create a git commit with a descriptive message.
   - Push the changes to the `master` branch.
6. **Update Tracking**: Mark the task as complete in the task list.
7. **Loop**: Check for the next task. If available, go to Step 1.
