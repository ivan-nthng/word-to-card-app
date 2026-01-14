'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/app/ui/PageHeader'
import { Card } from '@/app/ui/Card'
import { Tag } from '@/app/ui/Tag'
import { NotionWord } from '@/lib/types'

export default function WordDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [word, setWord] = useState<NotionWord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchWord()
  }, [id])

  const fetchWord = async () => {
    try {
      const response = await fetch(`/api/words/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch word')
      }
      const data = await response.json()
      setWord(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const isPortugueseVerb = word?.language === 'Portuguese' && word?.typo === 'Verbo'
  const hasVerbForms = isPortugueseVerb && (word.voce || word.eleEla || word.elesElas || word.nos)

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <PageHeader title="Word Details" backHref="/app/words" />
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !word) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <PageHeader title="Word Details" backHref="/app/words" />
        <Card className="bg-red-50 border-red-200 text-red-800">
          {error || 'Word not found'}
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PageHeader title="Word Details" backHref="/app/words" />

      <Card className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold">{word.word}</h1>
          <div className="flex gap-2 flex-shrink-0">
            <Tag variant="default">
              {word.language === 'Portuguese' ? 'PT' : 'EN'}
            </Tag>
            <Tag variant={word.typo === 'Verbo' ? 'primary' : word.typo === 'substantivo' ? 'secondary' : 'default'}>
              {word.typo}
            </Tag>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Translation</h3>
            <p className="text-foreground">{word.translation || 'No translation'}</p>
          </div>

          {word.context && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Context</h3>
              <p className="text-foreground">{word.context}</p>
            </div>
          )}

          {hasVerbForms && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Presente</h3>
              <div className="bg-muted rounded-md p-3">
                <table className="w-full">
                  <tbody className="space-y-2">
                    {word.voce && (
                      <tr>
                        <td className="text-sm font-medium text-muted-foreground pr-4 py-1">Você</td>
                        <td className="text-foreground">{word.voce}</td>
                      </tr>
                    )}
                    {word.eleEla && (
                      <tr>
                        <td className="text-sm font-medium text-muted-foreground pr-4 py-1">ele/ela</td>
                        <td className="text-foreground">{word.eleEla}</td>
                      </tr>
                    )}
                    {word.elesElas && (
                      <tr>
                        <td className="text-sm font-medium text-muted-foreground pr-4 py-1">eles/elas</td>
                        <td className="text-foreground">{word.elesElas}</td>
                      </tr>
                    )}
                    {word.nos && (
                      <tr>
                        <td className="text-sm font-medium text-muted-foreground pr-4 py-1">nós</td>
                        <td className="text-foreground">{word.nos}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Key:</strong> {word.key}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
