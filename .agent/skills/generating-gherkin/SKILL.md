---
name: generating-gherkin
description: Reads through code and writes Gherkin test cases for all functionality. Use when the user asks to generate test cases, write BDD scenarios, or document system behavior in Gherkin format.
---

# Gherkin Test Generator

This skill guides the agent in analyzing the codebase and generating comprehensive Gherkin (Cucumber) test cases.

## When to use this skill

- The user asks to "write Gherkin test cases" for the project.
- The user wants BDD scenarios for existing functionality.
- The user needs to document system behavior in a structured test format.

## Workflow

### 1. Scope Definition

- If the user implies "all code", start by listing all relevant source files (excluding `node_modules`, `dist`, config files, etc.).
- Use `find_by_name` or `list_dir` to map the codebase.
- **Critical**: For large codebases, process in chunks (e.g., feature by feature or directory by directory) to avoid context window limits.

### 2. Analysis & Extraction

For each component or feature:

1.  **Read Code**: key implementation files (Typescript/React components, API routes, backend logic).
2.  **Identify Behaviors**:
    - Public API endpoints (inputs -> outputs).
    - User interactions (UI clicks -> state changes).
    - Data validation rules.
    - System integrity constraints (e.g., idempotency, role access).
3.  **Map to Gherkin**:
    - **Feature**: High-level capability (e.g., "Class Registration").
    - **Scenario**: Specific path (e.g., "Successful registration", "Registration with full class").
    - **Given**: Preconditions (Auth state, database state).
    - **When**: Action (User clicks, API request).
    - **Then**: Postconditions (Database update, UI feedback).

### 3. Output Generation

- Create `.feature` files mirroring the project structure (e.g., `tests/features/registration.feature`).
- Use strict Gherkin syntax.

## Guidelines

- **Granularity**: Write scenarios for both "Happy Paths" and "Edge Cases" (errors, limits).
- **Language**: Use domain-specific language (e.g., "Student", "Class", "Enrollment") consistent with the codebase.
- **Completeness**: The user asked for "all functionality". Do not skip error handling, validation, or role-based access checks.

## Template

```gherkin
Feature: [Component Name]
  As a [Role]
  I want [Action]
  So that [Benefit]

  Scenario: [Descriptive Title]
    Given [Precondition]
    And [Additional context]
    When [Action is performed]
    Then [Expected outcome]
    And [Side effects]

  Scenario: [Error Case]
    Given [Precondition]
    When [Invalid action]
    Then [Error message is displayed]
```
