'use client';

type RouteIslandSkeletonProps = {
  stats?: number;
  panels?: number;
};

export default function RouteIslandSkeleton({ stats = 4, panels = 1 }: RouteIslandSkeletonProps) {
  return (
    <div className="space-y-5 animate-pulse">
      <div>
        <div className="h-8 bg-background-tertiary rounded w-48 mb-2" />
        <div className="h-4 bg-background-tertiary rounded w-80 max-w-full" />
      </div>
      {stats > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: stats }).map((_, index) => (
            <div key={index} className="card h-24 bg-background-secondary" />
          ))}
        </div>
      )}
      {Array.from({ length: panels }).map((_, index) => (
        <div key={index} className="card h-80 bg-background-secondary" />
      ))}
    </div>
  );
}
