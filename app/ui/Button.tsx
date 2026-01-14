import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline'
    children: ReactNode
}

export function Button({
    variant = 'primary',
    className = '',
    children,
    ...props
}: ButtonProps) {
    const baseClasses =
        'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variantClasses = {
        primary:
            'bg-primary text-primary-foreground hover:opacity-90 focus:ring-primary',
        secondary:
            'bg-secondary text-secondary-foreground hover:opacity-90 focus:ring-secondary',
        outline:
            'border border-border bg-transparent hover:bg-muted focus:ring-border',
    }

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}
