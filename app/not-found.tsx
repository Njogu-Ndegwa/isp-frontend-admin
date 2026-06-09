import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold text-foreground">Page not found</h2>
      <p className="text-sm text-foreground-muted">
        The page you are looking for does not exist.
      </p>
      <Link href="/dashboard" className="btn-primary">
        Go to dashboard
      </Link>
    </div>
  );
}
