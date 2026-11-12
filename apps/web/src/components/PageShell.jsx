import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, SkeletonCard } from '../design-system';

export function PageShell({ title, badge, loading, error, children }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text">{title}</h1>
        {badge && <Badge tone="demo">{badge}</Badge>}
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && error && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Failed to load {title}</CardTitle>
              <CardDescription>Check that the API is running, then refresh.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-danger">{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && children}
    </div>
  );
}
