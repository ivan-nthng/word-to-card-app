'use client'

import { useEffect, useState, Suspense, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/app/ui/PageHeader'
import { Card } from '@/app/ui/Card'
import { Button } from '@/app/ui/Button'
import { LanguageDropdown } from '@/app/ui/LanguageDropdown'
import { NotionWord } from '@/lib/types'
import { logger } from '@/lib/logger'
import { apiFetch } from '@/lib/client'
import {
    getLearningLanguageClient,
    setLearningLanguageClient,
    mapLearningLanguageToNotion,
    type LearningLanguage,
} from '@/lib/learning-language'

interface TrainerSettings {
    frontMode:
        | 'word'
        | 'translation_ru'
        | 'verb_presente'
        | 'verb_perfeito'
        | 'verb_imperfeito'
        | 'verb_presente_plus_translation'
        | 'verb_perfeito_plus_translation'
        | 'verb_imperfeito_plus_translation'
    backMode:
        | 'translation_ru'
        | 'word'
        | 'verb_presente'
        | 'verb_perfeito'
        | 'verb_imperfeito'
        | 'verb_presente_plus_translation'
        | 'verb_perfeito_plus_translation'
        | 'verb_imperfeito_plus_translation'
}

const TRAINER_SETTINGS_PREFIX = 'trainerSettings:'

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

function getTrainerSettings(presetId: string): TrainerSettings {
    // Always default frontMode to 'word' (Portuguese word) - do not remember previous selection
    // 'word' shows the Portuguese/English word, 'translation_ru' shows Original (Russian)
    const defaultSettings = { frontMode: 'word' as const, backMode: 'translation_ru' as const }
    
    if (typeof window === 'undefined') {
        return defaultSettings
    }

    // For now, always return default (don't load from localStorage for frontMode)
    // This ensures Portuguese is always preselected
    return defaultSettings
}

function saveTrainerSettings(presetId: string, settings: TrainerSettings) {
    if (typeof window === 'undefined') return
    localStorage.setItem(
        `${TRAINER_SETTINGS_PREFIX}${presetId}`,
        JSON.stringify(settings),
    )
}

function TrainerContent() {
    const params = useParams()
    const searchParams = useSearchParams()
    const presetId = params.presetId as
        | 'active'
        | 'learned'
        | 'verbs'
        | 'nouns'
        | 'adjectives'
    const language = (searchParams.get('language') || 'Portuguese') as
        | 'Portuguese'
        | 'English'

    const [words, setWords] = useState<NotionWord[]>([])
    const [shuffledWords, setShuffledWords] = useState<NotionWord[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showSettings, setShowSettings] = useState(false)
    const [settings, setSettings] = useState<TrainerSettings>(() => {
        const defaultSettings = { frontMode: 'word' as const, backMode: 'translation_ru' as const }
        // Always default to Portuguese (frontMode: 'word') - don't load from localStorage
        return defaultSettings
    })
    const shuffledRef = useRef(false)


    useEffect(() => {
        if (words.length > 0 && !shuffledRef.current) {
            const shuffled = shuffleArray(words)
            setShuffledWords(shuffled)
            shuffledRef.current = true
        } else if (words.length === 0) {
            setShuffledWords([])
            shuffledRef.current = false
        }

        setCurrentIndex(0)
        setFlipped(false)
    }, [words])

    useEffect(() => {
        saveTrainerSettings(presetId, settings)
    }, [presetId, settings])

    const fetchWords = useCallback(async () => {
        try {
            setLoading(true)
            setError('')
            shuffledRef.current = false
            logger.info('TRAINER', `Fetching words - presetId: ${presetId}, language: ${language}`)

            const data = await apiFetch<NotionWord[]>(
                `/api/trainer/${presetId}/words?language=${encodeURIComponent(
                    language,
                )}`,
            )
            logger.info('TRAINER', `Loaded ${data.length} words for preset: ${presetId}`)
            setWords(data)
        } catch (err: any) {
            logger.error('TRAINER', 'Error fetching words', { error: err.message })
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }, [presetId, language])

    useEffect(() => {
        fetchWords()
    }, [fetchWords])

    const isPortugueseVerb = (word: NotionWord) => {
        return word.language === 'Portuguese' && word.typo === 'Verbo'
    }

    const renderVerbForms = (
        word: NotionWord,
        tense: 'presente' | 'perfeito' | 'imperfeito',
    ) => {
        const forms: Array<{ label: string; value: string }> = []

        if (tense === 'presente') {
            if (word.eu) forms.push({ label: 'eu', value: word.eu })
            if (word.voce) forms.push({ label: 'você', value: word.voce })
            if (word.eleEla)
                forms.push({ label: 'ele/ela', value: word.eleEla })
            if (word.elesElas)
                forms.push({ label: 'eles/elas', value: word.elesElas })
            if (word.nos) forms.push({ label: 'nós', value: word.nos })
        } else if (tense === 'perfeito') {
            if (word.Perfeito_eu)
                forms.push({ label: 'eu', value: word.Perfeito_eu })
            if (word.Perfeito_voce)
                forms.push({ label: 'você', value: word.Perfeito_voce })
            if (word.Perfeito_eleEla)
                forms.push({ label: 'ele/ela', value: word.Perfeito_eleEla })
            if (word.Perfeito_elesElas)
                forms.push({
                    label: 'eles/elas',
                    value: word.Perfeito_elesElas,
                })
            if (word.Perfeito_nos)
                forms.push({ label: 'nós', value: word.Perfeito_nos })
        } else if (tense === 'imperfeito') {
            if (word.Imperfeito_eu)
                forms.push({ label: 'eu', value: word.Imperfeito_eu })
            if (word.Imperfeito_voce)
                forms.push({ label: 'você', value: word.Imperfeito_voce })
            if (word.Imperfeito_eleEla)
                forms.push({ label: 'ele/ela', value: word.Imperfeito_eleEla })
            if (word.Imperfeito_elesElas)
                forms.push({
                    label: 'eles/elas',
                    value: word.Imperfeito_elesElas,
                })
            if (word.Imperfeito_nos)
                forms.push({ label: 'nós', value: word.Imperfeito_nos })
        }

        if (forms.length === 0) return null

        return (
            <div className="bg-muted rounded-md p-4 space-y-2 text-left max-w-md mx-auto">
                {forms.map((form) => (
                    <div key={form.label} className="flex gap-3">
                        <span className="font-medium text-muted-foreground min-w-[80px]">
                            {form.label}:
                        </span>
                        <span className="text-foreground">{form.value}</span>
                    </div>
                ))}
            </div>
        )
    }

    const renderContent = (
        word: NotionWord,
        mode: TrainerSettings['frontMode'] | TrainerSettings['backMode'],
    ) => {
        const isVerb = isPortugueseVerb(word)

        switch (mode) {
            case 'word':
                return (
                    <div className="text-center">
                        <h2 className="text-5xl font-bold">{word.word}</h2>
                    </div>
                )

            case 'translation_ru':
                return (
                    <div className="text-center">
                        <p className="text-3xl">
                            {word.translation || 'No translation'}
                        </p>
                    </div>
                )

            case 'verb_presente':
                if (!isVerb) {
                    return (
                        <div className="text-center">
                            <p className="text-3xl">
                                {word.translation || 'No translation'}
                            </p>
                        </div>
                    )
                }
                return (
                    renderVerbForms(word, 'presente') || (
                        <div className="text-center">
                            <p className="text-3xl">
                                {word.translation || 'No translation'}
                            </p>
                        </div>
                    )
                )

            case 'verb_perfeito':
                if (!isVerb) {
                    return (
                        <div className="text-center">
                            <p className="text-3xl">
                                {word.translation || 'No translation'}
                            </p>
                        </div>
                    )
                }
                return (
                    renderVerbForms(word, 'perfeito') || (
                        <div className="text-center">
                            <p className="text-3xl">
                                {word.translation || 'No translation'}
                            </p>
                        </div>
                    )
                )

            case 'verb_imperfeito':
                if (!isVerb) {
                    return (
                        <div className="text-center">
                            <p className="text-3xl">
                                {word.translation || 'No translation'}
                            </p>
                        </div>
                    )
                }
                return (
                    renderVerbForms(word, 'imperfeito') || (
                        <div className="text-center">
                            <p className="text-3xl">
                                {word.translation || 'No translation'}
                            </p>
                        </div>
                    )
                )

            case 'verb_presente_plus_translation':
                if (!isVerb) {
                    return (
                        <div className="text-center">
                            <p className="text-3xl">
                                {word.translation || 'No translation'}
                            </p>
                        </div>
                    )
                }
                const presenteForms = renderVerbForms(word, 'presente')
                return (
                    <div className="space-y-4">
                        {presenteForms}
                        {word.translation && (
                            <div className="text-center pt-2 border-t border-border">
                                <p className="text-xl">{word.translation}</p>
                            </div>
                        )}
                    </div>
                )

            case 'verb_perfeito_plus_translation':
                if (!isVerb) {
                    return (
                        <div className="text-center">
                            <p className="text-3xl">
                                {word.translation || 'No translation'}
                            </p>
                        </div>
                    )
                }
                const perfeitoForms = renderVerbForms(word, 'perfeito')
                return (
                    <div className="space-y-4">
                        {perfeitoForms}
                        {word.translation && (
                            <div className="text-center pt-2 border-t border-border">
                                <p className="text-xl">{word.translation}</p>
                            </div>
                        )}
                    </div>
                )

            case 'verb_imperfeito_plus_translation':
                if (!isVerb) {
                    return (
                        <div className="text-center">
                            <p className="text-3xl">
                                {word.translation || 'No translation'}
                            </p>
                        </div>
                    )
                }
                const imperfeitoForms = renderVerbForms(word, 'imperfeito')
                return (
                    <div className="space-y-4">
                        {imperfeitoForms}
                        {word.translation && (
                            <div className="text-center pt-2 border-t border-border">
                                <p className="text-xl">{word.translation}</p>
                            </div>
                        )}
                    </div>
                )

            default:
                return (
                    <div className="text-center">
                        <p className="text-3xl">
                            {word.translation || 'No translation'}
                        </p>
                    </div>
                )
        }
    }

    const handleMarkLearned = async () => {
        const currentWord = shuffledWords[currentIndex]
        if (!currentWord) return

        try {
            logger.info('TRAINER', 'review action', { pageId: currentWord.id, action: 'learned' })
            await apiFetch('/api/trainer/learned', {
                method: 'POST',
                body: JSON.stringify({
                    notionPageId: currentWord.id,
                    action: 'learned',
                }),
            })

            // Remove from queue if it no longer matches the filter
            const newShuffled = shuffledWords.filter(
                (_, idx) => idx !== currentIndex,
            )
            setShuffledWords(newShuffled)

            // Adjust index
            if (currentIndex >= newShuffled.length && newShuffled.length > 0) {
                setCurrentIndex(newShuffled.length - 1)
            } else if (newShuffled.length === 0) {
                setCurrentIndex(0)
            }

            setFlipped(false)
        } catch (err: any) {
            logger.error('TRAINER', 'Error marking word as learned', { error: err.message })
            setError(err.message || 'Failed to mark as learned')
        }
    }

    const handleNotLearned = async () => {
        const currentWord = shuffledWords[currentIndex]
        if (!currentWord) return

        try {
            logger.info('TRAINER', 'review action', { pageId: currentWord.id, action: 'not_learned' })
            await apiFetch('/api/trainer/learned', {
                method: 'POST',
                body: JSON.stringify({
                    notionPageId: currentWord.id,
                    action: 'not_learned',
                }),
            })

            // For "learned" preset, remove from queue if marked not learned
            if (presetId === 'learned') {
                const newShuffled = shuffledWords.filter(
                    (_, idx) => idx !== currentIndex,
                )
                setShuffledWords(newShuffled)

                if (
                    currentIndex >= newShuffled.length &&
                    newShuffled.length > 0
                ) {
                    setCurrentIndex(newShuffled.length - 1)
                } else if (newShuffled.length === 0) {
                    setCurrentIndex(0)
                }
            } else {
                // For other presets, just move to next
                if (currentIndex < shuffledWords.length - 1) {
                    setCurrentIndex(currentIndex + 1)
                } else {
                    setCurrentIndex(0)
                }
            }

            setFlipped(false)
        } catch (err: any) {
            logger.error('TRAINER', 'Error marking word as not learned', { error: err.message })
            setError(err.message || 'Failed to mark as not learned')
        }
    }

    const presetLabels: Record<string, string> = {
        active: 'All Active',
        learned: 'All Learned',
        verbs: 'All Verbs',
        nouns: 'All Nouns',
        adjectives: 'All Adjectives',
    }

    const currentWord = shuffledWords[currentIndex]
    const progress = `${currentIndex + 1} / ${shuffledWords.length}`

    if (loading) {
        return (
            <div className="min-h-[100dvh] max-w-2xl mx-auto px-4 py-8">
                <PageHeader
                    title={`Trainer: ${presetLabels[presetId] || presetId}`}
                    backHref="/app/words"
                />
                <div className="text-center py-8 text-muted-foreground">
                    Loading...
                </div>
            </div>
        )
    }

    if (error && shuffledWords.length === 0) {
        return (
            <div className="min-h-[100dvh] max-w-2xl mx-auto px-4 py-8">
                <PageHeader
                    title={`Trainer: ${presetLabels[presetId] || presetId}`}
                    backHref="/app/words"
                />
                <Card className="bg-error-background border-error-border text-error-text">
                    {error}
                </Card>
            </div>
        )
    }

    if (shuffledWords.length === 0) {
        return (
            <div className="min-h-[100dvh] max-w-2xl mx-auto px-4 py-8">
                <PageHeader
                    title={`Trainer: ${presetLabels[presetId] || presetId}`}
                    backHref="/app/words"
                />
                <Card className="text-center py-12">
                    <h2 className="text-2xl font-semibold mb-4">
                        No words found
                    </h2>
                    <p className="text-muted-foreground mb-6">
                        No words match this preset filter.
                    </p>
                    <Link href="/app/words">
                        <Button variant="primary">Back to Words</Button>
                    </Link>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-[100dvh] max-w-2xl mx-auto px-4 py-8">
            <PageHeader
                title={`Trainer: ${presetLabels[presetId] || presetId}`}
                backHref="/app/words"
                actions={
                    <div className="flex gap-2 items-center">
                        <LanguageDropdown
                            onLanguageChange={(lang) => {
                                setLearningLanguageClient(lang)
                                // Reload words when language changes
                                fetchWords()
                            }}
                        />
                        <Button
                            variant="outline"
                            onClick={() => setShowSettings(!showSettings)}
                        >
                            ⚙️ Settings
                        </Button>
                        <div className="text-sm text-muted-foreground">
                            {progress}
                        </div>
                    </div>
                }
            />

            {showSettings && (
                <Card className="mb-6 bg-muted">
                    <h3 className="font-semibold mb-4">Trainer Settings</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Front Side Content
                            </label>
                            <select
                                value={settings.frontMode}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        frontMode: e.target.value as any,
                                    })
                                }
                                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground"
                            >
                                <option value="word">Word</option>
                                <option value="translation_ru">
                                    Translation (Russian)
                                </option>
                                <option value="verb_presente">
                                    Verb Presente (Portuguese verbs only)
                                </option>
                                <option value="verb_perfeito">
                                    Verb Perfeito (Portuguese verbs only)
                                </option>
                                <option value="verb_imperfeito">
                                    Verb Imperfeito (Portuguese verbs only)
                                </option>
                                <option value="verb_presente_plus_translation">
                                    Verb Presente + Translation
                                </option>
                                <option value="verb_perfeito_plus_translation">
                                    Verb Perfeito + Translation
                                </option>
                                <option value="verb_imperfeito_plus_translation">
                                    Verb Imperfeito + Translation
                                </option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Back Side Content
                            </label>
                            <select
                                value={settings.backMode}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        backMode: e.target.value as any,
                                    })
                                }
                                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground"
                            >
                                <option value="translation_ru">
                                    Translation (Russian)
                                </option>
                                <option value="word">Word</option>
                                <option value="verb_presente">
                                    Verb Presente (Portuguese verbs only)
                                </option>
                                <option value="verb_perfeito">
                                    Verb Perfeito (Portuguese verbs only)
                                </option>
                                <option value="verb_imperfeito">
                                    Verb Imperfeito (Portuguese verbs only)
                                </option>
                                <option value="verb_presente_plus_translation">
                                    Verb Presente + Translation
                                </option>
                                <option value="verb_perfeito_plus_translation">
                                    Verb Perfeito + Translation
                                </option>
                                <option value="verb_imperfeito_plus_translation">
                                    Verb Imperfeito + Translation
                                </option>
                            </select>
                        </div>
                        <div className="flex justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setShowSettings(false)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {error && (
                <Card className="bg-yellow-50 border-yellow-200 text-yellow-800 mb-4">
                    {error}
                </Card>
            )}

            <div className="mb-4 text-center text-sm text-muted-foreground">
                Card {currentIndex + 1} of {shuffledWords.length}
            </div>

            <Card
                className="mb-6 min-h-[400px] flex items-center justify-center cursor-pointer"
                onClick={() => setFlipped(!flipped)}
            >
                {!flipped
                    ? renderContent(currentWord, settings.frontMode)
                    : renderContent(currentWord, settings.backMode)}
            </Card>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <Button
                    variant="secondary"
                    onClick={handleNotLearned}
                    className="w-full"
                >
                    ❌ Not learned
                </Button>
                <Button
                    variant="primary"
                    onClick={handleMarkLearned}
                    className="w-full"
                >
                    ✅ Learned
                </Button>
            </div>
        </div>
    )
}

export default function TrainerPage() {
    return (
        <Suspense
            fallback={
                <div className="max-w-2xl mx-auto px-4 py-8">
                    <PageHeader title="Loading..." backHref="/app/words" />
                    <div className="text-center py-8 text-muted-foreground">
                        Loading...
                    </div>
                </div>
            }
        >
            <TrainerContent />
        </Suspense>
    )
}
