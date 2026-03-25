---
name: context7
description: Retrieve up-to-date documentation for software libraries, frameworks, and components via the Context7 API. This skill should be used when looking up documentation for any programming library or framework, finding code examples for specific APIs or features, verifying correct usage of library functions, or obtaining current information about library APIs that may have changed since training.
---

# Context7

## Overview

This skill enables retrieval of current documentation for software libraries and components by querying the Context7 API via curl. Use it instead of relying on potentially outdated training data.

## Workflow

### Step 1: Search for the Library

To find the Context7 library ID, query the search endpoint:

```bash
curl -s "https://context7.com/api/v2/libs/search?libraryName=LIBRARY_NAME&query=TOPIC" | jq '.results[0]'
```

**Parameters:**

- `libraryName` (required): The library name to search for (e.g., "react", "nextjs", "fastapi", "axios")
- `query` (required): A description of the topic for relevance ranking

**Response fields:**

- `id`: Library identifier for the context endpoint (e.g., `/websites/react_dev_reference`)
- `title`: Human-readable library name
- `description`: Brief description of the library
- `totalSnippets`: Number of documentation snippets available

### Step 2: Fetch Documentation

To retrieve documentation, use the library ID from step 1:

```bash
curl -s "https://context7.com/api/v2/context?libraryId=LIBRARY_ID&query=TOPIC&type=txt"
```

**Parameters:**

- `libraryId` (required): The library ID from search results
- `query` (required): The specific topic to retrieve documentation for
- `type` (optional): Response format - `json` (default) or `txt` (plain text, more readable)

## Examples

### React hooks documentation

```bash
# Find React library ID
curl -s "https://context7.com/api/v2/libs/search?libraryName=react&query=hooks" | jq '.results[0].id'
# Returns: "/websites/react_dev_reference"

# Fetch useState documentation
curl -s "https://context7.com/api/v2/context?libraryId=/websites/react_dev_reference&query=useState&type=txt"
```

### Next.js routing documentation

```bash
# Find Next.js library ID
curl -s "https://context7.com/api/v2/libs/search?libraryName=nextjs&query=routing" | jq '.results[0].id'

# Fetch app router documentation
curl -s "https://context7.com/api/v2/context?libraryId=/vercel/next.js&query=app+router&type=txt"
```

### FastAPI dependency injection

```bash
# Find FastAPI library ID
curl -s "https://context7.com/api/v2/libs/search?libraryName=fastapi&query=dependencies" | jq '.results[0].id'

# Fetch dependency injection documentation
curl -s "https://context7.com/api/v2/context?libraryId=/fastapi/fastapi&query=dependency+injection&type=txt"
```

## Tips

- Use `type=txt` for more readable output
- Use `jq` to filter and format JSON responses
- Be specific with the `query` parameter to improve relevance ranking
- If the first search result is not correct, check additional results in the array
- URL-encode query parameters containing spaces (use `+` or `%20`)
- No API key is required for basic usage (rate-limited)

## Fallback: When Context7 API is Unreachable

If `context7.com` is blocked by a network proxy or the API is down:

1. **Use the Context7 MCP server** (preferred): If available as an MCP tool, use `mcp_context7_resolve-library-id` and `mcp_context7_query-docs` instead of curl. The MCP server may have a different network path.

2. **Check GEMINI.md for pinned library IDs**: The project configuration file contains a table of pre-resolved Context7 library IDs for core dependencies. Use these directly with the MCP tools.

3. **Use `search_web`**: Search for official documentation:
   ```
   search_web("Next.js App Router data fetching", domain: "nextjs.org")
   ```

4. **Use `read_url_content`**: Fetch official docs directly:
   ```
   read_url_content("https://nextjs.org/docs/app/building-your-application/data-fetching")
   ```

5. **Check installed MCP servers**: Some documentation may be available through other MCP tools specific to the library (e.g., Supabase MCP, Stripe MCP).

