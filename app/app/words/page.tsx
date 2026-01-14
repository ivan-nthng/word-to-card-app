'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/app/ui/PageHeader'
import { Input } from '@/app/ui/Input'
import { Card } from '@/app/ui/Card'
import { Tag } from '@/app/ui/Tag'
import { NotionWord } from '@/lib/types'

export default function WordsPage() {
  const [words, setWords] = useState<NotionWord[]>([])
  const [filteredWords, setFilteredWords] = useState<NotionWord[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchWords()
  }, [])

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredWords(words)
    } else {
      const query = search.toLowerCase()
      setFilteredWords(
        words.filter(
          (w) =>
            w.word.toLowerCase().includes(query) ||
            w.translation.toLowerCase().includes(query)
        )
      )
    }
  }, [search, words])

  const fetchWords = async () => {
    try {
      const response = await fetch('/api/words')
      if (!response.ok) {
        throw new Error('Failed to fetch words')
      }
      const data = await response.json()
      console.log('[WordsPage] Fetched words:', data.length)
      setWords(data)
      setFilteredWords(data)
    } catch (err: any) {
      console.error('[WordsPage] Error fetching words:', err)
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getLanguageTag = (lang: string) => {
    return lang === 'Portuguese' ? 'PT' : 'EN'
  }

  const getTypoColor = (typo: string) => {
    if (typo === 'Verbo') return 'primary'
    if (typo === 'substantivo') return 'secondary'
    return 'default'
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <PageHeader 
        title="Words" 
        actions={
          <Link href="/app/add">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-blue-600 transition-colors">
              Add Word
            </button>
          </Link>
        }
      />

      <div className="mb-6">
        <Input
          placeholder="Search words or translations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      )}

      {error && (
        <Card className="bg-red-50 border-red-200 text-red-800">
          {error}
        </Card>
      )}

      {!loading && !error && filteredWords.length === 0 && (
        <Card className="text-center py-8 text-muted-foreground">
          {search ? 'No words found matching your search' : 'No words yet. Add your first word!'}
        </Card>
      )}

      {!loading && !error && filteredWords.length > 0 && (
        <div className="space-y-3">
          {filteredWords.map((word) => (
            <Link key={word.id} href={`/app/words/${word.id}`}>
              <Card className="hover:border-primary transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-2">{word.word}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {word.translation || 'No translation'}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Tag variant="default">{getLanguageTag(word.language)}</Tag>
                    <Tag variant={getTypoColor(word.typo) as any}>{word.typo}</Tag>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
