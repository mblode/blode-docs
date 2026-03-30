import Link from "next/link";

const NotFound = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
    <h1 className="text-4xl font-bold tracking-tight">Page not found</h1>
    <p className="max-w-md text-muted-foreground">
      The page you are looking for does not exist or has been moved.
    </p>
    <Link
      className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      href="/"
    >
      Go home
    </Link>
  </div>
);

export default NotFound;
