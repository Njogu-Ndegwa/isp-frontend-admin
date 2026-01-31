export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`${sizes[size]} rounded-full border-amber-500/30 border-t-amber-500 animate-spin`}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-foreground-muted animate-pulse-soft text-sm">Loading...</p>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-background-secondary p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl skeleton" />
        <div className="w-14 h-5 rounded-md skeleton" />
      </div>
      <div className="space-y-2">
        <div className="w-20 h-3 rounded skeleton" />
        <div className="w-28 h-7 rounded skeleton" />
        <div className="w-24 h-3 rounded skeleton" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="table-container bg-background-secondary">
      <table>
        <thead>
          <tr>
            {[1, 2, 3, 4, 5].map((i) => (
              <th key={i}>
                <div className="w-20 h-4 rounded skeleton" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {[1, 2, 3, 4, 5].map((j) => (
                <td key={j}>
                  <div className="w-full h-4 rounded skeleton" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonLine({ width = 'full' }: { width?: 'full' | 'sm' | 'md' | 'lg' }) {
  const widthClass = {
    full: 'w-full',
    sm: 'w-16',
    md: 'w-24',
    lg: 'w-32',
  };

  return <div className={`${widthClass[width]} h-4 rounded skeleton`} />;
}
