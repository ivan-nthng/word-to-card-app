'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/app/ui/Button'
import {
    getLearningLanguageClient,
    setLearningLanguageClient,
    type LearningLanguage,
} from '@/lib/learning-language'
import { detectLocale, t } from '@/lib/i18n-landing'

interface LanguageOption {
    value: LearningLanguage
    label: string
    flag: string
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
    { value: 'pt-BR', label: 'Brazilian Portuguese', flag: '🇧🇷' },
    { value: 'en', label: 'English', flag: '🇺🇸' },
]

export function LandingActions() {
    const [currentLanguage, setCurrentLanguage] = useState<LearningLanguage>(
        () => getLearningLanguageClient(),
    )
    const [locale, setLocale] = useState<'en' | 'ru'>(() => detectLocale())

    // Sync with localStorage on mount and changes
    useEffect(() => {
        const stored = getLearningLanguageClient()
        setCurrentLanguage(stored)

        // Detect locale on mount
        setLocale(detectLocale())

        // Listen for storage events (from other tabs/windows)
        const handleStorageChange = () => {
            const updated = getLearningLanguageClient()
            setCurrentLanguage(updated)
        }
        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [])

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLanguage = e.target.value as LearningLanguage
        setCurrentLanguage(newLanguage)
        setLearningLanguageClient(newLanguage)
    }

    const currentOption =
        LANGUAGE_OPTIONS.find((opt) => opt.value === currentLanguage) ||
        LANGUAGE_OPTIONS[0]

    return (
        <div className="flex flex-col space-y-6">
            {/* Primary Actions */}
            <div className="space-y-3">
                {/* Start Training Button (Primary) */}
                <Link href="/app/words" className="block">
                    <Button variant="primary" className="w-full flex items-center justify-center gap-2">
                        <span className="text-lg">▶</span>
                        <span>{t('startTraining', locale)}</span>
                    </Button>
                </Link>
                {/* Add Word Button (Outlined/Secondary) */}
                <Link href="/app/add" className="block">
                    <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                        <span className="text-xl">+</span>
                        <span>{t('addWord', locale)}</span>
                    </Button>
                </Link>
            </div>

            {/* Language Selector Pill at Bottom (Centered) */}
            <div className="pt-4 border-t border-border flex items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">
                    {t('language', locale)}
                </span>
                <div className="relative">
                    <select
                        value={currentLanguage}
                        onChange={handleLanguageChange}
                        className="px-4 py-2 pr-8 pl-8 border border-border rounded-full bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer shadow-sm min-w-[180px]"
                        aria-label="Select learning language"
                        style={{ color: 'transparent' }}
                    >
                        {LANGUAGE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label} ({option.value})
                            </option>
                        ))}
                    </select>
                    {/* Flag + Language name (overlay) */}
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                        <span className="text-base">{currentOption.flag}</span>
                        <span className="text-sm text-foreground">
                            {currentOption.label}
                        </span>
                    </div>
                    {/* Dropdown chevron */}
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-xs">
                        ▼
                    </span>
                </div>
            </div>
        </div>
    )
}
