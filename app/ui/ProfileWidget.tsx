'use client'

import { signOut, useSession } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'

export function ProfileWidget() {
    const { data: session } = useSession()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    if (!session?.user) {
        return null
    }

    const userImage = session.user.image || '/default-avatar.png'
    const userName = session.user.name || session.user.email || 'User'

    return (
        <div className="fixed bottom-4 right-4 z-50" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-12 h-12 rounded-full border-2 border-border hover:border-primary transition-colors overflow-hidden bg-card shadow-lg"
                aria-label="User menu"
            >
                <img
                    src={userImage}
                    alt={userName}
                    className="w-full h-full object-cover"
                />
            </button>

            {isOpen && (
                <div className="absolute bottom-16 right-0 bg-card border border-border rounded-lg shadow-lg min-w-[200px] overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-semibold text-foreground truncate">
                            {userName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {session.user.email}
                        </p>
                    </div>
                    <div className="py-1">
                        <button
                            onClick={() => {
                                // Settings disabled for now
                                setIsOpen(false)
                            }}
                            disabled
                            className="w-full px-4 py-2 text-left text-sm text-muted-foreground hover:bg-muted disabled:cursor-not-allowed transition-colors"
                        >
                            Settings (coming soon)
                        </button>
                        <button
                            onClick={() => {
                                setIsOpen(false)
                                signOut({ callbackUrl: '/' })
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
