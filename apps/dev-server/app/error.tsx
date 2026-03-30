"use client";

const Error = ({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
    <h1 className="text-4xl font-bold tracking-tight">Something went wrong</h1>
    <p className="max-w-md text-muted-foreground">
      An error occurred while loading this page.
    </p>
    <button
      className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      onClick={reset}
      type="button"
    >
      Try again
    </button>
  </div>
);

export default Error;
