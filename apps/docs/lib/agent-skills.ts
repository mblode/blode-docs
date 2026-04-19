import { createHash } from "node:crypto";

export const BLODEMD_SKILL_CONTENT = `---
name: blodemd
description: Scaffold, preview, and deploy beautiful MDX documentation sites with Blode.md. Use when the user wants to create a new docs site, validate their docs config, preview locally, or deploy to Blode.md. Triggers include "create docs", "deploy docs", "push docs", "preview docs", "scaffold a docs site", "set up documentation", "validate docs.json", or any task involving MDX documentation deployment.
user-invocable: true
argument-hint: <command> [options]
allowed-tools: Bash(npx blodemd *), Bash(blodemd *)
---

# Blode.md

Scaffold, preview, and deploy MDX documentation sites from the terminal. Write locally, ship with one command. Sign in once with GitHub in your browser, no API keys ever.

## Commands

- \`npx blodemd login\` - Browser sign-in with GitHub
- \`npx blodemd whoami\` - Show current authentication status
- \`npx blodemd new [directory] --slug <project-slug> --template <minimal|starter> -y\` - Scaffold a new docs site
- \`npx blodemd validate [dir]\` - Validate docs.json against the schema
- \`npx blodemd dev --dir <dir> --port 3030\` - Preview locally with hot reload
- \`npx blodemd push [dir] --project <slug>\` - Deploy a docs site

## Workflow

1. Verify auth with \`npx blodemd whoami\`
2. Scaffold or locate the docs directory
3. Validate the configuration
4. Preview locally
5. Deploy to Blode.md

## docs.json

The \`docs.json\` file is the config for a Blode.md site. It must include a \`slug\` field:

\`\`\`json
{
  "slug": "my-project",
  "name": "My Project"
}
\`\`\`
`;

export const BLODEMD_SKILL_DESCRIPTION =
  "Scaffold, preview, and deploy beautiful MDX documentation sites with Blode.md from the CLI.";

export const sha256Hex = (input: string) =>
  createHash("sha256").update(input, "utf8").digest("hex");
