'use client'

import { useState } from 'react'
import {
  Sparkles,
  Loader2,
  CheckCircle,
  ListChecks,
  MessageSquare,
  BarChart3,
  Target,
  Users,
  ArrowRight,
} from 'lucide-react'
import type { AISummary, ProfessionalAISummary } from '@/lib/types'
import { isProfessionalSummary } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface AISummarySectionProps {
  transcript: string
  summary: AISummary | undefined
  onSummaryGenerated: (summary: AISummary) => void
}

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
}

export function AISummarySection({
  transcript,
  summary,
  onSummaryGenerated,
}: AISummarySectionProps) {
  const [isLoading, setIsLoading] = useState(false)

  const generateSummary = async () => {
    if (!transcript.trim()) {
      toast.error('Транскрипт пуст')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Ошибка запроса')
      }

      const data = await res.json()
      onSummaryGenerated(data)
      toast.success('Резюме сгенерировано')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка генерации')
    } finally {
      setIsLoading(false)
    }
  }

  if (!summary) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            ИИ-Резюме
          </h3>
        </div>
        <Button
          onClick={generateSummary}
          disabled={isLoading || !transcript.trim()}
          variant="outline"
          className="gap-2 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isLoading ? 'Генерация...' : 'Сгенерировать резюме'}
        </Button>
      </div>
    )
  }

  // Professional summary format
  if (isProfessionalSummary(summary)) {
    const prof = summary as ProfessionalAISummary
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            ИИ-Резюме
          </h3>
          <Button
            onClick={generateSummary}
            disabled={isLoading}
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Обновить
          </Button>
        </div>

        <div className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          {/* Executive Summary */}
          <div className="futuristic-card relative overflow-hidden rounded-xl p-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
              <MessageSquare className="h-3.5 w-3.5" />
              Резюме
            </div>
            <p className="text-sm leading-relaxed text-foreground">{prof.executiveSummary}</p>
          </div>

          {/* Key Decisions */}
          {(prof.keyDecisions?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-border/40 bg-card/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-chart-2">
                <CheckCircle className="h-3.5 w-3.5" />
                Ключевые решения
              </div>
              <ul className="flex flex-col gap-2">
                {(prof.keyDecisions || []).map((d, i) => {
                  const decision = typeof d === 'string' ? d : (d as { decision?: string; owner?: string }).decision
                  const owner = typeof d === 'object' && d && 'owner' in d ? (d as { owner?: string }).owner : null
                  return (
                    <li key={i} className="flex flex-col gap-0.5 text-sm text-foreground/80">
                      <span className="leading-relaxed">{decision || String(d)}</span>
                      {owner && (
                        <span className="text-xs text-muted-foreground">Ответственный: {owner}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Action Items */}
          {(prof.actionItems?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-border/40 bg-card/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-chart-3">
                <ListChecks className="h-3.5 w-3.5" />
                Задачи
              </div>
              <ul className="flex flex-col gap-2">
                {(prof.actionItems || []).map((item, i) => {
                  const it = typeof item === 'object' && item ? item : { task: String(item), assignee: null, deadline: null, priority: null }
                  return (
                  <li
                    key={i}
                    className="flex flex-col gap-1 rounded-lg border border-border/30 bg-background/50 p-3 text-sm"
                  >
                    <span className="leading-relaxed text-foreground">{it.task}</span>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {it.assignee && <span>Ответственный: {it.assignee}</span>}
                      {it.deadline && <span>Срок: {it.deadline}</span>}
                      {it.priority && (
                        <span
                          className={`rounded px-1.5 py-0.5 ${
                            it.priority === 'high'
                              ? 'bg-destructive/20 text-destructive'
                              : it.priority === 'medium'
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                : 'bg-secondary'
                          }`}
                        >
                          {PRIORITY_LABELS[it.priority as string] || it.priority}
                        </span>
                      )}
                    </div>
                  </li>
                )
                })}
              </ul>
            </div>
          )}

          {/* Discussion Topics */}
          {(prof.discussionTopics?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-border/40 bg-card/80 p-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-chart-5">
                Темы обсуждения
              </div>
              <div className="flex flex-col gap-2">
                {(prof.discussionTopics || []).map((t, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-0.5 rounded-lg border border-border/30 bg-background/50 p-3 text-sm"
                  >
                    <span className="font-medium text-foreground">{t.topic}</span>
                    <span className="text-muted-foreground">{t.summary}</span>
                    {t.duration && (
                      <span className="text-xs text-muted-foreground">~{t.duration}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participants (inferred) */}
          {(prof.participants?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-border/40 bg-card/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                <Users className="h-3.5 w-3.5" />
                Участники
              </div>
              <div className="flex flex-wrap gap-2">
                {(prof.participants || []).map((p, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-border/50 bg-secondary/50 px-3 py-1 text-xs"
                  >
                    {p.name}
                    {p.role && <span className="text-muted-foreground"> — {p.role}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meeting Effectiveness */}
          {prof.meetingEffectiveness && (
            <div className="rounded-xl border border-border/40 bg-card/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-chart-4">
                <Target className="h-3.5 w-3.5" />
                Эффективность встречи: {prof.meetingEffectiveness.score}/10
              </div>
              <p className="text-sm text-foreground/80">{prof.meetingEffectiveness.explanation}</p>
            </div>
          )}

          {/* Next Steps & Follow-up */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {(prof.nextSteps?.length ?? 0) > 0 && (
              <div className="flex-1 rounded-xl border border-border/40 bg-card/80 p-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Следующие шаги
                </div>
                <ul className="flex flex-col gap-1">
                  {(prof.nextSteps || []).map((s, i) => (
                    <li key={i} className="text-sm text-foreground/80">
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {prof.followUpRequired !== undefined && (
              <div className="rounded-xl border border-border/40 bg-card/80 p-4 sm:w-48">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider">
                  Требуется продолжение
                </div>
                <p className="text-sm text-foreground/80">
                  {prof.followUpRequired ? 'Да' : 'Нет'}
                </p>
              </div>
            )}
          </div>

          {/* Sentiment */}
          {prof.sentiment && (
            <div className="rounded-xl border border-border/40 bg-card/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-chart-4">
                <BarChart3 className="h-3.5 w-3.5" />
                Настроение: {prof.sentiment.overall}
              </div>
              <p className="text-sm text-foreground/80">{prof.sentiment.explanation}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Legacy summary format
  const leg = summary
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          ИИ-Резюме
        </h3>
        <Button
          onClick={generateSummary}
          disabled={isLoading}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground"
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Обновить
        </Button>
      </div>
      <div className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <div className="futuristic-card relative overflow-hidden rounded-xl p-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
            <MessageSquare className="h-3.5 w-3.5" />
            Краткое резюме
          </div>
          <p className="text-sm leading-relaxed text-foreground">{leg.shortSummary}</p>
        </div>
        {leg.keyDecisions?.length > 0 && (
          <div className="rounded-xl border border-border/40 bg-card/80 p-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-chart-2">
              <CheckCircle className="h-3.5 w-3.5" />
              Ключевые решения
            </div>
            <ul className="flex flex-col gap-1.5">
              {leg.keyDecisions.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/80">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-2" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}
        {leg.actionItems?.length > 0 && (
          <div className="rounded-xl border border-border/40 bg-card/80 p-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-chart-3">
              <ListChecks className="h-3.5 w-3.5" />
              Задачи
            </div>
            <ul className="flex flex-col gap-2">
              {leg.actionItems.map((item, i) => (
                <li key={i} className="flex items-start justify-between gap-2 text-sm text-foreground/80">
                  <span className="leading-relaxed">{item.task}</span>
                  {item.assignee && (
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {item.assignee}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          {leg.topics?.length > 0 && (
            <div className="flex-1 rounded-xl border border-border/40 bg-card/80 p-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-chart-5">
                Темы
              </div>
              <div className="flex flex-wrap gap-1.5">
                {leg.topics.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground/80"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {leg.sentiment && (
            <div className="rounded-xl border border-border/40 bg-card/80 p-4 sm:w-40">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-chart-4">
                <BarChart3 className="h-3.5 w-3.5" />
                Настроение
              </div>
              <p className="text-sm text-foreground/80">{leg.sentiment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
