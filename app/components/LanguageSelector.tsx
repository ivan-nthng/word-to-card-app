'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/ui/Button'
import { Card } from '@/app/ui/Card'
import {
    getLearningLanguageClient,
    setLearningLanguageClient,
    type LearningLanguage,
    getLearningLanguageLabel,
} from '@/lib/learning-language'

export function LanguageSelector() {
    const router = useRouter()
    const [selectedLanguage, setSelectedLanguage] = useState<LearningLanguage>(
        getLearningLanguageClient(),
    )
    const [hasSelected, setHasSelected] = useState(false)

    // Check if language was already selected (cookie exists)
    useEffect(() => {
        const currentLang = getLearningLanguageClient()
        if (currentLang) {
            setHasSelected(true)
        }
    }, [])

    const handleContinue = () => {
        setLearningLanguageClient(selectedLanguage)
        setHasSelected(true)
        // Navigate to add word page
        router.push('/app/add')
    }

    if (hasSelected) {
        // If already selected, show continue button
        return (
            <div className="space-y-3">
                <div className="text-sm text-muted-foreground text-center">
                    Learning:{' '}
                    <strong>
                        {getLearningLanguageLabel(selectedLanguage)}
                    </strong>
                </div>
                <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleContinue}
                >
                    Continue
                </Button>
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setHasSelected(false)}
                >
                    Change Language
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                    Which language are you learning?
                </label>
                <div className="space-y-2">
                    <button
                        type="button"
                        onClick={() => setSelectedLanguage('pt-BR')}
                        className={`w-full px-4 py-3 text-left border rounded-md transition-colors ${
                            selectedLanguage === 'pt-BR'
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border bg-card hover:bg-muted'
                        }`}
                    >
                        Brazilian Portuguese (pt-BR)
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedLanguage('en')}
                        className={`w-full px-4 py-3 text-left border rounded-md transition-colors ${
                            selectedLanguage === 'en'
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border bg-card hover:bg-muted'
                        }`}
                    >
                        English (en)
                    </button>
                </div>
            </div>
            <Button
                variant="primary"
                className="w-full"
                onClick={handleContinue}
            >
                Continue
            </Button>
        </div>
    )
}
