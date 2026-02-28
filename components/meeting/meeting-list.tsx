'use client'

import type { Meeting } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Clock, Users, FileText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MeetingListProps {
  meetings: Meeting[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function MeetingList({ meetings, selectedId, onSelect, onDelete }: MeetingListProps) {
  const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs} сек`
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return s > 0 ? `${m} мин ${s} сек` : `${m} мин`
  }

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <FileText className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Встреч пока нет</p>
        <p className="mt-1 text-xs text-muted-foreground/60">Создайте первую запись выше</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {meetings.map((meeting) => (
        <div
          key={meeting.id}
          onClick={() => onSelect(meeting.id)}
          className={`group relative flex w-full cursor-pointer flex-col gap-2 overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md ${
            selectedId === meeting.id
              ? 'border-primary/25 bg-primary/5 shadow-lg shadow-primary/5'
              : 'border-border/40 bg-card/60 hover:border-primary/20 hover:bg-card'
          }`}
        >
          {/* Top accent on selected */}
          {selectedId === meeting.id && (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          )}

          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{meeting.title}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(meeting.id)
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(meeting.date), {
                addSuffix: true,
                locale: ru,
              })}
            </span>
            {meeting.duration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(meeting.duration)}
              </span>
            )}
            {meeting.participants.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {meeting.participants.length}
              </span>
            )}
          </div>

          {meeting.transcript && (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/70">
              {meeting.transcript.slice(0, 120)}...
            </p>
          )}

          {meeting.summary && (
            <span className="mt-1 inline-flex w-fit items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              ИИ-резюме
            </span>
          )}
        </div>
      ))}
    </div>
  )
}