---
name: blodemd
description: Scaffold, preview, and deploy beautiful MDX documentation sites with Blode.md. Use when the user wants to create a new docs site, validate their docs config, preview locally, or deploy to Blode.md. Triggers include "create docs", "deploy docs", "push docs", "preview docs", "scaffold a docs site", "set up documentation", "validate docs.json", or any task involving MDX documentation deployment.
user-invocable: true
argument-hint: <command> [options]
allowed-tools: Bash(npx blodemd *), Bash(blodemd *)
---

# Blode.md

Scaffold, preview, and deploy MDX documentation sites from the terminal. Write locally, ship with one command.

## Workflow

Every docs workflow follows this pattern:

```text
Docs progress:
- [ ] Step 1: Scaffold or locate the docs directory
- [ ] Step 2: Validate the configuration
- [ ] Step 3: Preview locally
- [ ] Step 4: Deploy to Blode.md
```

### Step 1: Scaffold a new docs site

```bash
npx blodemd new [directory] --slug <project-slug> --template <minimal|starter> -y
```

- **`minimal`** (default): Creates `docs.json` and `index.mdx` only
- **`starter`**: Includes brand assets, README, CLAUDE.md, AGENTS.md, and sample pages

If the user hasn't specified a directory, omit it and let the CLI prompt or default to `docs/`.

For non-interactive environments (CI, agents), always pass `-y` to accept defaults.

### Step 2: Validate the config

```bash
npx blodemd validate [dir]
```

Always validate before deploying. This checks `docs.json` against the schema and reports warnings.

### Step 3: Preview locally

```bash
npx blodemd dev --dir <dir> --port 3030
```

Starts a local Next.js dev server with hot-reloading. Opens the browser automatically (pass `--no-open` to suppress).

### Step 4: Deploy to Blode.md

```bash
npx blodemd push [dir] --project <slug>
```

Deploys all files in the docs directory to Blode.md. Requires authentication first:

```bash
npx blodemd login
```

Or pass credentials via environment:

```bash
BLODEMD_API_KEY=<key> npx blodemd push --project <slug>
```

## Authentication

| Method               | Command                     |
| -------------------- | --------------------------- |
| Browser OAuth        | `npx blodemd login`         |
| API key paste        | `npx blodemd login --token` |
| Environment variable | `BLODEMD_API_KEY=<key>`     |
| Check status         | `npx blodemd whoami`        |
| Remove credentials   | `npx blodemd logout`        |

## CI / GitHub Actions

For automated deploys, set these environment variables:

- `BLODEMD_API_KEY` - API key for authentication
- `BLODEMD_PROJECT` - Project slug (alternative to `--project` flag)
- `BLODEMD_BRANCH` - Override branch detection
- `BLODEMD_COMMIT_MESSAGE` - Override commit message detection

## docs.json

The `docs.json` file is the config for a Blode.md site. It must include a `slug` field:

```json
{
  "slug": "my-project",
  "name": "My Project"
}
```

## Output format

When reporting results back to the user, use this structure:

```
<blodemd_result>
Action: scaffold | validate | preview | deploy
Status: success | failed
Project: <slug>
Details: <summary of what happened>
</blodemd_result>
```
