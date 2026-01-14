import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './theme/globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
    title: 'WordTo - Vocabulary Manager',
    description: 'Private vocabulary web service',
}

export const dynamic = 'force-dynamic'

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.variable}>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
