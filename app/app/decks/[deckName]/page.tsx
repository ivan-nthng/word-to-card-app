'use client'

import { useEffect, useState, Suspense, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/app/ui/PageHeader'
import { Card } from '@/app/ui/Card'
import { Button } from '@/app/ui/Button'
import { NotionWord } from '@/lib/types'
import { logger } from '@/lib/logger'
import { apiFetch } from '@/lib/client'

interface DeckSettings {
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
        | 'verb_presente'
        | 'verb_perfeito'
        | 'verb_imperfeito'
        | 'verb_presente_plus_translation'
        | 'verb_perfeito_plus_translation'
        | 'verb_imperfeito_plus_translation'
}

const STORAGE_KEY_PREFIX = 'deck_settings_'

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

function getDeckSettings(deckName: string): DeckSettings {
    if (typeof window === 'undefined') {
        return { frontMode: 'word', backMode: 'translation_ru' }
    }

    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${deckName}`)
    if (stored) {
        try {
            const parsed = JSON.parse(stored) as any
            // Migrate old settings format
            if (parsed.direction && parsed.backMode) {
                return {
                    frontMode:
                        parsed.direction === 'forward'
                            ? 'word'
                            : 'translation_ru',
                    backMode:
                        parsed.backMode === 'translation'
                            ? 'translation_ru'
                            : parsed.backMode === 'verb_forms'
                            ? 'verb_presente'
                            : 'verb_presente',
                }
            }
            return parsed as DeckSettings
        } catch {
            return { frontMode: 'word', backMode: 'translation_ru' }
        }
    }
    return { frontMode: 'word', backMode: 'translation_ru' }
}

function saveDeckSettings(deckName: string, settings: DeckSettings) {
    if (typeof window === 'undefined') return
    localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${deckName}`,
        JSON.stringify(settings),
    )
}

function StudyDeckContent() {
    const params = useParams()
    const router = useRouter()
    const deckName = decodeURIComponent(params.deckName as string)

    const [allWords, setAllWords] = useState<NotionWord[]>([])
    const [activeWords, setActiveWords] = useState<NotionWord[]>([])
    const [shuffledActiveWords, setShuffledActiveWords] = useState<
        NotionWord[]
    >([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [resetting, setResetting] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [settings, setSettings] = useState<DeckSettings>(() =>
        getDeckSettings(deckName),
    )
    const shuffledRef = useRef(false)

    useEffect(() => {
        // Filter active words and shuffle once on load
        const active = allWords.filter((w) => !w.learned)
        setActiveWords(active)

        if (active.length > 0 && !shuffledRef.current) {
            const shuffled = shuffleArray(active)
            setShuffledActiveWords(shuffled)
            shuffledRef.current = true
        } else if (active.length === 0) {
            setShuffledActiveWords([])
            shuffledRef.current = false
        }

        setCurrentIndex(0)
        setFlipped(false)
    }, [allWords])

    useEffect(() => {
        saveDeckSettings(deckName, settings)
    }, [deckName, settings])

    const fetchDeckWords = useCallback(async () => {
        try {
            setLoading(true)
            setError('')
            shuffledRef.current = false
            logger.info('STUDY', `Fetching all words for deck: "${deckName}"`)

            const data = await apiFetch<NotionWord[]>(
                `/api/decks/${encodeURIComponent(deckName)}/words`,
            )
            logger.info('STUDY', `Loaded ${data.length} total words for deck: "${deckName}"`)
            setAllWords(data)
        } catch (err: any) {
            logger.error('STUDY', 'Error fetching deck words', { error: err.message })
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }, [deckName])

    useEffect(() => {
        fetchDeckWords()
    }, [fetchDeckWords])

    const handleMarkLearned = async () => {
        const currentWord = shuffledActiveWords[currentIndex]
        if (!currentWord) return

        try {
            logger.info('STUDY', `Marking word ${currentWord.id} as learned`)
            await apiFetch(
                `/api/decks/${encodeURIComponent(deckName)}/learned`,
                {
                    method: 'POST',
                    body: JSON.stringify({ notionPageId: currentWord.id }),
                },
            )

            // Update local state
            const updatedAllWords = allWords.map((w) =>
                w.id === currentWord.id ? { ...w, learned: true } : w,
            )
            setAllWords(updatedAllWords)

            // Remove from active shuffled list
            const newShuffled = shuffledActiveWords.filter(
                (_, idx) => idx !== currentIndex,
            )
            setShuffledActiveWords(newShuffled)

            // Adjust index
            if (currentIndex >= newShuffled.length && newShuffled.length > 0) {
                setCurrentIndex(newShuffled.length - 1)
            } else if (newShuffled.length === 0) {
                setCurrentIndex(0)
            }

            setFlipped(false)
        } catch (err: any) {
            logger.error('STUDY', 'Error marking word as learned', { error: err.message })
            setError(err.message || 'Failed to mark as learned')
        }
    }

    const handleKeep = () => {
        // Rotate current word to end of queue
        if (shuffledActiveWords.length <= 1) {
            setFlipped(false)
            return
        }

        const current = shuffledActiveWords[currentIndex]
        const newShuffled = [
            ...shuffledActiveWords.filter((_, idx) => idx !== currentIndex),
            current,
        ]
        setShuffledActiveWords(newShuffled)

        // Stay at same index (next word is now at currentIndex)
        setFlipped(false)
    }

    const handleResetDeck = async () => {
        try {
            setResetting(true)
            logger.info('STUDY', `Resetting deck: "${deckName}"`)

            await apiFetch(
                `/api/decks/${encodeURIComponent(deckName)}/reset`,
                {
                    method: 'POST',
                },
            )

            // Reload words and reshuffle
            shuffledRef.current = false
            await fetchDeckWords()
        } catch (err: any) {
            logger.error('STUDY', 'Error resetting deck', { error: err.message })
            setError(err.message || 'Failed to reset deck')
        } finally {
            setResetting(false)
        }
    }

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
        mode: DeckSettings['frontMode'] | DeckSettings['backMode'],
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

    const renderCardFront = (word: NotionWord) => {
        return renderContent(word, settings.frontMode)
    }

    const renderCardBack = (word: NotionWord) => {
        return renderContent(word, settings.backMode)
    }

    const learnedCount = allWords.filter((w) => w.learned).length
    const totalCount = allWords.length
    const activeCount = activeWords.length
    const currentWord = shuffledActiveWords[currentIndex]
    const progress = `${learnedCount} learned / ${totalCount} total`

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8">
                <PageHeader
                    title={`Study: ${deckName}`}
                    backHref="/app/words"
                />
                <div className="text-center py-8 text-muted-foreground">
                    Loading deck...
                </div>
            </div>
        )
    }

    if (error && allWords.length === 0) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8">
                <PageHeader
                    title={`Study: ${deckName}`}
                    backHref="/app/words"
                />
                <Card className="bg-error-background border-error-border text-error-text">
                    {error}
                </Card>
            </div>
        )
    }

    if (shuffledActiveWords.length === 0) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8">
                <PageHeader
                    title={`Study: ${deckName}`}
                    backHref="/app/words"
                />
                <Card className="text-center py-12">
                    <h2 className="text-2xl font-semibold mb-4">
                        Deck completed!
                    </h2>
                    <p className="text-muted-foreground mb-2">{progress}</p>
                    <p className="text-muted-foreground mb-6">
                        All words in this deck have been marked as learned.
                    </p>
                    <Button onClick={handleResetDeck} disabled={resetting}>
                        {resetting ? 'Resetting...' : 'Reset deck'}
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <PageHeader
                title={`Study: ${deckName}`}
                backHref="/app/words"
                actions={
                    <div className="flex gap-2 items-center">
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
                    <h3 className="font-semibold mb-4">Deck Settings</h3>
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
                Card {currentIndex + 1} of {shuffledActiveWords.length} active
            </div>

            <Card
                className="mb-6 min-h-[400px] flex items-center justify-center cursor-pointer"
                onClick={() => setFlipped(!flipped)}
            >
                {!flipped
                    ? renderCardFront(currentWord)
                    : renderCardBack(currentWord)}
            </Card>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <Button
                    variant="secondary"
                    onClick={handleKeep}
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

            <div className="flex justify-center gap-4">
                <Button
                    variant="outline"
                    onClick={handleResetDeck}
                    disabled={resetting}
                >
                    {resetting ? 'Resetting...' : 'Reset deck'}
                </Button>
            </div>
        </div>
    )
}

export default function StudyDeckPage() {
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
            <StudyDeckContent />
        </Suspense>
    )
}
