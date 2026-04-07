/**
 * EmptyState Component
 *
 * Reusable empty state display for when no records are found.
 * Supports two scenarios:
 *   - No records exist at all
 *   - No records match current filters
 *
 * Requirements: 1.6
 */

interface EmptyStateProps {
  /** Icon or emoji to display at the top */
  icon?: string;
  /** Primary heading */
  title: string;
  /** Supporting description text */
  description: string;
  /** Optional extra className for the outer wrapper */
  className?: string;
}

export function EmptyState({ icon, title, description, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
      <div className="text-center space-y-4 max-w-md p-6">
        {icon && <div className="text-6xl mb-4">{icon}</div>}
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
