'use client'

import { useEffect, useState, Suspense, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/app/ui/PageHeader'
import { Card } from '@/app/ui/Card'
import { Button } from '@/app/ui/Button'
import { LanguageDropdown } from '@/app/ui/LanguageDropdown'
import { NotionWord } from '@/lib/types'
import { logger } from '@/lib/logger'
import { apiFetch } from '@/lib/client'
import { FAVORITE_DECK_NAME } from '@/lib/notion'
import {
    getLearningLanguageClient,
    setLearningLanguageClient,
    type LearningLanguage,
} from '@/lib/learning-language'

interface DeckSettings {
    frontMode: 'word' | 'portuguese'
    backModes: {
        translation: boolean
        presente: boolean
        perfeito: boolean
        imperfeito: boolean
    }
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
        return {
            frontMode: 'portuguese',
            backModes: {
                translation: true,
                presente: false,
                perfeito: false,
                imperfeito: false,
            },
        }
    }

    // Always default frontMode to 'portuguese' - don't load from localStorage
    // This ensures Portuguese is always preselected on every session
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${deckName}`)
    let loadedBackModes = {
        translation: true,
        presente: false,
        perfeito: false,
        imperfeito: false,
    }
    
    if (stored) {
        try {
            const parsed = JSON.parse(stored) as any
            // Load backModes from localStorage if available
            if (parsed.backModes) {
                loadedBackModes = {
                    translation: parsed.backModes.translation ?? true,
                    presente: parsed.backModes.presente ?? false,
                    perfeito: parsed.backModes.perfeito ?? false,
                    imperfeito: parsed.backModes.imperfeito ?? false,
                }
            }
        } catch {
            // Fall through to default backModes
        }
    }
    
    return {
        frontMode: 'portuguese', // Always Portuguese, never load from localStorage
        backModes: loadedBackModes,
    }
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
    const [tempSettings, setTempSettings] = useState<DeckSettings>(() =>
        getDeckSettings(deckName),
    )
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({
        message: '',
        visible: false,
    })
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
            logger.info(
                'STUDY',
                `Loaded ${data.length} total words for deck: "${deckName}"`,
            )
            setAllWords(data)
        } catch (err: any) {
            logger.error('STUDY', 'Error fetching deck words', {
                error: err.message,
            })
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
            logger.error('STUDY', 'Error marking word as learned', {
                error: err.message,
            })
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

    const handleShuffle = () => {
        if (shuffledActiveWords.length <= 1) return

        // Get current word to keep it visible
        const currentWord = shuffledActiveWords[currentIndex]

        // Shuffle all words using Fisher–Yates
        const shuffled = [...shuffledActiveWords]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }

        // Find new position of current word, or keep it at index 0
        const newIndex = shuffled.findIndex((w) => w.id === currentWord.id)
        setShuffledActiveWords(shuffled)

        // Keep current card visible if possible, otherwise go to index 0
        if (newIndex >= 0) {
            setCurrentIndex(newIndex)
        } else {
            setCurrentIndex(0)
        }
        setFlipped(false)
    }

    const handleResetDeck = async () => {
        try {
            setResetting(true)
            logger.info('STUDY', `Resetting deck: "${deckName}"`)

            await apiFetch(`/api/decks/${encodeURIComponent(deckName)}/reset`, {
                method: 'POST',
            })

            // Reload words and reshuffle
            shuffledRef.current = false
            await fetchDeckWords()
        } catch (err: any) {
            logger.error('STUDY', 'Error resetting deck', {
                error: err.message,
            })
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

        // Clean vertical list with labels (eu: value, voce: value, etc.)
        return (
            <div className="space-y-2">
                {forms.map((form) => (
                    <div key={form.label} className="text-center">
                        <span className="text-2xl">
                            {form.label}: {form.value}
                        </span>
                    </div>
                ))}
            </div>
        )
    }

    const renderCardFront = (word: NotionWord) => {
        if (settings.frontMode === 'portuguese') {
            // Show Portuguese (learning language word)
            return (
                <div className="text-center">
                    <h2 className="text-5xl font-bold">{word.word}</h2>
                </div>
            )
        }
        // "Original" mode (frontMode === 'word'): Show Russian translation
        // Original language is Russian by default for this app
        if (word.translation && word.translation.trim()) {
            return (
                <div className="text-center">
                    <h2 className="text-5xl font-bold">{word.translation}</h2>
                </div>
            )
        }
        // Fallback: show the word itself
        return (
            <div className="text-center">
                <h2 className="text-5xl font-bold">{word.word}</h2>
            </div>
        )
    }

    const renderCardBack = (word: NotionWord) => {
        const isVerb = isPortugueseVerb(word)
        const parts: JSX.Element[] = []
        const hasTense =
            settings.backModes.presente ||
            settings.backModes.perfeito ||
            settings.backModes.imperfeito

        // Render verb forms if selected and applicable (in order: Presente, Perfeito, Imperfeito)
        if (settings.backModes.presente && isVerb) {
            const forms = renderVerbForms(word, 'presente')
            if (forms) parts.push(<div key="presente">{forms}</div>)
        }
        if (settings.backModes.perfeito && isVerb) {
            const forms = renderVerbForms(word, 'perfeito')
            if (forms) parts.push(<div key="perfeito">{forms}</div>)
        }
        if (settings.backModes.imperfeito && isVerb) {
            const forms = renderVerbForms(word, 'imperfeito')
            if (forms) parts.push(<div key="imperfeito">{forms}</div>)
        }

        // Render translation
        if (settings.backModes.translation && word.translation) {
            if (!hasTense) {
                // Translation only: large hero font
                parts.push(
                    <div key="translation" className="text-center">
                        <p className="text-5xl font-bold">
                            {word.translation}
                        </p>
                    </div>,
                )
            } else {
                // Translation with tense: normal secondary size at bottom
                parts.push(
                    <div
                        key="translation"
                        className="text-center pt-2 border-t border-border mt-2"
                    >
                        <p className="text-xl text-muted-foreground">
                            {word.translation}
                        </p>
                    </div>,
                )
            }
        }

        // Fallback if no parts selected or applicable
        if (parts.length === 0) {
            return (
                <div className="text-center">
                    <p className="text-5xl font-bold">
                        {word.translation || 'No translation'}
                    </p>
                </div>
            )
        }

        // Return combined parts
        return <div className="space-y-4">{parts}</div>
    }

    const learnedCount = allWords.filter((w) => w.learned).length
    const totalCount = allWords.length
    const activeCount = activeWords.length
    const currentWord = shuffledActiveWords[currentIndex]
    const progressText = `${learnedCount} / ${totalCount} words`
    const cardPosition = `Card ${currentIndex + 1} of ${
        shuffledActiveWords.length
    }`
    const progressPercent =
        totalCount > 0 ? (learnedCount / totalCount) * 100 : 0

    const handleToggleFavorite = async () => {
        // Use current word from state at call time (not closure)
        const word = shuffledActiveWords[currentIndex]
        if (!word) return

        // Check if word is favorite (normalize Favorite deck name)
        const isFavorite = word.decks.some(
            (d) => d.toLowerCase() === 'favorite',
        )

        // Optimistically update local state
        // Normalize Favorite deck name when adding/removing
        const updatedAllWords = allWords.map((w) =>
            w.id === word.id
                ? {
                      ...w,
                      decks: isFavorite
                          ? w.decks.filter(
                                (d) => d.toLowerCase() !== 'favorite',
                            )
                          : [
                                ...w.decks.filter(
                                    (d) => d.toLowerCase() !== 'favorite',
                                ),
                                FAVORITE_DECK_NAME,
                            ],
                  }
                : w,
        )
        setAllWords(updatedAllWords)

        // Update shuffled list if word is in it
        setShuffledActiveWords((prev) =>
            prev.map((w) =>
                w.id === word.id
                    ? {
                          ...w,
                          decks: isFavorite
                              ? w.decks.filter(
                                    (d) => d.toLowerCase() !== 'favorite',
                                )
                              : [
                                    ...w.decks.filter(
                                        (d) => d.toLowerCase() !== 'favorite',
                                    ),
                                    FAVORITE_DECK_NAME,
                                ],
                      }
                    : w,
            ),
        )

        // Show toast
        setToast({
            message: isFavorite
                ? 'Removed from Favorite deck'
                : 'Added to Favorite deck',
            visible: true,
        })
        setTimeout(() => setToast({ message: '', visible: false }), 3000)

        try {
            if (isFavorite) {
                await apiFetch('/api/decks/remove', {
                    method: 'POST',
                    body: JSON.stringify({
                        pageIds: [word.id],
                        deckName: FAVORITE_DECK_NAME,
                    }),
                })
            } else {
                await apiFetch('/api/decks/add', {
                    method: 'POST',
                    body: JSON.stringify({
                        notionPageIds: [word.id],
                        deckName: FAVORITE_DECK_NAME,
                    }),
                })
            }
        } catch (err: any) {
            logger.error('STUDY', 'Error toggling favorite', {
                error: err.message,
            })
            // Revert optimistic update on error
            await fetchDeckWords()
        }
    }

    const handleApplySettings = () => {
        setSettings(tempSettings)
        setShowSettings(false)
    }

    useEffect(() => {
        if (showSettings) {
            setTempSettings(settings)
        }
    }, [showSettings, settings])

    if (loading) {
        return (
            <div className="min-h-[100dvh] max-w-2xl mx-auto px-4 py-8">
                <Link href="/app/words">
                    <Button variant="outline">← Back</Button>
                </Link>
                <div className="text-center py-8 text-muted-foreground">
                    Loading deck...
                </div>
            </div>
        )
    }

    if (error && allWords.length === 0) {
        return (
            <div className="min-h-[100dvh] max-w-2xl mx-auto px-4 py-8">
                <Link href="/app/words">
                    <Button variant="outline">← Back</Button>
                </Link>
                <Card className="bg-error-background border-error-border text-error-text mt-6">
                    {error}
                </Card>
            </div>
        )
    }

    if (shuffledActiveWords.length === 0) {
        return (
            <div className="min-h-[100dvh] max-w-2xl mx-auto px-4 py-8">
                <Link href="/app/words">
                    <Button variant="outline">← Back</Button>
                </Link>
                <Card className="text-center py-12 mt-6">
                    <h2 className="text-2xl font-semibold mb-4">
                        Deck completed!
                    </h2>
                    <p className="text-muted-foreground mb-2">
                        {learnedCount} / {totalCount} words
                    </p>
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

    const isFavorite =
        currentWord?.decks.some((d) => d.toLowerCase() === 'favorite') ||
        false

    return (
        <div className="min-h-[100dvh] max-w-2xl mx-auto px-4 py-8 relative">
            {/* Toast Notification */}
            {toast.visible && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-success-background border border-success-border rounded-md shadow-lg px-4 py-3 transition-all duration-300 ease-in-out animate-[slideDownFade_0.3s_ease-in-out]">
                    <p className="text-sm text-success-text font-medium">
                        {toast.message}
                    </p>
                </div>
            )}
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-6">
                <Link href="/app/words">
                    <Button variant="outline">← Back</Button>
                </Link>
                <div className="flex-1 mx-6">
                    <h1 className="text-2xl font-bold mb-2">{deckName}</h1>
                    <div className="text-sm text-muted-foreground mb-1">
                        {progressText}
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-primary h-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                        {cardPosition}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleShuffle}
                        className="text-sm"
                    >
                        Shuffle
                    </Button>
                    <div className="relative">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="px-3 py-2 text-muted-foreground hover:text-foreground"
                            aria-label="Settings"
                        >
                            <span className="text-xl leading-none">⋯</span>
                        </button>
                        {showSettings && (
                            <div className="absolute right-0 top-12 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[240px]">
                                <div className="p-4 space-y-4">
                                    <div>
                                        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                                            FRONT SIDE
                                        </h4>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="frontMode"
                                                    checked={
                                                        tempSettings.frontMode ===
                                                        'word'
                                                    }
                                                    onChange={() =>
                                                        setTempSettings({
                                                            ...tempSettings,
                                                            frontMode: 'word',
                                                        })
                                                    }
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-sm">
                                                    Original
                                                </span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="frontMode"
                                                    checked={
                                                        tempSettings.frontMode ===
                                                        'portuguese'
                                                    }
                                                    onChange={() =>
                                                        setTempSettings({
                                                            ...tempSettings,
                                                            frontMode:
                                                                'portuguese',
                                                        })
                                                    }
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-sm">
                                                    Portuguese
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="border-t border-border pt-4">
                                        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                                            BACK
                                        </h4>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="tense"
                                                    checked={
                                                        tempSettings.backModes
                                                            .presente
                                                    }
                                                    onChange={() =>
                                                        setTempSettings({
                                                            ...tempSettings,
                                                            backModes: {
                                                                ...tempSettings.backModes,
                                                                presente: true,
                                                                perfeito: false,
                                                                imperfeito: false,
                                                            },
                                                        })
                                                    }
                                                    className="w-4 h-4 border-border text-primary focus:ring-primary focus:ring-offset-0"
                                                />
                                                <span className="text-sm">
                                                    Presente
                                                </span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="tense"
                                                    checked={
                                                        tempSettings.backModes
                                                            .perfeito
                                                    }
                                                    onChange={() =>
                                                        setTempSettings({
                                                            ...tempSettings,
                                                            backModes: {
                                                                ...tempSettings.backModes,
                                                                presente: false,
                                                                perfeito: true,
                                                                imperfeito: false,
                                                            },
                                                        })
                                                    }
                                                    className="w-4 h-4 border-border text-primary focus:ring-primary focus:ring-offset-0"
                                                />
                                                <span className="text-sm">
                                                    Perfeito
                                                </span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="tense"
                                                    checked={
                                                        tempSettings.backModes
                                                            .imperfeito
                                                    }
                                                    onChange={() =>
                                                        setTempSettings({
                                                            ...tempSettings,
                                                            backModes: {
                                                                ...tempSettings.backModes,
                                                                presente: false,
                                                                perfeito: false,
                                                                imperfeito: true,
                                                            },
                                                        })
                                                    }
                                                    className="w-4 h-4 border-border text-primary focus:ring-primary focus:ring-offset-0"
                                                />
                                                <span className="text-sm">
                                                    Imperfeito
                                                </span>
                                            </label>
                                        </div>
                                        <div className="border-t border-border mt-2 pt-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        tempSettings.backModes
                                                            .translation
                                                    }
                                                    onChange={(e) =>
                                                        setTempSettings({
                                                            ...tempSettings,
                                                            backModes: {
                                                                ...tempSettings.backModes,
                                                                translation:
                                                                    e.target
                                                                        .checked,
                                                            },
                                                        })
                                                    }
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-sm">
                                                    Translation
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="border-t border-border pt-4">
                                        <Button
                                            variant="primary"
                                            onClick={handleApplySettings}
                                            className="w-full"
                                        >
                                            Apply
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <Card className="bg-error-background border-error-border text-error-text mb-4">
                    {error}
                </Card>
            )}

            {/* Card */}
            <Card
                className="mb-6 min-h-[400px] max-w-xl mx-auto flex items-center justify-center cursor-pointer relative"
                onClick={() => setFlipped(!flipped)}
            >
                {!flipped
                    ? renderCardFront(currentWord)
                    : renderCardBack(currentWord)}
                {/* Star Icon */}
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        handleToggleFavorite()
                    }}
                    className="absolute bottom-4 right-4 text-2xl hover:scale-110 transition-transform"
                    aria-label={
                        isFavorite
                            ? 'Remove from favorites'
                            : 'Add to favorites'
                    }
                >
                    {isFavorite ? '⭐' : '☆'}
                </button>
            </Card>

            {/* Bottom Actions */}
            <div className="flex gap-4 justify-center max-w-xl mx-auto">
                <Button
                    variant="outline"
                    onClick={handleKeep}
                    className="flex-1"
                >
                    Leave
                </Button>
                <Button
                    variant="primary"
                    onClick={handleMarkLearned}
                    className="flex-1"
                >
                    Done
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
