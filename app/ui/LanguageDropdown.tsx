'use client'

import { useState, useEffect } from 'react'
import {
    getLearningLanguageClient,
    setLearningLanguageClient,
    getLearningLanguageLabel,
    type LearningLanguage,
} from '@/lib/learning-language'
import { useRouter } from 'next/navigation'

interface LanguageOption {
    value: LearningLanguage
    label: string
    flag: string
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
    { value: 'pt-BR', label: 'Portuguese', flag: '🇧🇷' },
    { value: 'en', label: 'English', flag: '🇧🇷' }, // Always use 🇧🇷 flag
]

interface LanguageDropdownProps {
    onLanguageChange?: (language: LearningLanguage) => void
    className?: string
}

export function LanguageDropdown({
    onLanguageChange,
    className = '',
}: LanguageDropdownProps) {
    const router = useRouter()
    const [currentLanguage, setCurrentLanguage] = useState<LearningLanguage>(
        getLearningLanguageClient(),
    )

    // Sync with localStorage changes
    useEffect(() => {
        const handleStorageChange = () => {
            const stored = getLearningLanguageClient()
            if (stored !== currentLanguage) {
                setCurrentLanguage(stored)
            }
        }

        // Check on mount
        handleStorageChange()

        // Listen for storage events (from other tabs/windows)
        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [currentLanguage])

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLanguage = e.target.value as LearningLanguage
        setCurrentLanguage(newLanguage)
        setLearningLanguageClient(newLanguage)

        // Notify parent component
        if (onLanguageChange) {
            onLanguageChange(newLanguage)
        }

        // Reload current page to apply language filter changes
        router.refresh()
    }

    const currentOption = LANGUAGE_OPTIONS.find(
        (opt) => opt.value === currentLanguage,
    ) || LANGUAGE_OPTIONS[0] // Default to pt-BR

    return (
        <div className={`relative ${className}`}>
            <select
                value={currentLanguage}
                onChange={handleChange}
                className="pl-8 pr-10 py-2 border border-border rounded-lg bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer min-w-[180px]"
                aria-label="Select learning language"
            >
                {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {/* Flag icon (always 🇧🇷) */}
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base pointer-events-none">
                🇧🇷
            </span>
            {/* Dropdown chevron */}
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-xs">
                ▼
            </span>
        </div>
    )
}
