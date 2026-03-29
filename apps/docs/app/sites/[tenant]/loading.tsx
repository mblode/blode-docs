const Loading = () => (
  <div className="min-h-screen bg-background">
    <div className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="container-wrapper px-6">
        <div className="flex h-(--header-height) items-center gap-4">
          <div className="h-8 w-8 rounded-md bg-muted/70" />
          <div className="h-5 w-28 rounded-md bg-muted/70" />
          <div className="ml-auto hidden h-8 w-56 rounded-lg bg-muted/70 md:block" />
        </div>
      </div>
    </div>

    <div className="container-wrapper flex flex-1 flex-col px-6">
      <div className="grid min-h-[calc(100svh-10rem)] gap-8 px-4 py-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="hidden flex-col gap-3 lg:flex">
          <div className="h-4 w-24 rounded bg-muted/70" />
          <div className="space-y-2">
            <div className="h-8 w-full rounded-lg bg-muted/70" />
            <div className="h-8 w-11/12 rounded-lg bg-muted/70" />
            <div className="h-8 w-10/12 rounded-lg bg-muted/70" />
            <div className="h-8 w-9/12 rounded-lg bg-muted/70" />
            <div className="h-8 w-11/12 rounded-lg bg-muted/70" />
          </div>
        </aside>

        <main className="mx-auto flex w-full max-w-[40rem] flex-col gap-6">
          <div className="space-y-3">
            <div className="h-3 w-36 rounded bg-muted/70" />
            <div className="h-10 w-3/5 rounded bg-muted/70" />
            <div className="h-4 w-4/5 rounded bg-muted/70" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-muted/70" />
            <div className="h-4 w-11/12 rounded bg-muted/70" />
            <div className="h-4 w-10/12 rounded bg-muted/70" />
            <div className="h-40 w-full rounded-xl bg-muted/70" />
            <div className="h-4 w-9/12 rounded bg-muted/70" />
            <div className="h-4 w-8/12 rounded bg-muted/70" />
          </div>
        </main>
      </div>
    </div>
  </div>
);

export default Loading;
