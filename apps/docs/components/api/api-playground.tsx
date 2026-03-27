"use client";

import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import type { OpenApiEntry } from "@/lib/openapi";

const extractParams = (entry: OpenApiEntry, location: "path" | "query") =>
  (entry.operation.parameters ?? []).filter(
    (param) => (param as { in?: string }).in === location
  ) as { name?: string; required?: boolean; description?: string }[];

const fieldClass = "grid gap-1.5 text-sm";
const inputClass =
  "rounded-lg border border-border bg-background px-2.5 py-2 text-foreground";

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

      const requestUrl = useProxy ? "/_internal/proxy" : url;
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
          <label className={fieldClass}>
            <span>Server</span>
            <select
              className={inputClass}
              onChange={handleServerChange}
              value={serverIndex}
            >
              {servers.map((server, index) => (
                <option key={server.url} value={index}>
                  {server.url}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {pathParams.length ? (
          <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
            {pathParams.map((param) => (
              <label className={fieldClass} key={param.name}>
                <span>{param.name}</span>
                <input
                  className={inputClass}
                  name={param.name ?? ""}
                  onChange={handlePathValueChange}
                  placeholder={param.required ? "Required" : "Optional"}
                  type="text"
                  value={pathValues[param.name ?? ""] ?? ""}
                />
              </label>
            ))}
          </div>
        ) : null}

        {queryParams.length ? (
          <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
            {queryParams.map((param) => (
              <label className={fieldClass} key={param.name}>
                <span>{param.name}</span>
                <input
                  className={inputClass}
                  name={param.name ?? ""}
                  onChange={handleQueryValueChange}
                  placeholder={param.required ? "Required" : "Optional"}
                  type="text"
                  value={queryValues[param.name ?? ""] ?? ""}
                />
              </label>
            ))}
          </div>
        ) : null}

        <label className={fieldClass}>
          <span>Auth token</span>
          <input
            className={inputClass}
            onChange={handleAuthTokenChange}
            placeholder="Bearer token"
            type="password"
            value={authToken}
          />
        </label>

        {entry.operation.method === "GET" ? null : (
          <label className={fieldClass}>
            <span>Request body</span>
            <textarea
              className={inputClass}
              onChange={handleBodyChange}
              rows={6}
              value={body}
            />
          </label>
        )}

        <button
          className="rounded-xl border-none bg-primary px-3.5 py-2.5 font-semibold text-primary-foreground disabled:opacity-50"
          disabled={isLoading || !canSend}
          onClick={handleSend}
          type="button"
        >
          {isLoading ? "Sending..." : "Send request"}
        </button>
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
