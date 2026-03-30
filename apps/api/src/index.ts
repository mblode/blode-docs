import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { logError } from "./lib/logger";
import { notFound } from "./lib/responses";
import { apiKeys } from "./routes/api-keys";
import { auth } from "./routes/auth";
import { deployments } from "./routes/deployments";
import { domains } from "./routes/domains";
import { projects } from "./routes/projects";
import { tenants } from "./routes/tenants";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    credentials: true,
    origin: (origin) => origin || "*",
  })
);

// oxlint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
app.onError((error, c) => {
  logError("Unhandled API error", error);
  return c.text("Internal Server Error", 500);
});

app.notFound((c) => notFound(c));

app.get("/health", (c) =>
  c.json(
    {
      ok: true as const,
      timestamp: new Date().toISOString(),
    },
    200
  )
);

app.route("/auth", auth);
app.route("/tenants", tenants);
app.route("/projects", projects);
app.route("/projects", domains);
app.route("/projects", deployments);
app.route("/projects", apiKeys);

export { app };
export type AppType = typeof app;

const start = () => {
  try {
    const port = Number(process.env.PORT ?? 4000);
    serve({
      fetch: app.fetch,
      hostname: "0.0.0.0",
      port,
    });
  } catch (error) {
    logError("Failed to start API server", error);
    process.exit(1);
  }
};

if (
  process.env.NODE_ENV !== "test" &&
  process.env.VITEST !== "true" &&
  !process.env.VERCEL
) {
  start();
}

export default app;
