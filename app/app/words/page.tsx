'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/app/ui/PageHeader'
import { Input } from '@/app/ui/Input'
import { Card } from '@/app/ui/Card'
import { Button } from '@/app/ui/Button'
import { NotionWord } from '@/lib/types'
import { logger } from '@/lib/logger'
import { apiFetch } from '@/lib/client'
import { LanguageDropdown } from '@/app/ui/LanguageDropdown'
import { Tag, getTypeVariant } from '@/app/ui/Tag'
import {
    getLearningLanguageClient,
    setLearningLanguageClient,
    mapLearningLanguageToNotion,
    type LearningLanguage,
} from '@/lib/learning-language'
import { FAVORITE_DECK_NAME } from '@/lib/notion'

interface DeckSummary {
    name: string
    activeCount: number
    learnedCount: number
    totalCount: number
}

type SortColumn = 'word' | 'translation' | 'typo' | null
type SortDirection = 'asc' | 'desc' | null
type TypoFilter = 'All' | 'Verbo' | 'substantivo' | 'Adjetivo'
type LearnedFilter = 'All' | 'Learned' | 'Not learned'
type DateSort = 'newest' | 'oldest'

export default function WordsPage() {
    const router = useRouter()
    const [learningLanguage, setLearningLanguageState] =
        useState<LearningLanguage>(() => getLearningLanguageClient())
    const [words, setWords] = useState<NotionWord[]>([])
    const [filteredWords, setFilteredWords] = useState<NotionWord[]>([])
    const [decks, setDecks] = useState<DeckSummary[]>([])
    const [favoriteDeck, setFavoriteDeck] = useState<DeckSummary | null>(null)
    const [search, setSearch] = useState('')
    const [typoFilter, setTypoFilter] = useState<TypoFilter>('All')
    const [learnedFilter, setLearnedFilter] = useState<LearnedFilter>('All')
    const [sortColumn, setSortColumn] = useState<SortColumn>(null)
    const [sortDirection, setSortDirection] = useState<SortDirection>(null)
    const [dateSort, setDateSort] = useState<DateSort>('newest')
    const [deckFilter, setDeckFilter] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set())
    const [showDeckDialog, setShowDeckDialog] = useState(false)
    const [deckName, setDeckName] = useState('')
    const [addingToDeck, setAddingToDeck] = useState(false)
    const [updatingLearned, setUpdatingLearned] = useState<Set<string>>(
        new Set(),
    )
    const [showDeckMenu, setShowDeckMenu] = useState<string | null>(null)
    const [editingDeck, setEditingDeck] = useState<string | null>(null)
    const [deckMembership, setDeckMembership] = useState<Set<string>>(new Set())
    const [savingDeck, setSavingDeck] = useState(false)
    const [showAddFiltersDropdown, setShowAddFiltersDropdown] = useState(false)
    const [activeFilterDropdown, setActiveFilterDropdown] = useState<
        'type' | 'learned' | 'sort' | null
    >(null)

    const handleLanguageChange = (lang: LearningLanguage) => {
        setLearningLanguageState(lang)
        setLearningLanguageClient(lang)
    }

    // Map learning language to Notion format for API calls
    const appLanguage = mapLearningLanguageToNotion(learningLanguage)

    const fetchDecks = useCallback(async () => {
        try {
            const data = await apiFetch<DeckSummary[]>('/api/decks/summary')
            
            // Extract Favorite deck from summary (normalized name)
            const favoriteDeckData = data.find(
                (d) => d.name === FAVORITE_DECK_NAME,
            )
            setFavoriteDeck(favoriteDeckData || null)

            // Remove Favorite from regular decks list to avoid duplication
            const otherDecks = data.filter((d) => d.name !== FAVORITE_DECK_NAME)
            setDecks(otherDecks)
        } catch (err: any) {
            logger.error('WordsPage', 'Error fetching decks', {
                error: err.message,
            })
        }
    }, [])

    const fetchWords = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            // Map learning language to Notion format for API (compute inside callback)
            const notionLanguage = mapLearningLanguageToNotion(learningLanguage)
            params.set('language', notionLanguage)
            if (search.trim()) params.set('search', search.trim())
            if (typoFilter !== 'All') params.set('typo', typoFilter)

            const url = `/api/words?${params.toString()}`
            const data = await apiFetch<NotionWord[]>(url)
            setWords(data)

            // Apply client-side Learned filter
            let filtered = data
            if (learnedFilter === 'Learned') {
                filtered = filtered.filter((w) => w.learned)
            } else if (learnedFilter === 'Not learned') {
                filtered = filtered.filter((w) => !w.learned)
            }

            // Apply deck filter if active (but not in edit mode)
            if (deckFilter && !editingDeck) {
                filtered = filtered.filter((w) => w.decks.includes(deckFilter))
            }

            // Apply date sorting first (Newest/Oldest)
            if (dateSort === 'oldest') {
                filtered = [...filtered].reverse()
            }

            // Apply column sorting
            if (sortColumn && sortDirection) {
                filtered = [...filtered].sort((a, b) => {
                    let aVal: string
                    let bVal: string

                    if (sortColumn === 'word') {
                        aVal = a.word.toLowerCase()
                        bVal = b.word.toLowerCase()
                    } else if (sortColumn === 'translation') {
                        aVal = (a.translation || '').toLowerCase()
                        bVal = (b.translation || '').toLowerCase()
                    } else if (sortColumn === 'typo') {
                        aVal = a.typo
                        bVal = b.typo
                    } else {
                        return 0
                    }

                    const comparison = aVal.localeCompare(bVal)
                    return sortDirection === 'asc' ? comparison : -comparison
                })
            }

            setFilteredWords(filtered)
            setError('') // Clear any previous errors on success
        } catch (err: any) {
            logger.error('WordsPage', 'Error fetching words', {
                error: err.message,
            })
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }, [
        learningLanguage,
        search,
        typoFilter,
        learnedFilter,
        deckFilter,
        sortColumn,
        sortDirection,
        editingDeck,
        dateSort,
    ])

    useEffect(() => {
        fetchDecks()
    }, [fetchDecks])

    useEffect(() => {
        fetchWords()
    }, [fetchWords])

    // Close deck menu when clicking outside
    useEffect(() => {
        if (!showDeckMenu) return

        const handleClickOutside = () => {
            setShowDeckMenu(null)
        }

        // Delay to avoid immediate close
        const timeout = setTimeout(() => {
            document.addEventListener('click', handleClickOutside)
        }, 100)

        return () => {
            clearTimeout(timeout)
            document.removeEventListener('click', handleClickOutside)
        }
    }, [showDeckMenu])

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
            setFilteredWords((prev) =>
                prev.map((w) =>
                    w.id === wordId ? { ...w, learned: !currentLearned } : w,
                ),
            )

            // Refresh counts
            await Promise.all([fetchWords(), fetchDecks()])
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

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            if (sortDirection === 'asc') {
                setSortDirection('desc')
            } else if (sortDirection === 'desc') {
                setSortColumn(null)
                setSortDirection(null)
            } else {
                setSortDirection('asc')
            }
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const handleAddToDeck = async () => {
        if (!deckName.trim() || selectedWords.size === 0) {
            return
        }

        // Prevent creating Favorite deck via UI (it's system-managed)
        const normalizedDeckName = deckName.trim()
        if (
            normalizedDeckName.toLowerCase() ===
            FAVORITE_DECK_NAME.toLowerCase()
        ) {
            setError('Favorite deck cannot be created. Use the star icon to add words to favorites.')
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

    const handleDeleteDeck = async (deckName: string) => {
        // Prevent deleting Favorite deck (it's system-managed)
        if (deckName === FAVORITE_DECK_NAME) {
            setError('Favorite deck cannot be deleted. Use the star icon to manage favorites.')
            return
        }

        if (
            !confirm(
                `Delete deck "${deckName}"? This will remove it from all words.`,
            )
        ) {
            return
        }

        try {
            // Get all words in this deck
            const allWords = words.filter((w) => w.decks.includes(deckName))
            if (allWords.length === 0) {
                // If no words, just refresh
                await fetchDecks()
                return
            }

            await apiFetch('/api/decks/remove', {
                method: 'POST',
                body: JSON.stringify({
                    pageIds: allWords.map((w) => w.id),
                    deckName,
                }),
            })

            // Reload data
            await Promise.all([fetchWords(), fetchDecks()])
            setShowDeckMenu(null)
        } catch (err: any) {
            logger.error('DECK', 'Error deleting deck', {
                error: err.message,
            })
            setError(err.message || 'Failed to delete deck')
        }
    }

    const handleRefreshDeck = async (deckName: string) => {
        await fetchDecks()
        setShowDeckMenu(null)
    }

    const handleEditDeck = async (deckName: string) => {
        // Prevent editing Favorite deck (it's system-managed via star icon)
        if (deckName === FAVORITE_DECK_NAME) {
            setError('Favorite deck cannot be edited. Use the star icon to manage favorites.')
            return
        }

        try {
            // Fetch current deck words to get membership
            const deckWords = await apiFetch<NotionWord[]>(
                `/api/decks/${encodeURIComponent(deckName)}/words`,
            )
            const membership = new Set(deckWords.map((w) => w.id))
            setDeckMembership(membership)
            setEditingDeck(deckName)
            setShowDeckMenu(null)
        } catch (err: any) {
            logger.error('DECK', 'Error loading deck for edit', {
                error: err.message,
            })
            setError(err.message || 'Failed to load deck')
        }
    }

    const handleCancelEdit = () => {
        setEditingDeck(null)
        setDeckMembership(new Set())
        setDeckFilter(null)
    }

    const handleToggleDeckMembership = (wordId: string) => {
        const newMembership = new Set(deckMembership)
        if (newMembership.has(wordId)) {
            newMembership.delete(wordId)
        } else {
            newMembership.add(wordId)
        }
        setDeckMembership(newMembership)
    }

    const handleSaveDeck = async () => {
        if (!editingDeck) return

        try {
            setSavingDeck(true)

            // Get current deck words to determine what changed
            const currentDeckWords = await apiFetch<NotionWord[]>(
                `/api/decks/${encodeURIComponent(editingDeck)}/words`,
            )
            const currentMembership = new Set(currentDeckWords.map((w) => w.id))

            // Words to add (in new membership but not in current)
            const toAdd = Array.from(deckMembership).filter(
                (id) => !currentMembership.has(id),
            )
            // Words to remove (in current but not in new membership)
            const toRemove = Array.from(currentMembership).filter(
                (id) => !deckMembership.has(id),
            )

            // Apply changes
            if (toAdd.length > 0) {
                await apiFetch('/api/decks/add', {
                    method: 'POST',
                    body: JSON.stringify({
                        notionPageIds: toAdd,
                        deckName: editingDeck,
                    }),
                })
            }

            if (toRemove.length > 0) {
                await apiFetch('/api/decks/remove', {
                    method: 'POST',
                    body: JSON.stringify({
                        pageIds: toRemove,
                        deckName: editingDeck,
                    }),
                })
            }

            // Refresh data and exit edit mode
            await Promise.all([fetchWords(), fetchDecks()])
            handleCancelEdit()
        } catch (err: any) {
            logger.error('DECK', 'Error saving deck', {
                error: err.message,
            })
            setError(err.message || 'Failed to save deck changes')
        } finally {
            setSavingDeck(false)
        }
    }

    const handleStartTraining = async () => {
        if (selectedWords.size === 0) return

        // Create a temporary deck for selected words, then navigate to it
        const tempDeckName = `temp_${Date.now()}`
        try {
            await apiFetch('/api/decks/add', {
                method: 'POST',
                body: JSON.stringify({
                    notionPageIds: Array.from(selectedWords),
                    deckName: tempDeckName,
                }),
            })
            // Navigate to deck study page
            router.push(`/app/decks/${encodeURIComponent(tempDeckName)}`)
        } catch (err: any) {
            logger.error('WordsPage', 'Error creating temporary deck', {
                error: err.message,
            })
            setError(err.message || 'Failed to start training')
        }
    }

    const handleDeleteWords = async () => {
        if (selectedWords.size === 0) return

        const wordCount = selectedWords.size
        if (
            !confirm(
                `Delete ${wordCount} word${wordCount > 1 ? 's' : ''}? This action cannot be undone.`,
            )
        ) {
            return
        }

        try {
            // Delete each word by archiving it in Notion
            const deletePromises = Array.from(selectedWords).map((wordId) =>
                apiFetch(`/api/words/${wordId}`, {
                    method: 'DELETE',
                }),
            )

            await Promise.all(deletePromises)

            // Clear selection and refresh
            setSelectedWords(new Set())
            await Promise.all([fetchWords(), fetchDecks()])
        } catch (err: any) {
            logger.error('WordsPage', 'Error deleting words', {
                error: err.message,
            })
            setError(err.message || 'Failed to delete words')
        }
    }

    const allDecks = favoriteDeck ? [favoriteDeck, ...decks] : decks

    // Edit mode UI
    if (editingDeck) {
        return (
            <div className="min-h-[100dvh] max-w-6xl mx-auto px-4 py-8">
                {/* Edit Mode Top Bar */}
                <div className="flex items-center justify-between mb-6">
                    <Button variant="outline" onClick={handleCancelEdit}>
                        ← Back
                    </Button>
                    <h1 className="text-2xl font-bold">{editingDeck}</h1>
                    <div className="w-20"></div>
                    {/* Spacer for centering */}
                </div>

                {/* Search + Filters */}
                <div className="mb-4 flex items-center gap-4">
                    <div className="relative flex-1 max-w-[200px] group focus-within:max-w-[400px] transition-all duration-200">
                        <input
                            type="text"
                            placeholder="Search words or translations..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={typoFilter}
                            onChange={(e) =>
                                setTypoFilter(e.target.value as TypoFilter)
                            }
                            className="px-3 pr-10 py-2 border border-border rounded-md bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                        >
                            <option value="All">All Types</option>
                            <option value="Verbo">Verbo</option>
                            <option value="substantivo">Substantivo</option>
                            <option value="Adjetivo">Adjetivo</option>
                        </select>
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-xs">
                            ▼
                        </span>
                    </div>
                    <div className="relative">
                        <select
                            value={learnedFilter}
                            onChange={(e) =>
                                setLearnedFilter(
                                    e.target.value as LearnedFilter,
                                )
                            }
                            className="px-3 pr-10 py-2 border border-border rounded-md bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                        >
                            <option value="All">All</option>
                            <option value="Learned">Learned</option>
                            <option value="Not learned">Not learned</option>
                        </select>
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-xs">
                            ▼
                        </span>
                    </div>
                    <div className="relative">
                        <select
                            value={dateSort}
                            onChange={(e) =>
                                setDateSort(e.target.value as DateSort)
                            }
                            className="px-3 pr-10 py-2 border border-border rounded-md bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                        >
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                        </select>
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-xs">
                            ▼
                        </span>
                    </div>
                </div>

                {error && (
                    <Card className="bg-error-background border-error-border text-error-text mb-4">
                        {error}
                    </Card>
                )}

                {!loading && !error && filteredWords.length === 0 && (
                    <Card className="text-center py-8 text-muted-foreground">
                        {search ||
                        typoFilter !== 'All' ||
                        learnedFilter !== 'All'
                            ? 'No words found matching your filters'
                            : 'No words yet. Add your first word!'}
                    </Card>
                )}

                {!loading && !error && filteredWords.length > 0 && (
                    <div className="bg-card border border-border rounded-lg overflow-hidden mb-20">
                        <table className="w-full">
                            <thead className="bg-muted border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 text-left w-12">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    deckMembership.size ===
                                                        filteredWords.length &&
                                                    filteredWords.length > 0 &&
                                                    filteredWords.every((w) =>
                                                        deckMembership.has(
                                                            w.id,
                                                        ),
                                                    )
                                                }
                                                onChange={() => {
                                                    if (
                                                        filteredWords.every(
                                                            (w) =>
                                                                deckMembership.has(
                                                                    w.id,
                                                                ),
                                                        )
                                                    ) {
                                                        // Deselect all
                                                        const newMembership =
                                                            new Set(
                                                                deckMembership,
                                                            )
                                                        filteredWords.forEach(
                                                            (w) =>
                                                                newMembership.delete(
                                                                    w.id,
                                                                ),
                                                        )
                                                        setDeckMembership(
                                                            newMembership,
                                                        )
                                                    } else {
                                                        // Select all
                                                        const newMembership =
                                                            new Set(
                                                                deckMembership,
                                                            )
                                                        filteredWords.forEach(
                                                            (w) =>
                                                                newMembership.add(
                                                                    w.id,
                                                                ),
                                                        )
                                                        setDeckMembership(
                                                            newMembership,
                                                        )
                                                    }
                                                }}
                                                className="w-4 h-4"
                                            />
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide cursor-pointer hover:bg-muted/80"
                                        onClick={() => handleSort('word')}
                                    >
                                        <div className="flex items-center gap-2">
                                            WORD
                                            {sortColumn === 'word' && (
                                                <span className="text-xs">
                                                    {sortDirection === 'asc'
                                                        ? '↑'
                                                        : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide cursor-pointer hover:bg-muted/80"
                                        onClick={() =>
                                            handleSort('translation')
                                        }
                                    >
                                        <div className="flex items-center gap-2">
                                            TRANSLATION
                                            {sortColumn === 'translation' && (
                                                <span className="text-xs">
                                                    {sortDirection === 'asc'
                                                        ? '↑'
                                                        : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide cursor-pointer hover:bg-muted/80"
                                        onClick={() => handleSort('typo')}
                                    >
                                        <div className="flex items-center gap-2">
                                            TYPE
                                            {sortColumn === 'typo' && (
                                                <span className="text-xs">
                                                    {sortDirection === 'asc'
                                                        ? '↑'
                                                        : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide w-24">
                                        Learned
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredWords.map((word) => (
                                    <tr
                                        key={word.id}
                                        className="border-b border-border hover:bg-muted/50 transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={deckMembership.has(
                                                        word.id,
                                                    )}
                                                    onChange={() =>
                                                        handleToggleDeckMembership(
                                                            word.id,
                                                        )
                                                    }
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                    className="w-4 h-4"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/app/words/${word.id}`}
                                                className="font-semibold hover:text-primary transition-colors"
                                            >
                                                {word.word}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground leading-normal">
                                            {word.translation ||
                                                'No translation'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Tag
                                                variant={getTypeVariant(
                                                    word.typo,
                                                )}
                                            >
                                                {word.typo}
                                            </Tag>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end">
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
                                                    className="w-4 h-4"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Edit Mode Bottom Bar */}
                <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg px-4 py-3 z-50">
                    <div className="max-w-6xl mx-auto flex items-center justify-end">
                        <Button
                            variant="primary"
                            onClick={handleSaveDeck}
                            disabled={savingDeck}
                        >
                            {savingDeck ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Normal mode UI
    return (
        <div className="min-h-[100dvh] max-w-6xl mx-auto px-4 py-8">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-6">
                <Link href="/">
                    <Button variant="outline">← Back</Button>
                </Link>
                <div className="flex items-center gap-3">
                    <LanguageDropdown
                        onLanguageChange={(lang) => {
                            handleLanguageChange(lang)
                            fetchWords()
                            fetchDecks()
                        }}
                    />
                    <Link href="/app/add">
                        <Button variant="primary">Add a Word</Button>
                    </Link>
                </div>
            </div>

            {/* YOUR DECKS Section */}
            <div className="mb-8">
                <h2 className="text-sm font-normal mb-4 uppercase tracking-wide text-muted-foreground">
                    YOUR DECKS
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allDecks.map((deck) => (
                        <Card
                            key={deck.name}
                            className="p-4 hover:border-primary transition-colors relative"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-base font-semibold">
                                            {deck.name}
                                        </h3>
                                        {deck.name === FAVORITE_DECK_NAME && (
                                            <span className="text-sm">⭐</span>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground mb-2">
                                        {deck.learnedCount || 0}/
                                        {deck.totalCount} words
                                    </div>
                                    {/* Progress bar */}
                                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-primary h-full transition-all"
                                            style={{
                                                width: `${
                                                    deck.totalCount > 0
                                                        ? (deck.learnedCount /
                                                              deck.totalCount) *
                                                          100
                                                        : 0
                                                }%`,
                                            }}
                                        />
                                    </div>
                                </div>
                                {/* Deck menu button */}
                                {deck.name !== FAVORITE_DECK_NAME && (
                                    <div className="relative z-10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setShowDeckMenu(
                                                    showDeckMenu === deck.name
                                                        ? null
                                                        : deck.name,
                                                )
                                            }}
                                            className="px-2 py-1 text-muted-foreground hover:text-foreground"
                                            aria-label="Deck menu"
                                        >
                                            <span className="text-lg leading-none">
                                                ⋯
                                            </span>
                                        </button>
                                        {showDeckMenu === deck.name && (
                                            <div
                                                className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[160px]"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleEditDeck(
                                                            deck.name,
                                                        )
                                                    }}
                                                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors"
                                                >
                                                    Edit words in deck
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleRefreshDeck(
                                                            deck.name,
                                                        )
                                                    }}
                                                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors"
                                                >
                                                    Refresh stats
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDeleteDeck(
                                                            deck.name,
                                                        )
                                                    }}
                                                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors text-error"
                                                >
                                                    Delete deck
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {/* Click to navigate to deck */}
                            <Link
                                href={`/app/decks/${encodeURIComponent(
                                    deck.name,
                                )}`}
                                className="absolute inset-0 z-0"
                                aria-label={`Study ${deck.name} deck`}
                            />
                        </Card>
                    ))}
                </div>
            </div>

            {/* Search + Filters */}
            <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                {/* Left group: Add filters button + filter chips */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Add Filters Button */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setShowAddFiltersDropdown(!showAddFiltersDropdown)
                                setActiveFilterDropdown(null)
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm hover:bg-muted transition-colors"
                        >
                            <span className="text-base leading-none">+</span>
                            <span>Add filters</span>
                        </button>
                        {showAddFiltersDropdown && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[140px]"
                            >
                                {typoFilter === 'All' && (
                                    <button
                                        onClick={() => {
                                            setShowAddFiltersDropdown(false)
                                            setActiveFilterDropdown('type')
                                            setTypoFilter('Verbo')
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                    >
                                        Type
                                    </button>
                                )}
                                {learnedFilter === 'All' && (
                                    <button
                                        onClick={() => {
                                            setShowAddFiltersDropdown(false)
                                            setActiveFilterDropdown('learned')
                                            setLearnedFilter('Not learned')
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                    >
                                        Status
                                    </button>
                                )}
                                {dateSort === 'newest' && (
                                    <button
                                        onClick={() => {
                                            setShowAddFiltersDropdown(false)
                                            setActiveFilterDropdown('sort')
                                            setDateSort('oldest')
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                    >
                                        Date added
                                    </button>
                                )}
                                {typoFilter !== 'All' &&
                                    learnedFilter !== 'All' &&
                                    dateSort !== 'newest' && (
                                        <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                                            All filters added
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>

                    {/* Active Filter Chips */}
                    {typoFilter !== 'All' && (
                        <div className="relative group">
                            <div
                                onClick={() => {
                                    setActiveFilterDropdown(
                                        activeFilterDropdown === 'type'
                                            ? null
                                            : 'type',
                                    )
                                    setShowAddFiltersDropdown(false)
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm cursor-pointer hover:bg-blue-100 transition-colors"
                            >
                                <span className="text-blue-700">Type: {typoFilter}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setTypoFilter('All')
                                        setActiveFilterDropdown(null)
                                    }}
                                    className="ml-1 text-blue-600 hover:text-blue-800 text-base leading-none"
                                >
                                    ×
                                </button>
                            </div>
                        {activeFilterDropdown === 'type' && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[140px]"
                            >
                                <button
                                    onClick={() => {
                                        setTypoFilter('All')
                                        setActiveFilterDropdown(null)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => {
                                        setTypoFilter('Verbo')
                                        setActiveFilterDropdown(null)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                >
                                    Verbo
                                </button>
                                <button
                                    onClick={() => {
                                        setTypoFilter('substantivo')
                                        setActiveFilterDropdown(null)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                >
                                    Substantivo
                                </button>
                                <button
                                    onClick={() => {
                                        setTypoFilter('Adjetivo')
                                        setActiveFilterDropdown(null)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                >
                                    Adjetivo
                                </button>
                            </div>
                        )}
                    </div>
                )}
                    {learnedFilter !== 'All' && (
                        <div className="relative group">
                            <div
                                onClick={() => {
                                    setActiveFilterDropdown(
                                        activeFilterDropdown === 'learned'
                                            ? null
                                            : 'learned',
                                    )
                                    setShowAddFiltersDropdown(false)
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm cursor-pointer hover:bg-blue-100 transition-colors"
                            >
                                <span className="text-blue-700">Status: {learnedFilter}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setLearnedFilter('All')
                                        setActiveFilterDropdown(null)
                                    }}
                                    className="ml-1 text-blue-600 hover:text-blue-800 text-base leading-none"
                                >
                                    ×
                                </button>
                            </div>
                        {activeFilterDropdown === 'learned' && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[140px]"
                            >
                                <button
                                    onClick={() => {
                                        setLearnedFilter('All')
                                        setActiveFilterDropdown(null)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => {
                                        setLearnedFilter('Learned')
                                        setActiveFilterDropdown(null)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                >
                                    Learned
                                </button>
                                <button
                                    onClick={() => {
                                        setLearnedFilter('Not learned')
                                        setActiveFilterDropdown(null)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                >
                                    Not learned
                                </button>
                            </div>
                        )}
                    </div>
                    )}
                    {dateSort !== 'newest' && (
                        <div className="relative group">
                            <div
                                onClick={() => {
                                    setActiveFilterDropdown(
                                        activeFilterDropdown === 'sort'
                                            ? null
                                            : 'sort',
                                    )
                                    setShowAddFiltersDropdown(false)
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm cursor-pointer hover:bg-blue-100 transition-colors"
                            >
                                <span className="text-blue-700">Sort: {dateSort === 'oldest' ? 'Oldest' : 'Newest'}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setDateSort('newest')
                                        setActiveFilterDropdown(null)
                                    }}
                                    className="ml-1 text-blue-600 hover:text-blue-800 text-base leading-none"
                                >
                                    ×
                                </button>
                            </div>
                        {activeFilterDropdown === 'sort' && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[140px]"
                            >
                                <button
                                    onClick={() => {
                                        setDateSort('newest')
                                        setActiveFilterDropdown(null)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                >
                                    Newest
                                </button>
                                <button
                                    onClick={() => {
                                        setDateSort('oldest')
                                        setActiveFilterDropdown(null)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                >
                                    Oldest
                                </button>
                            </div>
                        )}
                        </div>
                    )}
                </div>

                {/* Right group: Search input */}
                <div className="relative max-w-[200px] group focus-within:max-w-[400px] transition-all duration-200 ml-auto">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search words"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-100 text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-slate-200 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                </div>

                {deckFilter && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            Deck: {deckFilter}
                        </span>
                        <button
                            onClick={() => setDeckFilter(null)}
                            className="text-sm text-error hover:underline"
                        >
                            Clear
                        </button>
                    </div>
                )}
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
                    {search || typoFilter !== 'All' || learnedFilter !== 'All'
                        ? 'No words found matching your filters'
                        : 'No words yet. Add your first word!'}
                </Card>
            )}

            {!loading && !error && filteredWords.length > 0 && (
                <div className="bg-card border border-border rounded-lg overflow-hidden mb-20">
                    <table className="w-full">
                        <thead className="bg-muted border-b border-border">
                            <tr>
                                <th className="px-4 py-3 text-left w-12">
                                    <div className="flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedWords.size ===
                                                    filteredWords.length &&
                                                filteredWords.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="w-4 h-4"
                                        />
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide cursor-pointer hover:bg-muted/80"
                                    onClick={() => handleSort('word')}
                                >
                                    <div className="flex items-center gap-2">
                                        WORD
                                        {sortColumn === 'word' && (
                                            <span className="text-xs">
                                                {sortDirection === 'asc'
                                                    ? '↑'
                                                    : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide cursor-pointer hover:bg-muted/80"
                                    onClick={() => handleSort('translation')}
                                >
                                    <div className="flex items-center gap-2">
                                        TRANSLATION
                                        {sortColumn === 'translation' && (
                                            <span className="text-xs">
                                                {sortDirection === 'asc'
                                                    ? '↑'
                                                    : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide cursor-pointer hover:bg-muted/80"
                                    onClick={() => handleSort('typo')}
                                >
                                    <div className="flex items-center gap-2">
                                        TYPE
                                        {sortColumn === 'typo' && (
                                            <span className="text-xs">
                                                {sortDirection === 'asc'
                                                    ? '↑'
                                                    : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide w-24">
                                    Learned
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWords.map((word) => (
                                <tr
                                    key={word.id}
                                    className="border-b border-border hover:bg-muted/50 transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedWords.has(
                                                    word.id,
                                                )}
                                                onChange={() =>
                                                    handleSelectWord(word.id)
                                                }
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                                className="w-4 h-4"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/app/words/${word.id}`}
                                            className="font-semibold hover:text-primary transition-colors"
                                        >
                                            {word.word}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground leading-normal">
                                        {word.translation || 'No translation'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Tag
                                            variant={getTypeVariant(word.typo)}
                                        >
                                            {word.typo}
                                        </Tag>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end">
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
                                                className="w-4 h-4"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Bottom Selection Bar */}
            {selectedWords.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg px-4 py-3 z-50">
                    <div className="max-w-6xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm">
                                <span>
                                    Selected {selectedWords.size} word(s)
                                </span>
                                <button
                                    onClick={() => setSelectedWords(new Set())}
                                    className="ml-2 hover:text-error transition-colors"
                                    aria-label="Clear selection"
                                >
                                    ×
                                </button>
                            </div>
                            <button
                                onClick={handleDeleteWords}
                                className="flex items-center gap-2 px-3 py-1 text-sm text-error hover:bg-error-background rounded-md transition-colors"
                                aria-label="Delete selected words"
                            >
                                <span>🗑️</span>
                                <span>Delete</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowDeckDialog(true)}
                            >
                                Create
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleStartTraining}
                            >
                                Start
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
