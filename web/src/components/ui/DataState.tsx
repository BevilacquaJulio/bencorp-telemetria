import {
  ArrowClockwiseIcon,
  ClipboardTextIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { Button } from './Button'

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-list" aria-label="Carregando dados" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-row" key={index}>
          <span className="skeleton-line skeleton-line--wide" />
          <span className="skeleton-line" />
          <span className="skeleton-line skeleton-line--short" />
        </div>
      ))}
    </div>
  )
}

type EmptyStateProps = {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="data-state">
      <span className="data-state__icon" aria-hidden="true">
        <ClipboardTextIcon size={26} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

type ErrorStateProps = {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="data-state data-state--error" role="alert">
      <span className="data-state__icon" aria-hidden="true">
        <WarningCircleIcon size={26} />
      </span>
      <h2>Não foi possível carregar</h2>
      <p>{message}</p>
      {onRetry ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<ArrowClockwiseIcon size={17} />}
          onClick={onRetry}
        >
          Tentar novamente
        </Button>
      ) : null}
    </div>
  )
}
