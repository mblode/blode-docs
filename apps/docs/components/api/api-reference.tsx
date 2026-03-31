import dynamic from "next/dynamic";

import type { OpenApiEntry } from "@/lib/openapi";
import { cn } from "@/lib/utils";

const ApiPlayground = dynamic(async () => {
  const apiModule = await import("@/components/api/api-playground");
  return { default: apiModule.ApiPlayground };
});

const methodColors: Record<string, string> = {
  delete: "bg-red-500",
  get: "bg-blue-500",
  patch: "bg-amber-500",
  post: "bg-green-500",
  put: "bg-orange-500",
};

export const ApiReference = ({
  entry,
  proxyEnabled,
  proxyPath,
  tenantSlug,
}: {
  entry: OpenApiEntry;
  proxyEnabled: boolean;
  proxyPath?: string;
  tenantSlug?: string;
}) => {
  const { operation } = entry;
  const parameters = operation.parameters ?? [];
  const requestBody = operation.requestBody as
    | { content?: Record<string, { schema?: unknown }> }
    | undefined;
  const responses = operation.responses ?? {};

  return (
    <div>
      <header className="mb-4 flex items-center gap-4">
        <div
          className={cn(
            "rounded-full px-2.5 py-1.5 text-xs font-semibold uppercase text-white",
            methodColors[operation.method.toLowerCase()] ?? "bg-primary"
          )}
        >
          {operation.method}
        </div>
        <div className="font-mono">{operation.path}</div>
      </header>
      {operation.summary ? (
        <p className="font-semibold">{operation.summary}</p>
      ) : null}
      {operation.description ? (
        <p className="text-muted-foreground">{operation.description}</p>
      ) : null}

      {parameters.length ? (
        <section className="mt-7 grid gap-3">
          <h2>Parameters</h2>
          <div className="grid gap-2">
            <div className="grid grid-cols-[120px_80px_80px_1fr] gap-3 rounded-lg border border-border bg-background/60 p-2.5 font-bold">
              <span>Name</span>
              <span>In</span>
              <span>Required</span>
              <span>Description</span>
            </div>
            {parameters.map((param) => {
              const name = (param as { name?: string }).name ?? "";
              const location = (param as { in?: string }).in ?? "";
              const required = (param as { required?: boolean }).required
                ? "Yes"
                : "No";
              const description =
                (param as { description?: string }).description ?? "";

              return (
                <div
                  className="grid grid-cols-[120px_80px_80px_1fr] gap-3 rounded-lg border border-border bg-background/60 p-2.5"
                  key={name}
                >
                  <span>{name}</span>
                  <span>{location}</span>
                  <span>{required}</span>
                  <span>{description}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {requestBody?.content ? (
        <section className="mt-7 grid gap-3">
          <h2>Request Body</h2>
          <pre className="overflow-x-auto rounded-lg bg-code p-3 text-code-foreground">
            {JSON.stringify(requestBody.content, null, 2)}
          </pre>
        </section>
      ) : null}

      {Object.keys(responses).length ? (
        <section className="mt-7 grid gap-3">
          <h2>Responses</h2>
          <div className="grid gap-2">
            {Object.entries(responses).map(([status, response]) => {
              const description =
                (response as { description?: string }).description ?? "";
              return (
                <div
                  className="flex justify-between rounded-lg border border-border bg-background/60 p-2.5"
                  key={status}
                >
                  <span className="font-semibold">{status}</span>
                  <span className="text-muted-foreground">{description}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <ApiPlayground
        entry={entry}
        key={`${entry.identifier}:${operation.method}:${operation.path}`}
        proxyEnabled={proxyEnabled}
        proxyPath={proxyPath}
        tenantSlug={tenantSlug}
      />
    </div>
  );
};
