---
name: pr-creator
description:
  Use this skill when asked to create a pull request (PR). It ensures all PRs
  follow the repository's established templates and standards.
---

# Pull Request Creator

This skill guides the creation of high-quality Pull Requests that adhere to the
repository's standards.

## Workflow

Follow these steps to create a Pull Request:

1.  **Branch Management**: Check the current branch to avoid working directly
    on the default branch.

    ```bash
    # Detect the default branch name
    DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
    if [ -z "$DEFAULT_BRANCH" ]; then
      DEFAULT_BRANCH=$(git remote show origin 2>/dev/null | grep 'HEAD branch' | cut -d: -f2 | xargs)
    fi
    CURRENT_BRANCH=$(git branch --show-current)

    echo "Default branch: $DEFAULT_BRANCH"
    echo "Current branch: $CURRENT_BRANCH"
    ```

    - If the current branch is the default branch, create and switch to a new
      descriptive branch:
      ```bash
      git checkout -b <new-branch-name>
      ```

2.  **Locate Template**: Search for a pull request template in the repository.
    - Check `.github/pull_request_template.md`
    - Check `.github/PULL_REQUEST_TEMPLATE.md`
    - Check `.github/PULL_REQUEST_TEMPLATE/` for multiple templates
    - If multiple templates exist, ask the user which one to use or select the
      most appropriate one based on context (e.g., `bug_fix.md` vs `feature.md`).
    - **If no template is found**, use the fallback template below.

3.  **Read Template**: Read the content of the identified template file.

4.  **Draft Description**: Create a PR description that strictly follows the
    template's structure.
    - **Headings**: Keep all headings from the template.
    - **Checklists**: Review each item. Mark with `[x]` if completed. If an item
      is not applicable, leave it unchecked `[ ]` for transparency.
    - **Content**: Fill in the sections with clear, concise summaries of your
      changes.
    - **Related Issues**: Link any issues fixed or related to this PR (e.g.,
      "Fixes #123").

5.  **Preflight Check**: Before creating the PR, run available checks.

    ```bash
    # Detect available check scripts from package.json
    PREFLIGHT=$(node -e "
      const p = require('./package.json');
      const candidates = ['preflight', 'ci', 'check-all', 'check'];
      const found = candidates.find(x => p.scripts?.[x]);
      if (found) { console.log('npm run ' + found); }
      else {
        const parts = [];
        if (p.scripts?.lint) parts.push('npm run lint');
        if (p.scripts?.['test:run']) parts.push('npm run test:run');
        else if (p.scripts?.test) parts.push('npm run test');
        if (p.scripts?.build) parts.push('npm run build');
        console.log(parts.join(' && ') || 'echo No check scripts found');
      }
    ")
    echo "Running: $PREFLIGHT"
    eval "$PREFLIGHT"
    ```

    If any checks fail, address the issues before proceeding to create the PR.

6.  **Create PR**: Use the `gh` CLI to create the PR. To avoid shell escaping
    issues with multi-line Markdown, write the description to a temporary file
    first.
    ```bash
    # 1. Write the drafted description to a temporary file
    # 2. Create the PR using the --body-file flag
    gh pr create --title "type(scope): succinct description" --body-file <temp_file_path>
    # 3. Remove the temporary file
    rm <temp_file_path>
    ```

    - **Title**: Ensure the title follows the
      [Conventional Commits](https://www.conventionalcommits.org/) format if the
      repository uses it (e.g., `feat(ui): add new button`,
      `fix(core): resolve crash`).

## Fallback PR Template

Use this when no `.github/pull_request_template.md` exists in the repository:

```markdown
## Summary

<!-- What does this PR do? Why? -->

## Changes

<!-- List the key changes made -->

-

## Testing

<!-- How was this tested? -->

- [ ] Unit tests pass
- [ ] Manual testing performed
- [ ] Build succeeds

## Related Issues

<!-- Link any related issues: Fixes #123, Closes #456 -->
```

## Principles

- **Compliance**: Never ignore the PR template. It exists for a reason.
- **Completeness**: Fill out all relevant sections.
- **Accuracy**: Don't check boxes for tasks you haven't done.
- **Adaptability**: Detect project conventions instead of assuming defaults.
