'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/app/ui/Button'
import { Card } from '@/app/ui/Card'
import { apiFetch } from '@/lib/client'
import {
    getLearningLanguageClient,
    type LearningLanguage,
} from '@/lib/learning-language'
import { useRouter } from 'next/navigation'

export default function AddWordPage() {
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)
    const [word, setWord] = useState('')
    const [learningLanguage, setLearningLanguage] = useState<LearningLanguage>(
        getLearningLanguageClient(),
    )
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<{
        status: 'added' | 'exists' | 'updated'
        message: string
        key: string
        finalWord: string
        lang: 'pt' | 'en'
        pos: 'verb' | 'noun' | 'adjective' | 'other'
        pageId: string
        translation?: string
        typo?: string
    } | null>(null)

    // Check learning language on mount
    useEffect(() => {
        const lang = getLearningLanguageClient()
        if (!lang) {
            // If no language selected, redirect to landing page
            router.push('/')
            return
        }
        setLearningLanguage(lang)
    }, [router])

    const handleSubmit = async () => {
        if (!word.trim() || loading) return

        setLoading(true)
        setError('')
        setResult(null)

        const currentLang = getLearningLanguageClient()
        if (!currentLang) {
            setError('Please select a learning language first')
            setLoading(false)
            return
        }

        try {
            const data = await apiFetch<{
                status: 'added' | 'exists' | 'updated'
                message: string
                key: string
                finalWord: string
                lang: 'pt' | 'en'
                pos: 'verb' | 'noun' | 'adjective' | 'other'
                pageId: string
                translation?: string
                typo?: string
            }>('/api/add-word', {
                method: 'POST',
                body: JSON.stringify({
                    word,
                    learningLanguage: currentLang,
                }),
            })

            // Fetch the word details to get translation and type
            try {
                const wordDetails = await apiFetch<{
                    word: string
                    translation: string
                    typo: string
                }>(`/api/words/${data.pageId}`)

                setResult({
                    ...data,
                    translation: wordDetails.translation || '',
                    typo: wordDetails.typo || '',
                })
            } catch {
                // If fetching details fails, still show success without translation
                setResult({
                    ...data,
                    translation: '',
                    typo: '',
                })
            }
            
            // Clear input and refocus
            setWord('')
            setTimeout(() => {
                inputRef.current?.focus()
            }, 100)
        } catch (err: any) {
            setError(err.message || 'An error occurred')
            // Keep input value on error
        } finally {
            setLoading(false)
        }
    }

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    return (
        <div className="min-h-[100dvh] flex flex-col">
            {/* Back Button - Fixed at top */}
            <div className="px-4 pt-4 pb-2">
                <Link href="/app/words" className="inline-block">
                    <Button variant="outline" className="px-3 py-2">
                        ←
                    </Button>
                </Link>
            </div>

            {/* Centered Content Area */}
            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-2xl">
                    {/* Hero Input */}
                    <div className="mb-6">
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={word}
                                onChange={(e) => {
                                    setWord(e.target.value)
                                    setError('')
                                    setResult(null)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && word.trim() && !loading) {
                                        e.preventDefault()
                                        handleSubmit()
                                    }
                                }}
                                disabled={loading}
                                placeholder="New Word"
                                className="w-full text-2xl md:text-3xl font-medium text-foreground bg-transparent border-0 border-b-2 border-primary pb-2 focus:outline-none focus:border-primary/80 placeholder:text-muted-foreground disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* Add Word Button - shown only when input has text */}
                    {word.trim() && (
                        <div className="mb-6">
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || !word.trim()}
                                variant="primary"
                                className="w-full py-3 text-base font-medium flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>+</span>
                                        <span>Add Word</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Result Panel */}
                    {(result || error) && (
                        <div className="mb-6">
                            {result && result.status !== 'exists' && (
                                <Card className="bg-success-background border-success-border border-2 rounded-lg p-4 md:p-6">
                                    <h3 className="text-lg md:text-xl font-bold text-success-text mb-4">
                                        Word Successfully Added
                                    </h3>
                                    <div className="space-y-2 text-base md:text-lg text-success-text">
                                        <p className="font-medium">{result.finalWord}</p>
                                        {result.translation && (
                                            <p className="text-success-text/90">
                                                {result.translation}
                                            </p>
                                        )}
                                        {result.typo && (
                                            <p className="text-success-text/80 text-sm md:text-base capitalize">
                                                {result.typo}
                                            </p>
                                        )}
                                    </div>
                                </Card>
                            )}
                            {error && (
                                <Card className="bg-error-background border-error-border border-2 rounded-lg p-4 md:p-6">
                                    <p className="text-base md:text-lg text-error-text font-medium">
                                        {error}
                                    </p>
                                </Card>
                            )}
                            {result && result.status === 'exists' && (
                                <Card className="bg-muted border-border rounded-lg p-4 md:p-6">
                                    <p className="text-base md:text-lg text-foreground">
                                        {result.message}
                                    </p>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
