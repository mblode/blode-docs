"use client";

import { useCallback, useMemo, useReducer } from "react";
import type { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { OpenApiEntry } from "@/lib/openapi";
import { TENANT_HEADERS } from "@/lib/tenant-headers";

interface OperationParameter {
  description?: string;
  name?: string;
  required?: boolean;
}

const extractParams = (entry: OpenApiEntry, location: "path" | "query") =>
  (entry.operation.parameters ?? []).filter(
    (param) => (param as { in?: string }).in === location
  ) as OperationParameter[];

interface PlaygroundState {
  authToken: string;
  body: string;
  isLoading: boolean;
  pathValues: Record<string, string>;
  queryValues: Record<string, string>;
  response: string | null;
  serverIndex: number;
  status: number | null;
  useProxyPreference: boolean;
}

type PlaygroundAction =
  | { type: "requestError"; response: string }
  | { type: "requestStart" }
  | { type: "requestSuccess"; response: string; status: number }
  | { type: "setAuthToken"; value: string }
  | { type: "setBody"; value: string }
  | { type: "setPathValue"; name: string; value: string }
  | { type: "setQueryValue"; name: string; value: string }
  | { type: "setServerIndex"; value: number }
  | { type: "setUseProxyPreference"; value: boolean };

const initialPlaygroundState: PlaygroundState = {
  authToken: "",
  body: "{}",
  isLoading: false,
  pathValues: {},
  queryValues: {},
  response: null,
  serverIndex: 0,
  status: null,
  useProxyPreference: true,
};

const playgroundReducer = (
  state: PlaygroundState,
  action: PlaygroundAction
) => {
  switch (action.type) {
    case "requestError": {
      return {
        ...state,
        isLoading: false,
        response: action.response,
        status: 0,
      };
    }
    case "requestStart": {
      return {
        ...state,
        isLoading: true,
        response: null,
        status: null,
      };
    }
    case "requestSuccess": {
      return {
        ...state,
        isLoading: false,
        response: action.response,
        status: action.status,
      };
    }
    case "setAuthToken": {
      return {
        ...state,
        authToken: action.value,
      };
    }
    case "setBody": {
      return {
        ...state,
        body: action.value,
      };
    }
    case "setPathValue": {
      return {
        ...state,
        pathValues: {
          ...state.pathValues,
          [action.name]: action.value,
        },
      };
    }
    case "setQueryValue": {
      return {
        ...state,
        queryValues: {
          ...state.queryValues,
          [action.name]: action.value,
        },
      };
    }
    case "setServerIndex": {
      return {
        ...state,
        serverIndex: action.value,
      };
    }
    case "setUseProxyPreference": {
      return {
        ...state,
        useProxyPreference: action.value,
      };
    }
    default: {
      return state;
    }
  }
};

const ParameterFieldGrid = ({
  idPrefix,
  onChange,
  parameters,
  values,
}: {
  idPrefix: "path" | "query";
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  parameters: OperationParameter[];
  values: Record<string, string>;
}) => {
  if (!parameters.length) {
    return null;
  }

  return (
    <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
      {parameters.map((param) => (
        <Field key={param.name}>
          <FieldLabel htmlFor={`${idPrefix}-${param.name}`}>
            {param.name}
          </FieldLabel>
          <Input
            id={`${idPrefix}-${param.name}`}
            name={param.name ?? ""}
            onChange={onChange}
            placeholder={param.required ? "Required" : "Optional"}
            type="text"
            value={values[param.name ?? ""] ?? ""}
          />
        </Field>
      ))}
    </div>
  );
};

const ResponsePanel = ({
  response,
  status,
}: {
  response: string | null;
  status: number | null;
}) => {
  if (response === null) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-primary/[0.08] p-3">
      <div className="font-semibold">Status: {status}</div>
      <pre className="mt-2 overflow-x-auto">{response}</pre>
    </div>
  );
};

export const ApiPlayground = ({
  entry,
  proxyEnabled,
  proxyPath = "/_internal/proxy",
  tenantSlug,
}: {
  entry: OpenApiEntry;
  proxyEnabled: boolean;
  proxyPath?: string;
  tenantSlug?: string;
}) => {
  const servers = entry.spec.servers ?? [];
  const [state, dispatch] = useReducer(
    playgroundReducer,
    initialPlaygroundState
  );
  const {
    authToken,
    body,
    isLoading,
    pathValues,
    queryValues,
    response,
    serverIndex,
    status,
  } = state;
  const useProxy = proxyEnabled && state.useProxyPreference;

  const pathParams = useMemo(() => extractParams(entry, "path"), [entry]);
  const queryParams = useMemo(() => extractParams(entry, "query"), [entry]);

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
      dispatch({
        type: "setUseProxyPreference",
        value: event.target.checked,
      });
    },
    []
  );
  const handleServerChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      dispatch({
        type: "setServerIndex",
        value: Number(event.target.value),
      });
    },
    []
  );
  const handlePathValueChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      dispatch({
        name: event.target.name,
        type: "setPathValue",
        value: event.target.value,
      });
    },
    []
  );
  const handleQueryValueChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      dispatch({
        name: event.target.name,
        type: "setQueryValue",
        value: event.target.value,
      });
    },
    []
  );
  const handleAuthTokenChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      dispatch({
        type: "setAuthToken",
        value: event.target.value,
      });
    },
    []
  );
  const handleBodyChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      dispatch({
        type: "setBody",
        value: event.target.value,
      });
    },
    []
  );

  const handleSend = useCallback(async () => {
    const url = buildUrl();
    dispatch({ type: "requestStart" });

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

      const requestUrl = useProxy ? proxyPath : url;
      const requestMethod = useProxy ? "POST" : method;
      const requestHeadersToSend = useProxy
        ? {
            "Content-Type": "application/json",
            ...(tenantSlug ? { [TENANT_HEADERS.SLUG]: tenantSlug } : {}),
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
      let formatted = text;
      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        formatted = text;
      }
      dispatch({
        response: formatted || "(empty response)",
        status: res.status,
        type: "requestSuccess",
      });
    } catch (error) {
      dispatch({
        response: error instanceof Error ? error.message : "Request failed.",
        type: "requestError",
      });
    }
  }, [
    authToken,
    body,
    buildUrl,
    entry.operation,
    proxyPath,
    tenantSlug,
    useProxy,
  ]);

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

        <ParameterFieldGrid
          idPrefix="path"
          onChange={handlePathValueChange}
          parameters={pathParams}
          values={pathValues}
        />

        <ParameterFieldGrid
          idPrefix="query"
          onChange={handleQueryValueChange}
          parameters={queryParams}
          values={queryValues}
        />

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

        <ResponsePanel response={response} status={status} />
      </div>
    </section>
  );
};
