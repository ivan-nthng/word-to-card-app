import { ReactNode } from 'react'

interface TagProps {
  children: ReactNode
  variant?: 'default' | 'primary' | 'secondary'
  className?: string
}

export function Tag({ children, variant = 'default', className = '' }: TagProps) {
  const baseClasses = 'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium'
  
  const variantClasses = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary text-secondary-foreground',
  }

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
