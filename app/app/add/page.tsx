'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/app/ui/PageHeader'
import { Input } from '@/app/ui/Input'
import { Button } from '@/app/ui/Button'
import { Card } from '@/app/ui/Card'
import { apiFetch } from '@/lib/client'

export default function AddWordPage() {
    const [word, setWord] = useState('')
    const [targetLanguage, setTargetLanguage] = useState<'pt' | 'en'>('pt')
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
    } | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setResult(null)

        try {
            const data = await apiFetch<{
                status: 'added' | 'exists' | 'updated'
                message: string
                key: string
                finalWord: string
                lang: 'pt' | 'en'
                pos: 'verb' | 'noun' | 'adjective' | 'other'
                pageId: string
            }>('/api/add-word', {
                method: 'POST',
                body: JSON.stringify({
                    word,
                    targetLanguage,
                }),
            })

            setResult(data)
            setWord('')
            setTargetLanguage('pt')
        } catch (err: any) {
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-foreground">Add Word</h1>
                <Link href="/app/words">
                    <Button variant="outline">View Words</Button>
                </Link>
            </div>

            <Card className="mb-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Word"
                        value={word}
                        onChange={(e) => setWord(e.target.value)}
                        required
                        disabled={loading}
                        placeholder="Enter a word or phrase"
                    />

                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">
                            Target Language{' '}
                            <span className="text-error">*</span>
                        </label>
                        <select
                            value={targetLanguage}
                            onChange={(e) =>
                                setTargetLanguage(e.target.value as 'pt' | 'en')
                            }
                            className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            disabled={loading}
                            required
                        >
                            <option value="pt">Portuguese (pt)</option>
                            <option value="en">English (en)</option>
                        </select>
                    </div>

                    {error && (
                        <div className="p-3 bg-error-background border border-error-border rounded-md text-error-text text-sm">
                            {error}
                        </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? 'Processing...' : 'Add Word'}
                    </Button>
                </form>
            </Card>

            {result && (
                <Card
                    className={
                        result.status === 'exists'
                            ? 'bg-muted border-border'
                            : result.status === 'updated'
                            ? 'bg-success-background border-success-border'
                            : 'bg-success-background border-success-border'
                    }
                >
                    <h3
                        className={`font-semibold mb-2 ${
                            result.status === 'exists'
                                ? 'text-foreground'
                                : 'text-success-text'
                        }`}
                    >
                        {result.message}
                    </h3>
                    <div
                        className={`space-y-1 text-sm ${
                            result.status === 'exists'
                                ? 'text-muted-foreground'
                                : 'text-success-text'
                        }`}
                    >
                        <p>
                            <strong>Word:</strong> {result.finalWord}
                        </p>
                        <p>
                            <strong>Language:</strong>{' '}
                            {result.lang.toUpperCase()}
                        </p>
                        <p>
                            <strong>Part of Speech:</strong> {result.pos}
                        </p>
                    </div>
                </Card>
            )}
        </div>
    )
}
