<div align="center">

# [Blode.md](https://blode.md)

**Git-native docs, published on merge**

Write your docs as MDX files next to your code, then push them live with one command.

<p align="center">
  <a href="https://www.npmjs.com/package/blodemd">
    <img src="https://img.shields.io/npm/v/blodemd?style=flat&colorA=000000&colorB=000000" />
  </a>
  <a href="https://github.com/mblode/blodemd/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/mblode/blodemd?style=flat&colorA=000000&colorB=000000" />
  </a>
</p>

</div>

## Demo

Every docs site on the platform is built this way, including [captain.blode.md](https://captain.blode.md).

<p>
<a href="https://blode.md">
<img alt="Read the docs" src=".github/assets/demo.svg" width="200" />
</a>
</p>

## Install

```bash
npm install -g blodemd
```

## Quickstart

```bash
# Sign in with GitHub in your browser, once
blodemd login

# Scaffold a docs site into ./docs
blodemd new docs --template starter

# Preview it at localhost:3030, reloading as you edit
blodemd dev

# Deploy
blodemd push docs
```

Your site is live on its own `blode.md` subdomain, taking its name, navigation, and theme from the `docs.json` that `blodemd new` writes.

## Commands

| Command              | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| `blodemd login`      | Authenticate with GitHub in your browser, no API key to manage |
| `blodemd new [dir]`  | Scaffold a docs site, `--template minimal` or `starter`        |
| `blodemd dev`        | Serve the docs locally and reload on save                      |
| `blodemd validate`   | Check `docs.json` before you deploy                            |
| `blodemd push [dir]` | Deploy a docs directory to its project                         |
| `blodemd projects`   | List the projects on your account                              |
| `blodemd analytics`  | Manage PostHog: `get`, `set posthog <key>`, `unset posthog`    |

## Agent skill

Install the slash command for Claude Code or any [skills.sh](https://skills.sh)-compatible agent:

```bash
npx skills add mblode/blodemd -g --all -y
```

Then scaffold and deploy in plain language:

```text
/blodemd new my-project --template starter
/blodemd push docs/ --project my-project
```

## Environment and exit codes

| Variable          | Purpose                                                                        |
| ----------------- | ------------------------------------------------------------------------------ |
| `BLODEMD_API_KEY` | API key. Used ahead of a stored login session, so CI needs no `blodemd login`. |
| `BLODEMD_PROJECT` | Default value for `--project`.                                                 |
| `BLODEMD_API_URL` | API origin. Defaults to the hosted API.                                        |

Every command exits with one of these, so a CI gate can branch on the number:

| Code | Meaning                                |
| ---- | -------------------------------------- |
| `0`  | Success                                |
| `1`  | Error                                  |
| `2`  | Cancelled, including a declined prompt |
| `3`  | Invalid input or config                |
| `4`  | Authentication required                |
| `5`  | Network failure                        |

With `--json`, a failure is data too: the command writes one line to stdout shaped `{"error":true,"code":"AUTH_REQUIRED","message":"...","hint":"..."}`. Branch on `code`, which is stable, rather than on `message`, which is written for a human.

## Notes

- Node.js 24.
- `push`, `validate`, and `projects` take `--json`, and `push` reads `BLODEMD_PROJECT`, `BLODEMD_API_KEY`, and `BLODEMD_BRANCH` from the environment, so CI can deploy without an interactive login.
- Install the GitHub App from your project's dashboard to deploy automatically on every push to a branch.

## License

MIT

---

Crafted by [<img src="https://blode.co/avatar-circle.png" width="20" align="top" />](https://blode.co) [Matthew Blode](https://blode.co)
