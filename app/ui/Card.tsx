import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  const baseClasses = 'bg-card text-card-foreground border border-border rounded-lg p-4'
  const interactiveClasses = onClick ? 'cursor-pointer hover:border-primary transition-colors' : ''

  return (
    <div
      className={`${baseClasses} ${interactiveClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
