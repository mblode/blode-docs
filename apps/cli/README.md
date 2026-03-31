<h1 align="center">Blode.md</h1>

<p align="center">Deploy and manage documentation sites from the command line.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/blodemd"><img src="https://img.shields.io/npm/v/blodemd.svg" alt="npm version"></a>
</p>

- **One-command deploy:** Push your entire docs folder to Blode.md with `blodemd push`.
- **Scaffold in seconds:** Generate a ready-to-edit docs folder with `blodemd new`.
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

Requires Node.js 20.17+.

## Quick Start

```bash
# Create a new docs site
# Empty directories scaffold in place.
# Non-empty directories get a Mint-style safety prompt.
blodemd new

# Skip prompts and use defaults
blodemd new --yes

# Scaffold the current directory explicitly
blodemd new .

# Set the project slug explicitly
blodemd new --name acme-docs

# Create the richer starter template
blodemd new --template starter

# Preview locally
blodemd dev

# Authenticate
blodemd login

# Deploy your docs
blodemd push
```

## Commands

```bash
blodemd new [directory]   Create a new blode.md documentation site
blodemd login             Authenticate with your API key
blodemd logout            Remove stored credentials
blodemd whoami            Show current authentication
blodemd validate [dir]    Validate docs.json
blodemd push [dir]        Deploy docs
blodemd dev [dir]         Start the local docs preview server
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

Interactive `blodemd new` inspects the current directory first. In an empty directory it scaffolds there and prompts for the project slug. In a non-empty directory it offers a Mint-style choice between creating a `docs/` subdirectory and scaffolding the current directory. Non-interactive runs fall back to `docs/`, and `--yes` accepts those defaults without prompting.

Use `blodemd new --template starter` when you want the full starter layout with a repo README, `.gitignore`, `CLAUDE.md`, `AGENTS.md` as a symlink or pointer, SVG branding assets, and example content. The default `blodemd new` scaffold stays minimal and only writes `docs.json` plus `index.mdx`. The command stops with an error if the target directory already contains scaffolded files.

### `dev` Options

```bash
--dir <dir>       Docs directory
--port <port>     Local preview port (default: 3030)
--no-open         Don't open the browser automatically
```

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
  "$schema": "https://blode.md/docs.json",
  "name": "my-project",
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

This repository is licensed under MIT. Generated docs folders do not include a license file by default.
