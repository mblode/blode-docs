"use client";

import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { OpenApiEntry } from "@/lib/openapi";

const extractParams = (entry: OpenApiEntry, location: "path" | "query") =>
  (entry.operation.parameters ?? []).filter(
    (param) => (param as { in?: string }).in === location
  ) as { name?: string; required?: boolean; description?: string }[];

export const ApiPlayground = ({
  entry,
  proxyEnabled,
}: {
  entry: OpenApiEntry;
  proxyEnabled: boolean;
}) => {
  const servers = entry.spec.servers ?? [];
  const [serverIndex, setServerIndex] = useState(0);
  const [response, setResponse] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [body, setBody] = useState("{}");
  const [authToken, setAuthToken] = useState("");
  const [useProxy, setUseProxy] = useState(proxyEnabled);

  const pathParams = useMemo(() => extractParams(entry, "path"), [entry]);
  const queryParams = useMemo(() => extractParams(entry, "query"), [entry]);
  const [pathValues, setPathValues] = useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});

  const baseUrl = servers[serverIndex]?.url ?? "";
  const canSend = Boolean(baseUrl);

  const buildUrl = useCallback(() => {
    let { path } = entry.operation;
    for (const param of pathParams) {
      const key = param.name ?? "";
      const value = pathValues[key] ?? "";
      path = path.replace(`{${key}}`, encodeURIComponent(value));
    }

    const url = new URL(path, baseUrl || "http://localhost");
    for (const param of queryParams) {
      const key = param.name ?? "";
      const value = queryValues[key];
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }, [
    baseUrl,
    entry.operation,
    pathParams,
    pathValues,
    queryParams,
    queryValues,
  ]);

  const handleUseProxyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setUseProxy(event.target.checked);
    },
    []
  );
  const handleServerChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setServerIndex(Number(event.target.value));
    },
    []
  );
  const handlePathValueChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      setPathValues((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    []
  );
  const handleQueryValueChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      setQueryValues((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    []
  );
  const handleAuthTokenChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setAuthToken(event.target.value);
    },
    []
  );
  const handleBodyChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setBody(event.target.value);
    },
    []
  );

  const handleSend = useCallback(async () => {
    const url = buildUrl();
    setIsLoading(true);
    setResponse(null);
    setStatus(null);

    try {
      const { method } = entry.operation;
      const requestHeaders = {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      };

      const payload = {
        body,
        headers: requestHeaders,
        method,
        url,
      };

      const requestUrl = useProxy ? "/blodemd-internal/proxy" : url;
      const requestMethod = useProxy ? "POST" : method;
      const requestHeadersToSend = useProxy
        ? {
            "Content-Type": "application/json",
          }
        : requestHeaders;

      let requestBody: string | undefined;
      if (useProxy) {
        requestBody = JSON.stringify(payload);
      } else if (method === "GET") {
        requestBody = undefined;
      } else {
        requestBody = body;
      }

      const res = await fetch(requestUrl, {
        body: requestBody,
        headers: requestHeadersToSend,
        method: requestMethod,
      });

      const text = await res.text();
      setStatus(res.status);
      let formatted = text;
      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        formatted = text;
      }
      setResponse(formatted || "(empty response)");
    } catch (error) {
      setStatus(0);
      setResponse(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, body, buildUrl, entry.operation, useProxy]);

  return (
    <section className="mt-7 grid gap-3">
      <div className="grid gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2>Try it out</h2>
          {proxyEnabled ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={useProxy}
                className="accent-primary"
                onChange={handleUseProxyChange}
                type="checkbox"
              />
              Use docs proxy
            </label>
          ) : null}
        </div>

        {servers.length ? (
          <Field>
            <FieldLabel htmlFor="api-server">Server</FieldLabel>
            <select
              className="flex h-[var(--field-height)] w-full rounded-[var(--field-radius)] border border-input bg-card px-[var(--field-padding-x)] py-[var(--field-padding-y)] font-sans text-base text-foreground shadow-input transition-colors hover:border-input-hover focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/15 focus:ring-offset-1 focus:ring-offset-background"
              id="api-server"
              onChange={handleServerChange}
              value={serverIndex}
            >
              {servers.map((server, index) => (
                <option key={server.url} value={index}>
                  {server.url}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {pathParams.length ? (
          <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
            {pathParams.map((param) => (
              <Field key={param.name}>
                <FieldLabel htmlFor={`path-${param.name}`}>
                  {param.name}
                </FieldLabel>
                <Input
                  id={`path-${param.name}`}
                  name={param.name ?? ""}
                  onChange={handlePathValueChange}
                  placeholder={param.required ? "Required" : "Optional"}
                  type="text"
                  value={pathValues[param.name ?? ""] ?? ""}
                />
              </Field>
            ))}
          </div>
        ) : null}

        {queryParams.length ? (
          <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
            {queryParams.map((param) => (
              <Field key={param.name}>
                <FieldLabel htmlFor={`query-${param.name}`}>
                  {param.name}
                </FieldLabel>
                <Input
                  id={`query-${param.name}`}
                  name={param.name ?? ""}
                  onChange={handleQueryValueChange}
                  placeholder={param.required ? "Required" : "Optional"}
                  type="text"
                  value={queryValues[param.name ?? ""] ?? ""}
                />
              </Field>
            ))}
          </div>
        ) : null}

        <Field>
          <FieldLabel htmlFor="auth-token">Auth token</FieldLabel>
          <Input
            id="auth-token"
            onChange={handleAuthTokenChange}
            placeholder="Bearer token"
            type="password"
            value={authToken}
          />
        </Field>

        {entry.operation.method === "GET" ? null : (
          <Field>
            <FieldLabel htmlFor="request-body">Request body</FieldLabel>
            <textarea
              className="flex w-full rounded-[var(--field-radius)] border border-input bg-card px-[var(--field-padding-x)] py-[var(--field-padding-y)] font-sans text-base text-foreground shadow-input transition-colors placeholder:text-placeholder-foreground hover:border-input-hover focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/15 focus:ring-offset-1 focus:ring-offset-background"
              id="request-body"
              onChange={handleBodyChange}
              rows={6}
              value={body}
            />
          </Field>
        )}

        <Button
          className="w-full"
          disabled={isLoading || !canSend}
          onClick={handleSend}
          type="button"
        >
          {isLoading ? "Sending..." : "Send request"}
        </Button>
        {canSend ? null : (
          <p className="text-sm text-muted-foreground">
            Add a server URL in your OpenAPI spec to enable requests.
          </p>
        )}

        {response === null ? null : (
          <div className="rounded-xl border border-border bg-primary/[0.08] p-3">
            <div className="font-semibold">Status: {status}</div>
            <pre className="mt-2 overflow-x-auto">{response}</pre>
          </div>
        )}
      </div>
    </section>
  );
};
