import { ApiPlayground } from "@/components/api/api-playground";
import type { OpenApiEntry } from "@/lib/openapi";

export const ApiReference = ({
  entry,
  proxyEnabled,
  tenantSlug,
}: {
  entry: OpenApiEntry;
  proxyEnabled: boolean;
  tenantSlug: string;
}) => {
  const { operation } = entry;
  const parameters = operation.parameters ?? [];
  const requestBody = operation.requestBody as
    | { content?: Record<string, { schema?: unknown }> }
    | undefined;
  const responses = operation.responses ?? {};

  return (
    <div className="api-page">
      <header className="api-page__header">
        <div
          className={`api-method api-method--${operation.method.toLowerCase()}`}
        >
          {operation.method}
        </div>
        <div className="api-page__path">{operation.path}</div>
      </header>
      {operation.summary ? (
        <p className="api-page__summary">{operation.summary}</p>
      ) : null}
      {operation.description ? (
        <p className="api-page__description">{operation.description}</p>
      ) : null}

      {parameters.length ? (
        <section className="api-section">
          <h2>Parameters</h2>
          <div className="api-table">
            <div className="api-table__row api-table__head">
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
                <div className="api-table__row" key={name}>
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
        <section className="api-section">
          <h2>Request Body</h2>
          <pre className="api-code">
            {JSON.stringify(requestBody.content, null, 2)}
          </pre>
        </section>
      ) : null}

      {Object.keys(responses).length ? (
        <section className="api-section">
          <h2>Responses</h2>
          <div className="api-responses">
            {Object.entries(responses).map(([status, response]) => {
              const description =
                (response as { description?: string }).description ?? "";
              return (
                <div className="api-response" key={status}>
                  <span className="api-response__status">{status}</span>
                  <span className="api-response__desc">{description}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <ApiPlayground
        entry={entry}
        proxyEnabled={proxyEnabled}
        tenantSlug={tenantSlug}
      />
    </div>
  );
};
