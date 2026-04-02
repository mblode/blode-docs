import { generateKeyPairSync } from "node:crypto";
import { Server } from "ssh2";

import {
  fetchTenantDocs,
  fetchTenantFullDocs,
  fetchTenantPage,
} from "./docs.js";
import { runTui } from "./tui.js";

const PORT = Number(process.env.SSH_PORT ?? 2222);
const DOCS_APP_URL =
  process.env.DOCS_APP_URL?.trim() || "https://blode.md";
const PLATFORM_ROOT_DOMAIN =
  process.env.PLATFORM_ROOT_DOMAIN?.trim() || "blode.md";

// In production set SSH_HOST_KEY to a base64-encoded PEM private key so the
// host key stays stable across restarts. Without it an ephemeral key is
// generated each time, which triggers "host key changed" warnings for users.
const getHostKey = (): string | Buffer => {
  const envKey = process.env.SSH_HOST_KEY?.trim();
  if (envKey) {
    return Buffer.from(envKey, "base64");
  }
  const { privateKey } = generateKeyPairSync("ed25519");
  return privateKey.export({ format: "pem", type: "pkcs8" }) as string;
};

const HELP = `\
Usage:

  Browse docs interactively:
    ssh <project>@blode.md

  Pipe a specific page:
    ssh <project>@blode.md <page-slug>

  Give Claude Code up-to-date context:
    ssh <project>@blode.md setup | claude
    ssh <project>@blode.md agents >> CLAUDE.md

`;

const server = new Server({ hostKeys: [getHostKey()] }, (client) => {
  let tenantSlug = "";

  client.on("authentication", (ctx) => {
    // Accept all auth attempts — docs are public read-only.
    tenantSlug = ctx.username;
    ctx.accept();
  });

  client.on("ready", () => {
    client.on("session", (acceptSession) => {
      const session = acceptSession();
      let ptyRows = 24;
      let ptyCols = 80;

      session.on("pty", (accept, _reject, info) => {
        ptyRows = info.rows || 24;
        ptyCols = info.cols || 80;
        accept();
      });

      session.on("window-change", (_accept, _reject, info) => {
        ptyRows = info.rows || ptyRows;
        ptyCols = info.cols || ptyCols;
      });

      // Interactive shell — show the TUI browser
      session.on("shell", async (accept) => {
        const stream = accept();

        if (!tenantSlug) {
          stream.write(HELP);
          stream.exit(0);
          stream.end();
          return;
        }

        const docs = await fetchTenantDocs(
          DOCS_APP_URL,
          PLATFORM_ROOT_DOMAIN,
          tenantSlug
        );

        if (!docs || docs.pages.length === 0) {
          stream.write(
            `Project "${tenantSlug}" not found or has no published docs.\r\n`
          );
          stream.exit(1);
          stream.end();
          return;
        }

        await runTui(
          stream,
          docs,
          tenantSlug,
          (slug) =>
            fetchTenantPage(DOCS_APP_URL, PLATFORM_ROOT_DOMAIN, tenantSlug, slug).then(
              (c) => c ?? `Page not found: ${slug}`
            ),
          ptyRows,
          ptyCols
        );

        stream.exit(0);
        stream.end();
      });

      // Non-interactive exec — return raw markdown for piping
      session.on("exec", async (accept, _reject, info) => {
        const stream = accept();
        const command = info.command.trim();

        if (!tenantSlug) {
          stream.stderr.write("No project specified. Use: ssh <project>@blode.md\n");
          stream.exit(1);
          stream.end();
          return;
        }

        // No command → dump full docs (useful for: ssh proj@blode.md | claude)
        if (!command) {
          const full = await fetchTenantFullDocs(
            DOCS_APP_URL,
            PLATFORM_ROOT_DOMAIN,
            tenantSlug
          );
          stream.write(full ?? `Project "${tenantSlug}" not found.\n`);
          stream.exit(full ? 0 : 1);
          stream.end();
          return;
        }

        // Treat the command as a page slug
        const content = await fetchTenantPage(
          DOCS_APP_URL,
          PLATFORM_ROOT_DOMAIN,
          tenantSlug,
          command
        );

        if (content) {
          stream.write(content);
          stream.exit(0);
        } else {
          // Fall back to full docs so `| claude` still gets useful context
          const full = await fetchTenantFullDocs(
            DOCS_APP_URL,
            PLATFORM_ROOT_DOMAIN,
            tenantSlug
          );
          if (full) {
            stream.write(full);
            stream.exit(0);
          } else {
            stream.stderr.write(`Page "${command}" not found.\n`);
            stream.exit(1);
          }
        }

        stream.end();
      });
    });
  });

  client.on("error", (err) => {
    // Suppress noisy connection-reset errors from port scanners etc.
    if ((err as NodeJS.ErrnoException).code !== "ECONNRESET") {
      console.error("Client error:", err.message);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`SSH docs server listening on :${PORT}`);
  console.log(`  ssh <project>@${PLATFORM_ROOT_DOMAIN} -p ${PORT}`);
});
