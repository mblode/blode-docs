---
name: blodemd
description: Scaffold, preview, and deploy beautiful MDX documentation sites with Blode.md. Use when the user wants to create a new docs site, validate their docs config, preview locally, or deploy to Blode.md. Triggers include "create docs", "deploy docs", "push docs", "preview docs", "scaffold a docs site", "set up documentation", "validate docs.json", or any task involving MDX documentation deployment.
user-invocable: true
argument-hint: <command> [options]
allowed-tools: Bash(npx blodemd *), Bash(blodemd *)
---

# Blode.md

Scaffold, preview, and deploy MDX documentation sites from the terminal. Write locally, ship with one command. **No API keys to paste** — sign in once with GitHub in your browser.

## First run from an agent

ALWAYS check auth before any deploy command:

```bash
npx blodemd whoami
```

If the output says `Not logged in`, do NOT prompt the user for an API key. Tell them to run **one command in their own terminal**:

```bash
npx blodemd login
```

That opens a browser tab → GitHub authorize → done. Credentials are cached and refreshed automatically. Then re-run `npx blodemd whoami` to confirm and continue.

## Workflow

Every docs workflow follows this pattern:

```text
Docs progress:
- [ ] Step 0: Verify auth with `blodemd whoami`
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

Deploys all files in the docs directory to Blode.md. The cached browser session from `blodemd login` is used automatically — no key pasting.

## Authentication

| Method                    | When to use                        | Command              |
| ------------------------- | ---------------------------------- | -------------------- |
| Browser sign-in (default) | Humans, agents triggered by humans | `npx blodemd login`  |
| Check status              | Verify before deploying            | `npx blodemd whoami` |
| Remove credentials        | Sign out                           | `npx blodemd logout` |

The default flow signs in with GitHub via the browser. The token is stored locally and auto-refreshes. **Agents should never prompt for an API key** — instead, ask the user to run `npx blodemd login` themselves.

### CI / GitHub Actions

GitHub Actions and other automated environments are the only places API keys make sense:

- `BLODEMD_API_KEY` — API key for authentication (issue from `/app/<project>/settings`)
- `BLODEMD_PROJECT` — Project slug (alternative to `--project` flag)
- `BLODEMD_BRANCH` — Override branch detection
- `BLODEMD_COMMIT_MESSAGE` — Override commit message detection

Or: install the **Blode.md GitHub App** from `/app/<project>/git` and skip the API key entirely — pushes deploy automatically.

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
