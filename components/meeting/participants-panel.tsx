'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { Participant } from '@/lib/types'
import { PARTICIPANT_COLORS } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface ParticipantsPanelProps {
  participants: Participant[]
  onChange: (participants: Participant[]) => void
}

export function ParticipantsPanel({ participants, onChange }: ParticipantsPanelProps) {
  const [newName, setNewName] = useState('')

  const addParticipant = () => {
    if (!newName.trim()) return
    const color = PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length]
    const participant: Participant = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      color,
    }
    onChange([...participants, participant])
    setNewName('')
  }

  const removeParticipant = (id: string) => {
    onChange(participants.filter((p) => p.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Участники
      </h3>

      <div className="flex flex-wrap gap-2">
        {participants.map((p) => (
          <div
            key={p.id}
            className="group flex items-center gap-2 rounded-full border border-border/50 bg-secondary/50 py-1 pl-1 pr-3 transition-colors hover:border-border"
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-background"
              style={{ backgroundColor: p.color }}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-foreground">{p.name}</span>
            <button
              onClick={() => removeParticipant(p.id)}
              className="ml-1 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={`Удалить ${p.name}`}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Имя участника..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addParticipant()
          }}
          className="h-8 bg-secondary/30 text-xs"
        />
        <Button
          onClick={addParticipant}
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1 px-3"
          disabled={!newName.trim()}
        >
          <Plus className="h-3 w-3" />
          <span className="sr-only sm:not-sr-only">Добавить</span>
        </Button>
      </div>
    </div>
  )
}
