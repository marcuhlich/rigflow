import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Fact {
  key: string;
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
  tone?: 'default' | 'warning';
}

/**
 * Dense label/value grid with hairline cell borders.
 * Cells are separated by the container background showing through a 1px gap.
 */
export function FactGrid({ facts, columns = 3, className }: { facts: Fact[]; columns?: 2 | 3 | 4; className?: string }) {
  if (facts.length === 0) return null;
  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border',
        columns === 3 && 'md:grid-cols-3',
        columns === 4 && 'md:grid-cols-4',
        className,
      )}
    >
      {facts.map(f => (
        <div key={f.key} className={cn('min-w-0 bg-card px-3 py-2.5', f.tone === 'warning' && 'bg-warning/5')}>
          <dt className="truncate text-xs text-muted-foreground">{f.label}</dt>
          <dd
            className={cn(
              'mt-0.5 truncate text-sm font-medium',
              f.mono && 'font-mono tabular-nums',
              f.tone === 'warning' && 'text-warning',
            )}
            title={typeof f.value === 'string' ? f.value : undefined}
          >
            {f.value}
          </dd>
        </div>
      ))}
      {/* Fill the last row so the grid has no ragged hole */}
      {Array.from({ length: (columns - (facts.length % columns)) % columns }).map((_, i) => (
        <div key={`pad-${i}`} aria-hidden className="hidden bg-card md:block" />
      ))}
      {facts.length % 2 === 1 && <div aria-hidden className="bg-card md:hidden" />}
    </dl>
  );
}
