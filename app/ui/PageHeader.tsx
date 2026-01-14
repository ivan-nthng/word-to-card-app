import { ReactNode } from 'react'
import Link from 'next/link'
import { Button } from './Button'

interface PageHeaderProps {
  title: string
  backHref?: string
  actions?: ReactNode
}

export function PageHeader({ title, backHref, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        {backHref && (
          <Link href={backHref}>
            <Button variant="outline">← Back</Button>
          </Link>
        )}
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      </div>
      {actions && <div>{actions}</div>}
    </div>
  )
}
