'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Settings2, Radio, Sun, Moon } from 'lucide-react'
import type { Meeting } from '@/lib/types'
import { getMeetings, saveMeeting, deleteMeeting } from '@/lib/meeting-store'
import { MeetingList } from '@/components/meeting/meeting-list'
import { MeetingDetail } from '@/components/meeting/meeting-detail'
import { InputModeSelector } from '@/components/meeting/input-mode-selector'
import { SettingsPanel } from '@/components/meeting/settings-panel'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export default function MeetingApp() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewMeeting, setShowNewMeeting] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [autoProcessMeetingId, setAutoProcessMeetingId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    setMeetings(getMeetings())
  }, [])

  const selectedMeeting = meetings.find((m) => m.id === selectedId) || null

  const goHome = () => {
    setSelectedId(null)
    setShowNewMeeting(true)
    setAutoProcessMeetingId(null)
  }

  const createMeeting = useCallback(
    async (options: {
      audioBlob?: Blob
      audioType?: string
      duration?: number
      transcript?: string
    }) => {
      const meeting: Meeting = {
        id: crypto.randomUUID(),
        title: `Встреча ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
        date: new Date().toISOString(),
        duration: options.duration || 0,
        transcript: options.transcript || '',
        participants: [],
      }

      if (options.audioBlob) {
        try {
          meeting.audioBlob = await blobToBase64(options.audioBlob)
          meeting.audioType = options.audioType || options.audioBlob.type
        } catch (err) {
          console.error('Failed to convert audio:', err)
        }
      }

      saveMeeting(meeting)
      setMeetings(getMeetings())
      setSelectedId(meeting.id)
      setShowNewMeeting(false)
      if (options.transcript) setAutoProcessMeetingId(meeting.id)
      toast.success('Встреча сохранена')
      return meeting
    },
    []
  )

  const handleAudioRecorded = useCallback(
    (blob: Blob, duration: number) => {
      createMeeting({ audioBlob: blob, audioType: blob.type, duration })
    },
    [createMeeting]
  )

  const handleAudioUploaded = useCallback(
    (blob: Blob, duration: number) => {
      createMeeting({ audioBlob: blob, audioType: blob.type, duration })
    },
    [createMeeting]
  )

  const handleTextProvided = useCallback(
    (text: string) => {
      createMeeting({ transcript: text })
    },
    [createMeeting]
  )

  const handleUpdateMeeting = useCallback((updated: Meeting) => {
    saveMeeting(updated)
    setMeetings(getMeetings())
  }, [])

  const handleDeleteMeeting = useCallback(
    (id: string) => {
      deleteMeeting(id)
      setMeetings(getMeetings())
      if (selectedId === id) {
        setSelectedId(null)
        setShowNewMeeting(true)
      }
      toast.success('Встреча удалена')
    },
    [selectedId]
  )

  const handleClearAll = () => {
    meetings.forEach((m) => deleteMeeting(m.id))
    setMeetings([])
    setSelectedId(null)
    setShowNewMeeting(true)
  }

  const isViewingMeeting = selectedMeeting && !showNewMeeting
  const isDark = resolvedTheme === 'dark'

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      {/* Futuristic ambient glow background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-1/2 left-1/4 h-[600px] w-[600px] rounded-full opacity-[0.03] blur-[120px]"
          style={{ background: `rgb(var(--glow-rgb))` }}
        />
        <div
          className="absolute -bottom-1/2 right-1/4 h-[400px] w-[400px] rounded-full opacity-[0.02] blur-[100px]"
          style={{ background: `rgb(var(--glow-rgb))` }}
        />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between border-b border-border/50 px-4 py-3 backdrop-blur-sm lg:px-6">
        {/* Animated shimmer line */}
        <div className="border-shimmer pointer-events-none absolute inset-x-0 bottom-0 h-px" />

        <button onClick={goHome} className="group flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <Radio className="h-4 w-4 text-primary" />
            {/* Icon glow */}
            <div
              className="glow-pulse absolute -inset-1 -z-10 rounded-xl opacity-30 blur-md"
              style={{ background: `rgb(var(--glow-rgb))` }}
            />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground">MeetRec</h1>
            <p className="text-[10px] tracking-wide text-muted-foreground">Запись и анализ встреч</p>
          </div>
        </button>

        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Переключить тему"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Настройки"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Sidebar: history list */}
        {meetings.length > 0 && (
          <aside
            className={`flex w-full flex-col border-r border-border/40 backdrop-blur-sm lg:w-72 xl:w-80 ${
              isViewingMeeting
                ? 'hidden lg:flex'
                : showNewMeeting
                  ? 'hidden lg:flex'
                  : 'flex'
            }`}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                История
              </h2>
              <span className="rounded-full border border-border/50 bg-secondary/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                {meetings.length}
              </span>
            </div>
            <div className="px-4 pb-3">
              <button
                onClick={goHome}
                className="group relative w-full overflow-hidden rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/20"
              >
                {/* Button glow overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="relative z-10">+ Новая встреча</span>
              </button>
            </div>
            <Separator className="bg-border/30" />
            <ScrollArea className="flex-1 px-4 py-3">
              <MeetingList
                meetings={meetings}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id)
                  setShowNewMeeting(false)
                  setAutoProcessMeetingId(null)
                }}
                onDelete={handleDeleteMeeting}
              />
            </ScrollArea>
          </aside>
        )}

        {/* Main area */}
        <main className="relative flex flex-1 overflow-hidden">
          {isViewingMeeting ? (
            <ScrollArea className="flex-1">
              <div className="mx-auto max-w-2xl p-6">
                <MeetingDetail
                  meeting={selectedMeeting}
                  onUpdate={handleUpdateMeeting}
                  onBack={goHome}
                  autoProcess={selectedId === autoProcessMeetingId}
                />
              </div>
            </ScrollArea>
          ) : showNewMeeting ? (
            <div className="relative flex flex-1 flex-col items-center justify-center p-6">
              {/* Decorative grid pattern behind card */}
              <div className="pointer-events-none absolute inset-0 opacity-[0.015]" style={{
                backgroundImage: `linear-gradient(rgb(var(--glow-rgb)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--glow-rgb)) 1px, transparent 1px)`,
                backgroundSize: '60px 60px',
              }} />

              <div className="relative w-full max-w-lg">
                {/* Hero */}
                <div className="mb-8 text-center">
                  <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                    <Radio className="h-7 w-7 text-primary" />
                    <div
                      className="glow-pulse absolute -inset-2 -z-10 rounded-2xl opacity-20 blur-xl"
                      style={{ background: `rgb(var(--glow-rgb))` }}
                    />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground text-balance">
                    Новая встреча
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground text-pretty">
                    Запишите аудио, загрузите файл или вставьте текст
                  </p>
                </div>

                {/* Input card with futuristic border */}
                <div className="futuristic-card scan-line relative overflow-hidden rounded-2xl p-6 shadow-sm">
                  {/* Top accent line */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                  <div className="relative z-10">
                    <InputModeSelector
                      onAudioRecorded={handleAudioRecorded}
                      onAudioUploaded={handleAudioUploaded}
                      onTextProvided={handleTextProvided}
                    />
                  </div>
                </div>

                {meetings.length > 0 && (
                  <button
                    onClick={() => {
                      setShowNewMeeting(false)
                      if (meetings.length > 0) setSelectedId(meetings[0].id)
                    }}
                    className="mt-5 w-full text-center text-xs text-muted-foreground transition-colors hover:text-primary"
                  >
                    Вернуться к истории встреч
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-6 lg:hidden">
              <p className="text-sm text-muted-foreground">
                Выберите встречу из списка
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Settings overlay */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onClearAll={handleClearAll}
      />
    </div>
  )
}
