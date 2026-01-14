'use client'

import { useState } from 'react'
import { PageHeader } from '@/app/ui/PageHeader'
import { Input } from '@/app/ui/Input'
import { Button } from '@/app/ui/Button'
import { Card } from '@/app/ui/Card'

export default function AddWordPage() {
    const [word, setWord] = useState('')
    const [targetLanguage, setTargetLanguage] = useState<'pt' | 'en'>('pt')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<{
        status: 'created' | 'updated'
        key: string
        finalWord: string
        lang: 'pt' | 'en'
        pos: 'verb' | 'noun' | 'adjective' | 'other'
    } | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setResult(null)

        try {
            const response = await fetch('/api/add-word', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    word,
                    targetLanguage,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to add word')
            }

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
            <PageHeader title="Add Word" />

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
                            <span className="text-red-500">*</span>
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
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                            {error}
                        </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? 'Processing...' : 'Add Word'}
                    </Button>
                </form>
            </Card>

            {result && (
                <Card className="bg-green-50 border-green-200">
                    <h3 className="font-semibold text-green-900 mb-2">
                        Word{' '}
                        {result.status === 'created' ? 'Created' : 'Updated'}{' '}
                        Successfully
                    </h3>
                    <div className="space-y-1 text-sm text-green-800">
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
                        <p>
                            <strong>Key:</strong> {result.key}
                        </p>
                    </div>
                </Card>
            )}
        </div>
    )
}
