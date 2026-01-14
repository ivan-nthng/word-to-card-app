'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/app/ui/PageHeader'
import { Input } from '@/app/ui/Input'
import { Card } from '@/app/ui/Card'
import { Button } from '@/app/ui/Button'
import { NotionWord } from '@/lib/types'
import { logger } from '@/lib/logger'
import { apiFetch } from '@/lib/client'

interface DeckSummary {
    name: string
    activeCount: number
    learnedCount: number
    totalCount: number
}

interface TrainerPresetCounts {
    active: { active: number; total: number }
    learned: { active: number; total: number }
    verbs: { active: number; total: number }
    nouns: { active: number; total: number }
    adjectives: { active: number; total: number }
}

const APP_LANGUAGE_KEY = 'appLanguage'

function getAppLanguage(): 'Portuguese' | 'English' {
    if (typeof window === 'undefined') return 'Portuguese'
    const stored = localStorage.getItem(APP_LANGUAGE_KEY)
    return (stored as 'Portuguese' | 'English') || 'Portuguese'
}

function setAppLanguage(language: 'Portuguese' | 'English') {
    if (typeof window === 'undefined') return
    localStorage.setItem(APP_LANGUAGE_KEY, language)
}

export default function WordsPage() {
    const [appLanguage, setAppLanguageState] = useState<
        'Portuguese' | 'English'
    >(() => getAppLanguage())
    const [words, setWords] = useState<NotionWord[]>([])
    const [filteredWords, setFilteredWords] = useState<NotionWord[]>([])
    const [decks, setDecks] = useState<DeckSummary[]>([])
    const [trainerCounts, setTrainerCounts] =
        useState<TrainerPresetCounts | null>(null)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set())
    const [showDeckDialog, setShowDeckDialog] = useState(false)
    const [deckName, setDeckName] = useState('')
    const [addingToDeck, setAddingToDeck] = useState(false)
    const [updatingLearned, setUpdatingLearned] = useState<Set<string>>(
        new Set(),
    )

    const handleLanguageChange = (language: 'Portuguese' | 'English') => {
        setAppLanguageState(language)
        setAppLanguage(language)
    }

    const fetchDecks = useCallback(async () => {
        try {
            const data = await apiFetch<DeckSummary[]>('/api/decks/summary')
            setDecks(data)
        } catch (err: any) {
            logger.error('WordsPage', 'Error fetching decks', {
                error: err.message,
            })
        }
    }, [])

    const fetchTrainerCounts = useCallback(async () => {
        try {
            const data = await apiFetch<TrainerPresetCounts>(
                `/api/trainer/presets/counts?language=${encodeURIComponent(
                    appLanguage,
                )}`,
            )
            setTrainerCounts(data)
        } catch (err: any) {
            logger.error('WordsPage', 'Error fetching trainer counts', {
                error: err.message,
            })
        }
    }, [appLanguage])

    const fetchWords = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            params.set('language', appLanguage)
            if (search.trim()) params.set('search', search.trim())

            const url = `/api/words?${params.toString()}`
            const data = await apiFetch<NotionWord[]>(url)
            setWords(data)
            // Filtered words are already filtered by the API (language + search)
            setFilteredWords(data)
        } catch (err: any) {
            logger.error('WordsPage', 'Error fetching words', {
                error: err.message,
            })
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }, [appLanguage, search])

    useEffect(() => {
        fetchDecks()
    }, [fetchDecks])

    useEffect(() => {
        fetchTrainerCounts()
    }, [fetchTrainerCounts])

    useEffect(() => {
        fetchWords()
    }, [fetchWords])

    const handleSelectWord = (wordId: string) => {
        const newSelected = new Set(selectedWords)
        if (newSelected.has(wordId)) {
            newSelected.delete(wordId)
        } else {
            newSelected.add(wordId)
        }
        setSelectedWords(newSelected)
    }

    const handleSelectAll = () => {
        if (
            selectedWords.size === filteredWords.length &&
            filteredWords.length > 0
        ) {
            setSelectedWords(new Set())
        } else {
            setSelectedWords(new Set(filteredWords.map((w) => w.id)))
        }
    }

    const handleToggleLearned = async (
        wordId: string,
        currentLearned: boolean,
    ) => {
        if (updatingLearned.has(wordId)) return

        try {
            setUpdatingLearned((prev) => new Set(prev).add(wordId))

            await apiFetch('/api/trainer/learned', {
                method: 'POST',
                body: JSON.stringify({
                    notionPageId: wordId,
                    action: currentLearned ? 'not_learned' : 'learned',
                }),
            })

            // Update local state
            setWords((prev) =>
                prev.map((w) =>
                    w.id === wordId ? { ...w, learned: !currentLearned } : w,
                ),
            )

            // Refresh counts
            await Promise.all([fetchWords(), fetchTrainerCounts()])
        } catch (err: any) {
            logger.error('WordsPage', 'Error toggling learned', {
                error: err.message,
            })
            setError(err.message || 'Failed to update learned status')
        } finally {
            setUpdatingLearned((prev) => {
                const next = new Set(prev)
                next.delete(wordId)
                return next
            })
        }
    }

    const handleAddToDeck = async () => {
        if (!deckName.trim() || selectedWords.size === 0) {
            return
        }

        try {
            setAddingToDeck(true)
            logger.info(
                'DECK',
                `Adding ${selectedWords.size} words to deck: "${deckName}"`,
            )

            await apiFetch('/api/decks/add', {
                method: 'POST',
                body: JSON.stringify({
                    notionPageIds: Array.from(selectedWords),
                    deckName: deckName.trim(),
                }),
            })

            // Reload data
            await Promise.all([fetchWords(), fetchDecks()])

            // Reset selection and dialog
            setSelectedWords(new Set())
            setShowDeckDialog(false)
            setDeckName('')
        } catch (err: any) {
            logger.error('DECK', 'Error adding words to deck', {
                error: err.message,
            })
            setError(err.message || 'Failed to add words to deck')
        } finally {
            setAddingToDeck(false)
        }
    }

    const trainerPresets = [
        { id: 'active', label: 'All Active', counts: trainerCounts?.active },
        { id: 'learned', label: 'All Learned', counts: trainerCounts?.learned },
        { id: 'verbs', label: 'All Verbs', counts: trainerCounts?.verbs },
        { id: 'nouns', label: 'All Nouns', counts: trainerCounts?.nouns },
        {
            id: 'adjectives',
            label: 'All Adjectives',
            counts: trainerCounts?.adjectives,
        },
    ]

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <PageHeader
                title="Words"
                actions={
                    <div className="flex items-center gap-4">
                        <select
                            value={appLanguage}
                            onChange={(e) =>
                                handleLanguageChange(
                                    e.target.value as 'Portuguese' | 'English',
                                )
                            }
                            className="px-3 py-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="Portuguese">Portuguese</option>
                            <option value="English">English</option>
                        </select>
                        <Link href="/app/add">
                            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-colors">
                                Add Word
                            </button>
                        </Link>
                    </div>
                }
            />

            {/* Trainer Presets */}
            {trainerCounts && (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-3">Trainer</h2>
                    <div className="flex flex-wrap gap-4">
                        {trainerPresets.map((preset) => (
                            <Link
                                key={preset.id}
                                href={`/app/trainer/${
                                    preset.id
                                }?language=${encodeURIComponent(appLanguage)}`}
                                className="block"
                            >
                                <Card className="hover:border-primary transition-all duration-200 cursor-pointer px-6 py-4 min-w-[200px] hover:-translate-y-1 hover:shadow-lg">
                                    <div className="text-lg font-semibold mb-1">
                                        {preset.label}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {preset.counts
                                            ? `${preset.counts.active} active, ${preset.counts.total} total`
                                            : 'Loading...'}
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Deck Bar */}
            {decks.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-3">Decks</h2>
                    <div className="flex flex-wrap gap-4">
                        {decks.map((deck) => (
                            <Link
                                key={deck.name}
                                href={`/app/decks/${encodeURIComponent(
                                    deck.name,
                                )}`}
                                className="block"
                            >
                                <Card className="hover:border-primary transition-all duration-200 cursor-pointer px-6 py-4 min-w-[200px] hover:-translate-y-1 hover:shadow-lg">
                                    <div className="text-lg font-semibold mb-1">
                                        {deck.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {deck.activeCount} active,{' '}
                                        {deck.totalCount} total
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="mb-6">
                <Input
                    placeholder="Search words or translations..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {showDeckDialog && (
                <Card className="mb-6 bg-muted border-2 border-primary">
                    <h3 className="font-semibold mb-4">Add words to deck</h3>
                    <div className="space-y-4">
                        <Input
                            label="Deck name"
                            placeholder="Enter deck name..."
                            value={deckName}
                            onChange={(e) => setDeckName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleAddToDeck()
                                } else if (e.key === 'Escape') {
                                    setShowDeckDialog(false)
                                    setDeckName('')
                                }
                            }}
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowDeckDialog(false)
                                    setDeckName('')
                                }}
                                disabled={addingToDeck}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleAddToDeck}
                                disabled={!deckName.trim() || addingToDeck}
                            >
                                {addingToDeck ? 'Adding...' : 'Add'}
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {loading && (
                <div className="text-center py-8 text-muted-foreground">
                    Loading...
                </div>
            )}

            {error && (
                <Card className="bg-error-background border-error-border text-error-text mb-4">
                    {error}
                </Card>
            )}

            {!loading && !error && filteredWords.length === 0 && (
                <Card className="text-center py-8 text-muted-foreground">
                    {search
                        ? 'No words found matching your search'
                        : 'No words yet. Add your first word!'}
                </Card>
            )}

            {!loading && !error && filteredWords.length > 0 && (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted border-b border-border">
                            <tr>
                                <th className="px-4 py-2 text-left">
                                    <input
                                        type="checkbox"
                                        checked={
                                            selectedWords.size ===
                                                filteredWords.length &&
                                            filteredWords.length > 0
                                        }
                                        onChange={handleSelectAll}
                                        className="rounded border-border"
                                    />
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-medium">
                                    Word
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-medium">
                                    Translation (RU)
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-medium">
                                    Learned
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-medium">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWords.map((word) => (
                                <tr
                                    key={word.id}
                                    className="border-b border-border hover:bg-muted/50 transition-colors"
                                >
                                    <td className="px-4 py-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedWords.has(word.id)}
                                            onChange={() =>
                                                handleSelectWord(word.id)
                                            }
                                            onClick={(e) => e.stopPropagation()}
                                            className="rounded border-border"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <Link
                                            href={`/app/words/${word.id}`}
                                            className="font-semibold hover:text-primary transition-colors"
                                        >
                                            {word.word}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-muted-foreground">
                                        {word.translation || 'No translation'}
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="checkbox"
                                            checked={word.learned}
                                            onChange={() =>
                                                handleToggleLearned(
                                                    word.id,
                                                    word.learned,
                                                )
                                            }
                                            disabled={updatingLearned.has(
                                                word.id,
                                            )}
                                            className="rounded border-border"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <span
                                            className={`text-xs ${
                                                word.learned
                                                    ? 'text-success'
                                                    : 'text-muted-foreground'
                                            }`}
                                        >
                                            {word.learned
                                                ? 'Learned'
                                                : 'Active'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
