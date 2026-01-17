import { ReactNode } from 'react'

interface TagProps {
  children: ReactNode
  variant?: 'default' | 'primary' | 'secondary' | 'verb' | 'noun' | 'adjective'
  className?: string
}

// Helper to map word type to tag variant
export function getTypeVariant(type: string): 'verb' | 'noun' | 'adjective' | 'default' {
  const normalizedType = type.toLowerCase()
  if (normalizedType === 'verbo' || normalizedType === 'verb') {
    return 'verb'
  }
  if (normalizedType === 'substantivo' || normalizedType === 'noun' || normalizedType === 'substantive') {
    return 'noun'
  }
  if (normalizedType === 'adjetivo' || normalizedType === 'adjective' || normalizedType === 'adj') {
    return 'adjective'
  }
  return 'default'
}

export function Tag({ children, variant = 'default', className = '' }: TagProps) {
  const baseClasses = 'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium'
  
  const variantClasses = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary text-secondary-foreground',
    verb: 'bg-blue-50 text-blue-700 border border-blue-200',
    noun: 'bg-green-50 text-green-700 border border-green-200',
    adjective: 'bg-purple-50 text-purple-700 border border-purple-200',
  }

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
