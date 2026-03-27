export const Installer = ({
  path,
  command,
}: {
  path: string;
  command?: string;
}) => {
  const resolvedCommand =
    command ?? `npx @vercel/platform-elements@latest ${path}`;
  return (
    <div className="my-4 grid gap-2.5 rounded-xl border border-border bg-background/70 p-3.5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        Install
      </div>
      <pre className="m-0 overflow-x-auto rounded-lg bg-code p-3 font-mono text-sm text-code-foreground">
        <code>{resolvedCommand}</code>
      </pre>
    </div>
  );
};
