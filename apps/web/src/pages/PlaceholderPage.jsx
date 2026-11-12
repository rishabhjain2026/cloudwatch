import { Construction } from 'lucide-react';
import { Badge, EmptyState } from '../design-system';

export function PlaceholderPage({ title, description }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        <Badge tone="demo">DEMO shell</Badge>
      </div>
      <EmptyState
        icon={Construction}
        title={`${title} arrives in a later phase`}
        description={
          description ??
          'Navigation and layout are ready. This module will connect to public read-only APIs once the backend lands.'
        }
      />
    </div>
  );
}
