export default function RuntimeHome() {
  return (
    <div className="grid min-h-screen place-items-center p-10">
      <div className="grid max-w-lg gap-4 rounded-2xl bg-surface p-8 shadow-md">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-xs uppercase tracking-widest">
          Docs Runtime
        </span>
        <h1 className="text-2xl font-bold">
          Tenant docs are served by hostname.
        </h1>
        <p className="text-muted-foreground">
          This app powers customer documentation sites. Visit a tenant domain or
          open a local preview at{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm">
            /sites/atlas
          </code>
          .
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            className="rounded-full border border-border px-3.5 py-2 transition-colors hover:bg-accent"
            href="https://atlas.blode.md"
          >
            Open Atlas docs
          </a>
          <a
            className="rounded-full border border-border px-3.5 py-2 transition-colors hover:bg-accent"
            href="https://orbit.blode.md"
          >
            Open Orbit docs
          </a>
        </div>
      </div>
    </div>
  );
}
