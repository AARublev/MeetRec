'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileText, Volume2, ArrowLeft, Pencil, Check, Mic, Loader2, Users } from 'lucide-react'
import type { Meeting, AISummary, Participant } from '@/lib/types'
import { PARTICIPANT_COLORS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ParticipantsPanel } from './participants-panel'
import { AISummarySection } from './ai-summary-section'
import { toast } from 'sonner'

interface MeetingDetailProps {
  meeting: Meeting
  onUpdate: (meeting: Meeting) => void
  onBack: () => void
  /** When true, auto-run speaker detection and summary after text input */
  autoProcess?: boolean
}

export function MeetingDetail({ meeting, onUpdate, onBack, autoProcess }: MeetingDetailProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [title, setTitle] = useState(meeting.title)
  const [transcript, setTranscript] = useState(meeting.transcript)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isDetectingSpeakers, setIsDetectingSpeakers] = useState(false)
  const [speakerNamingOpen, setSpeakerNamingOpen] = useState(false)
  const [speakerLabels, setSpeakerLabels] = useState<string[]>([])
  const [speakerNames, setSpeakerNames] = useState<Record<number, string>>({})
  const autoProcessDoneRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    setTitle(meeting.title)
    setTranscript(meeting.transcript)
  }, [meeting.id, meeting.title, meeting.transcript])

  // Auto-process for text/TXT input: speaker detection + summary
  useEffect(() => {
    if (!autoProcess || autoProcessDoneRef.current || !meeting.transcript.trim()) return
    if (meeting.participants.length > 0 && meeting.summary) {
      autoProcessDoneRef.current = true
      return
    }

    const runAutoProcess = async () => {
      autoProcessDoneRef.current = true

      // Run speaker detection if no participants
      if (meeting.participants.length === 0) {
        setIsDetectingSpeakers(true)
        try {
          const res = await fetch('/api/detect-speakers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: meeting.transcript }),
          })
          if (res.ok) {
            const { speakerCount, speakerLabels: labels } = await res.json()
            const labelsArr = Array.isArray(labels) ? labels : Array.from({ length: speakerCount }, (_, i) => `Speaker ${i + 1}`)
            setSpeakerLabels(labelsArr)
            setSpeakerNames(Object.fromEntries(labelsArr.map((_, i) => [i, ''])))
            setSpeakerNamingOpen(true)
          }
        } catch {
          toast.error('Ошибка определения спикеров')
        } finally {
          setIsDetectingSpeakers(false)
        }
      }

      // Run summary generation if no summary
      if (!meeting.summary) {
        try {
          const res = await fetch('/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: meeting.transcript }),
          })
          if (res.ok) {
            const summary = await res.json()
            onUpdate({ ...meeting, summary })
            toast.success('Резюме сгенерировано')
          }
        } catch {
          toast.error('Ошибка генерации резюме')
        }
      }
    }

    runAutoProcess()
  }, [autoProcess, meeting.id, meeting.transcript, meeting.participants.length, meeting.summary, onUpdate])

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const autoDetectParticipants = (text: string): Participant[] => {
    const existing = meeting.participants.map((p) => p.name.toLowerCase())
    const patterns = [
      /^([А-ЯЁA-Z][а-яёa-zA-Z]+)\s*:/gm,
      /^(Speaker\s*\d+)\s*:/gim,
      /^(Спикер\s*\d+)\s*:/gim,
    ]

    const names = new Set<string>()
    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim()
        if (!existing.includes(name.toLowerCase())) {
          names.add(name)
        }
      }
    }

    const newParticipants: Participant[] = Array.from(names).map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      color: PARTICIPANT_COLORS[(meeting.participants.length + i) % PARTICIPANT_COLORS.length],
    }))

    return [...meeting.participants, ...newParticipants]
  }

  const saveTitle = () => {
    onUpdate({ ...meeting, title })
    setIsEditingTitle(false)
  }

  const saveTranscript = () => {
    const detectedParticipants = autoDetectParticipants(transcript)
    onUpdate({ ...meeting, transcript, participants: detectedParticipants })
    toast.success('Транскрипт обновлён')
  }

  const handleTranscribeWithAI = async () => {
    const textToTranscribe = transcript.trim() || meeting.transcript.trim()
    if (!textToTranscribe) {
      toast.error('Вставьте текст для форматирования')
      return
    }

    setIsTranscribing(true)
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: textToTranscribe }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Ошибка транскрипции')
      }

      const { transcript: formatted } = await res.json()
      onUpdate({ ...meeting, transcript: formatted })
      setTranscript(formatted)
      toast.success('Транскрипт отформатирован')

      // Auto-run speaker detection
      if (meeting.participants.length === 0) {
        setIsDetectingSpeakers(true)
        try {
          const detectRes = await fetch('/api/detect-speakers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: formatted }),
          })
          if (detectRes.ok) {
            const { speakerCount, speakerLabels: labels } = await detectRes.json()
            const labelsArr = Array.isArray(labels) ? labels : Array.from({ length: speakerCount }, (_, i) => `Speaker ${i + 1}`)
            setSpeakerLabels(labelsArr)
            setSpeakerNames(Object.fromEntries(labelsArr.map((_, i) => [i, ''])))
            setSpeakerNamingOpen(true)
          }
        } catch {
          toast.error('Ошибка определения спикеров')
        } finally {
          setIsDetectingSpeakers(false)
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка транскрипции')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleRunSpeakerDetection = async () => {
    const text = transcript.trim() || meeting.transcript.trim()
    if (!text) {
      toast.error('Нужен транскрипт')
      return
    }

    setIsDetectingSpeakers(true)
    try {
      const res = await fetch('/api/detect-speakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Ошибка определения спикеров')
      }

      const { speakerCount, speakerLabels: labels } = await res.json()
      const labelsArr = Array.isArray(labels) ? labels : Array.from({ length: speakerCount }, (_, i) => `Speaker ${i + 1}`)
      setSpeakerLabels(labelsArr)
      setSpeakerNames(Object.fromEntries(labelsArr.map((_, i) => [i, ''])))
      setSpeakerNamingOpen(true)
      toast.success(`Обнаружено спикеров: ${labelsArr.length}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setIsDetectingSpeakers(false)
    }
  }

  const handleSaveSpeakerNames = () => {
    const participants: Participant[] = speakerLabels.map((label, i) => {
      const name = (speakerNames[i] || '').trim() || label
      return {
        id: crypto.randomUUID(),
        name,
        color: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length],
      }
    })
    onUpdate({ ...meeting, participants })
    setSpeakerNamingOpen(false)
    setSpeakerLabels([])
    setSpeakerNames({})
    toast.success('Участники сохранены')
  }

  const updateParticipants = (participants: Participant[]) => {
    onUpdate({ ...meeting, participants })
  }

  const handleSummary = (summary: AISummary) => {
    onUpdate({ ...meeting, summary })
  }

  const downloadAudio = () => {
    if (!meeting.audioBlob) return
    const byteChars = atob(meeting.audioBlob)
    const byteNums = new Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i)
    }
    const blob = new Blob([new Uint8Array(byteNums)], {
      type: meeting.audioType || 'audio/webm',
    })
    const url = URL.createObjectURL(blob)
    const ext = meeting.audioType?.includes('mp3') ? 'mp3' : 'webm'
    const a = document.createElement('a')
    a.href = url
    a.download = `${meeting.title}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadTranscript = () => {
    const blob = new Blob([meeting.transcript], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meeting.title}_транскрипт.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const audioSrc = meeting.audioBlob
    ? `data:${meeting.audioType || 'audio/webm'};base64,${meeting.audioBlob}`
    : null

  const hasTranscriptText = (transcript || meeting.transcript || '').trim().length > 0

  return (
    <div className="flex flex-col gap-6">
      {/* Speaker naming dialog */}
      <Dialog open={speakerNamingOpen} onOpenChange={setSpeakerNamingOpen}>
        <DialogContent showCloseButton={true} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Назовите участников
            </DialogTitle>
            <DialogDescription>
              Мы обнаружили {speakerLabels.length} спикеров. Дайте им имена (или оставьте по умолчанию):
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            {speakerLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <label className="w-24 shrink-0 text-sm text-muted-foreground">{label}</label>
                <Input
                  placeholder={`Имя для ${label}`}
                  value={speakerNames[i] ?? ''}
                  onChange={(e) => setSpeakerNames((s) => ({ ...s, [i]: e.target.value }))}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSpeakerNames}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8 shrink-0 lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTitle() }}
                className="h-8 text-sm font-semibold"
                autoFocus
              />
              <Button onClick={saveTitle} size="icon" variant="ghost" className="h-8 w-8">
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="group flex items-center gap-2 text-left"
            >
              <h2 className="text-lg font-semibold text-foreground">{meeting.title}</h2>
              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {new Date(meeting.date).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            {meeting.duration > 0 && <span>{formatDuration(meeting.duration)}</span>}
          </div>
        </div>
      </div>

      {/* Audio Player & Downloads */}
      {audioSrc && (
        <div className="futuristic-card scan-line relative overflow-hidden rounded-xl p-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="relative flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Volume2 className="h-3.5 w-3.5 text-primary" />
              <span className="uppercase tracking-wider">Аудио запись</span>
            </div>
            <audio ref={audioRef} controls className="w-full" src={audioSrc}>
              <track kind="captions" />
            </audio>
          </div>
        </div>
      )}

      {/* Download buttons */}
      <div className="flex flex-wrap gap-2">
        {meeting.audioBlob && (
          <Button onClick={downloadAudio} variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Скачать аудио
          </Button>
        )}
        {meeting.transcript && (
          <Button onClick={downloadTranscript} variant="outline" size="sm" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Скачать транскрипт
          </Button>
        )}
      </div>

      <Separator className="bg-border/30" />

      {/* Participants */}
      <ParticipantsPanel
        participants={meeting.participants}
        onChange={updateParticipants}
      />

      {/* Detect speakers button (when we have transcript but no participants) */}
      {hasTranscriptText && meeting.participants.length === 0 && !speakerNamingOpen && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleRunSpeakerDetection}
            disabled={isDetectingSpeakers}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-primary/20 text-primary"
          >
            {isDetectingSpeakers ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Users className="h-3.5 w-3.5" />
            )}
            {isDetectingSpeakers ? 'Определение...' : 'Определить спикеров'}
          </Button>
        </div>
      )}

      <Separator className="bg-border/30" />

      {/* Transcript */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Транскрипт
          </h3>
          {hasTranscriptText && (
            <Button
              onClick={handleTranscribeWithAI}
              disabled={isTranscribing}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs border-primary/20 text-primary h-7"
            >
              {isTranscribing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Mic className="h-3 w-3" />
              )}
              {isTranscribing ? 'Форматирование...' : 'Transcribe with AI'}
            </Button>
          )}
        </div>
        {meeting.audioBlob && !meeting.transcript && (
          <div className="relative overflow-hidden rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            Аудиозапись сохранена. Вставьте сюда текст транскрипта и нажмите «Transcribe with AI» для форматирования с таймкодами и спикерами.
          </div>
        )}
        <Textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="min-h-[200px] resize-y border-border/50 bg-secondary/20 font-mono text-xs leading-relaxed"
          placeholder="Вставьте текст транскрипта или введите вручную..."
        />
        {transcript !== meeting.transcript && (
          <Button onClick={saveTranscript} size="sm" className="self-end">
            Сохранить изменения
          </Button>
        )}
      </div>

      <Separator className="bg-border/30" />

      {/* AI Summary */}
      <AISummarySection
        transcript={meeting.transcript}
        summary={meeting.summary}
        onSummaryGenerated={handleSummary}
      />
    </div>
  )
}
