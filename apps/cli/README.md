<h1 align="center">Blode.md</h1>

<p align="center">Deploy and manage documentation sites from the command line.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/blodemd"><img src="https://img.shields.io/npm/v/blodemd.svg" alt="npm version"></a>
</p>

- **One-command deploy:** Push your entire docs folder to Blode.md with `blodemd push`.
- **Scaffold in seconds:** Generate a ready-to-edit docs folder with `blodemd init`.
- **Config validation:** Catch `docs.json` errors before deploying.
- **CI-friendly:** Authenticate via environment variables and use the GitHub Action for automated deploys.

## Install

```bash
npm install -g blodemd
```

Or run without installing:

```bash
npx blodemd
```

Requires Node.js 18+.

## Quick Start

```bash
# Scaffold a new docs folder
blodemd init

# Authenticate
blodemd login

# Deploy your docs
blodemd push
```

## Commands

```bash
blodemd init [dir]        Scaffold a docs folder (default: docs)
blodemd login             Authenticate with your API key
blodemd logout            Remove stored credentials
blodemd whoami            Show current authentication
blodemd validate [dir]    Validate docs.json
blodemd push [dir]        Deploy docs
blodemd dev               Show instructions for the local dev server
```

### `push` Options

```
--project <slug>    Project slug (env: BLODEMD_PROJECT)
--api-url <url>     API URL (env: BLODEMD_API_URL)
--api-key <token>   API key (env: BLODEMD_API_KEY)
--branch <name>     Git branch (env: BLODEMD_BRANCH)
--message <msg>     Deploy message (env: BLODEMD_COMMIT_MESSAGE)
```

The CLI reads the project slug from the `name` field in `docs.json` when `--project` is not set.

## CI / GitHub Actions

Use the `mblode/blodemd/packages/deploy-action` composite action to deploy on every push:

```yaml
- uses: mblode/blodemd/packages/deploy-action@main
  with:
    api-key: ${{ secrets.BLODEMD_API_KEY }}
    directory: docs
```

## Configuration

The CLI looks for a `docs.json` file in the docs directory. Minimal example:

```json
{
  "$schema": "https://mintlify.com/docs.json",
  "name": "my-project",
  "theme": "mint",
  "colors": { "primary": "#0D9373" },
  "navigation": {
    "groups": [{ "group": "Getting Started", "pages": ["index"] }]
  }
}
```

The CLI searches for `docs.json` in the current directory, then `docs/`, then `apps/docs/`.

## Programmatic API

```typescript
import type { DeploymentResponse } from "blodemd";
```

The package exports the `DeploymentResponse` type for use in custom deployment scripts.

## License

[MIT](../../LICENSE)
