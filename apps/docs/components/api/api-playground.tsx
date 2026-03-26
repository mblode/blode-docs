"use client";

import { useMemo, useState } from "react";

import type { OpenApiEntry } from "@/lib/openapi";

const extractParams = (entry: OpenApiEntry, location: "path" | "query") =>
  (entry.operation.parameters ?? []).filter(
    (param) => (param as { in?: string }).in === location
  ) as { name?: string; required?: boolean; description?: string }[];

export const ApiPlayground = ({
  entry,
  proxyEnabled,
  tenantSlug,
}: {
  entry: OpenApiEntry;
  proxyEnabled: boolean;
  tenantSlug: string;
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

  const buildUrl = () => {
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
  };

  const handleSend = async () => {
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

      const requestUrl = useProxy ? "/api/proxy" : url;
      const requestMethod = useProxy ? "POST" : method;
      const requestHeadersToSend = useProxy
        ? {
            "Content-Type": "application/json",
            "x-tenant-slug": tenantSlug,
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
  };

  return (
    <section className="api-section">
      <div className="api-playground">
        <div className="api-playground__header">
          <h2>Try it out</h2>
          {proxyEnabled ? (
            <label className="api-playground__toggle">
              <input
                checked={useProxy}
                onChange={(event) => setUseProxy(event.target.checked)}
                type="checkbox"
              />
              Use Atlas proxy
            </label>
          ) : null}
        </div>

        {servers.length ? (
          <label className="api-playground__field">
            <span>Server</span>
            <select
              onChange={(event) => setServerIndex(Number(event.target.value))}
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
          <div className="api-playground__params">
            {pathParams.map((param) => (
              <label className="api-playground__field" key={param.name}>
                <span>{param.name}</span>
                <input
                  onChange={(event) =>
                    setPathValues((prev) => ({
                      ...prev,
                      [param.name ?? ""]: event.target.value,
                    }))
                  }
                  placeholder={param.required ? "Required" : "Optional"}
                  type="text"
                  value={pathValues[param.name ?? ""] ?? ""}
                />
              </label>
            ))}
          </div>
        ) : null}

        {queryParams.length ? (
          <div className="api-playground__params">
            {queryParams.map((param) => (
              <label className="api-playground__field" key={param.name}>
                <span>{param.name}</span>
                <input
                  onChange={(event) =>
                    setQueryValues((prev) => ({
                      ...prev,
                      [param.name ?? ""]: event.target.value,
                    }))
                  }
                  placeholder={param.required ? "Required" : "Optional"}
                  type="text"
                  value={queryValues[param.name ?? ""] ?? ""}
                />
              </label>
            ))}
          </div>
        ) : null}

        <label className="api-playground__field">
          <span>Auth token</span>
          <input
            onChange={(event) => setAuthToken(event.target.value)}
            placeholder="Bearer token"
            type="password"
            value={authToken}
          />
        </label>

        {entry.operation.method !== "GET" ? (
          <label className="api-playground__field">
            <span>Request body</span>
            <textarea
              onChange={(event) => setBody(event.target.value)}
              rows={6}
              value={body}
            />
          </label>
        ) : null}

        <button
          className="api-playground__send"
          disabled={isLoading || !canSend}
          onClick={handleSend}
          type="button"
        >
          {isLoading ? "Sending..." : "Send request"}
        </button>
        {canSend ? null : (
          <p className="api-playground__hint">
            Add a server URL in your OpenAPI spec to enable requests.
          </p>
        )}

        {response !== null ? (
          <div className="api-playground__response">
            <div className="api-playground__status">Status: {status}</div>
            <pre>{response}</pre>
          </div>
        ) : null}
      </div>
    </section>
  );
};
