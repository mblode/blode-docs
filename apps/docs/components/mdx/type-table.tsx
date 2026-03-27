interface TypeField {
  description?: string;
  type?: string;
  optional?: boolean;
  required?: boolean;
  default?: string;
}

export const TypeTable = ({ type }: { type: Record<string, TypeField> }) => {
  const entries = Object.entries(type ?? {}).map(([name, field]) => ({
    name,
    ...field,
  }));
  const hasDefault = entries.some((entry) => entry.default);

  return (
    <div className="no-scrollbar my-4 w-full overflow-y-auto rounded-xl border border-border">
      <table className="relative w-full overflow-hidden border-none text-sm">
        <thead>
          <tr>
            <th className="border-b border-border bg-background/70 px-3 py-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground">
              Field
            </th>
            <th className="border-b border-border bg-background/70 px-3 py-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground">
              Type
            </th>
            <th className="border-b border-border bg-background/70 px-3 py-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground">
              Description
            </th>
            <th className="border-b border-border bg-background/70 px-3 py-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground">
              Required
            </th>
            {hasDefault ? (
              <th className="border-b border-border bg-background/70 px-3 py-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground">
                Default
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const required = entry.required ?? !entry.optional;
            return (
              <tr key={entry.name}>
                <td className="border-b border-border px-3 py-2.5 text-left align-top">
                  <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {entry.name}
                  </code>
                </td>
                <td className="border-b border-border px-3 py-2.5 text-left align-top">
                  {entry.type ?? "\u2014"}
                </td>
                <td className="border-b border-border px-3 py-2.5 text-left align-top">
                  {entry.description ?? ""}
                </td>
                <td className="border-b border-border px-3 py-2.5 text-left align-top">
                  {required ? "Yes" : "Optional"}
                </td>
                {hasDefault ? (
                  <td className="border-b border-border px-3 py-2.5 text-left align-top">
                    {entry.default ?? "\u2014"}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
