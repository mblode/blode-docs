// oxlint-disable no-use-before-define -- circular reference in callback pattern
import { createServer } from "node:http";
import type { Socket } from "node:net";

import { CliError, EXIT_CODES } from "./errors.js";

interface OAuthCallbackOptions {
  redirectUrl: URL;
  expectedState: string;
  timeoutMs: number;
}

const SUCCESS_HTML =
  '<!doctype html><html><head><meta charset="utf-8"/><title>Blode.md CLI</title></head><body><h2>Logged in! You can close this tab.</h2></body></html>';

const escapeHtml = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const errorHtml = (message: string): string =>
  `<!doctype html><html><head><meta charset="utf-8"/><title>Blode.md CLI</title></head><body><h2>Login failed</h2><p>${escapeHtml(message)}</p></body></html>`;

export const waitForOAuthCode = (
  options: OAuthCallbackOptions
): Promise<string> => {
  const host = options.redirectUrl.hostname;
  const port = Number(options.redirectUrl.port);
  const { pathname } = options.redirectUrl;

  if (!Number.isInteger(port) || port <= 0) {
    return Promise.reject(
      new CliError(
        "OAuth redirect URL requires an explicit port",
        EXIT_CODES.ERROR
      )
    );
  }

  // oxlint-disable-next-line eslint-plugin-promise/avoid-new -- wrapping callback-based HTTP server
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const sockets = new Set<Socket>();

    const settle = (ok: boolean, value: string | CliError): void => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);

      httpServer.close(() => {
        if (ok) {
          resolve(value as string);
        } else {
          reject(value);
        }
      });

      // Destroy kept-alive connections so httpServer.close() can finish
      for (const socket of sockets) {
        socket.destroy();
      }
    };

    const httpServer = createServer((request, response) => {
      if (!request.url) {
        response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
        response.end(errorHtml("Missing request URL"));
        settle(
          false,
          new CliError(
            "OAuth callback is missing a request URL",
            EXIT_CODES.ERROR
          )
        );
        return;
      }

      const url = new URL(request.url, options.redirectUrl.origin);

      if (url.pathname !== pathname) {
        response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        response.end(errorHtml("Invalid callback path"));
        return;
      }

      const providerError = url.searchParams.get("error");
      if (providerError) {
        const description =
          url.searchParams.get("error_description") ?? providerError;

        response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
        response.end(errorHtml(description));

        settle(
          false,
          new CliError(
            `OAuth provider returned an error: ${description}`,
            EXIT_CODES.ERROR
          )
        );
        return;
      }

      const state = url.searchParams.get("state");
      if (state !== options.expectedState) {
        response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
        response.end(errorHtml("State verification failed"));

        settle(
          false,
          new CliError("OAuth state verification failed", EXIT_CODES.ERROR)
        );
        return;
      }

      const code = url.searchParams.get("code");
      if (!code) {
        response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
        response.end(errorHtml("Authorization code was missing"));

        settle(
          false,
          new CliError(
            "OAuth callback is missing an authorization code",
            EXIT_CODES.ERROR
          )
        );
        return;
      }

      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(SUCCESS_HTML);
      settle(true, code);
    });

    httpServer.on("connection", (socket) => {
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
    });

    httpServer.on("error", (error) => {
      settle(
        false,
        new CliError(
          `Failed to start callback server on ${host}:${port}: ${error.message}`,
          EXIT_CODES.ERROR
        )
      );
    });

    const timer = setTimeout(() => {
      settle(
        false,
        new CliError("Login timed out. Please try again.", EXIT_CODES.CANCELLED)
      );
    }, options.timeoutMs);

    httpServer.listen(port, host);
  });
};
