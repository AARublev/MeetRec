'use client'

import { useState, useRef } from 'react'
import { Mic, Upload, FileText, Type } from 'lucide-react'
import type { InputMode } from '@/lib/types'
import { AudioRecorder } from './audio-recorder'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface InputModeSelectorProps {
  onAudioRecorded: (blob: Blob, duration: number) => void
  onAudioUploaded: (blob: Blob, duration: number) => void
  onTextProvided: (text: string) => void
}

const INPUT_MODES: { id: InputMode; label: string; icon: React.ReactNode }[] = [
  { id: 'record', label: 'Микрофон', icon: <Mic className="h-4 w-4" /> },
  { id: 'upload-audio', label: 'Аудио файл', icon: <Upload className="h-4 w-4" /> },
  { id: 'paste-text', label: 'Текст', icon: <Type className="h-4 w-4" /> },
  { id: 'upload-text', label: 'TXT файл', icon: <FileText className="h-4 w-4" /> },
]

export function InputModeSelector({
  onAudioRecorded,
  onAudioUploaded,
  onTextProvided,
}: InputModeSelectorProps) {
  const [mode, setMode] = useState<InputMode>('record')
  const [pastedText, setPastedText] = useState('')
  const audioInputRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    console.log('File:', file?.name, file?.type, file?.size)
    if (!file) return
    e.target.value = ''
  
    console.log('Type check:', file.type.startsWith('audio/'))
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(webm|weba|mp3|wav|ogg|m4a|aac)$/i)) {
      toast.error('Пожалуйста, выберите аудио файл')
      return
    }
  
    console.log('Passed validation, calling onAudioUploaded')
    const audio = new Audio()
    audio.src = URL.createObjectURL(file)
    audio.onloadedmetadata = () => {
      const dur = Math.round(audio.duration)
      onAudioUploaded(file, dur)
      URL.revokeObjectURL(audio.src)
      toast.success(`Файл загружен: ${file.name}`)
    }
    audio.onerror = () => {
      onAudioUploaded(file, 0)
      toast.success(`Файл загружен: ${file.name}`)
    }
  }

  const handleTextUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (text.trim()) {
        onTextProvided(text.trim())
        toast.success('Текст загружен')
      } else {
        toast.error('Файл пуст')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mode tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border/40 bg-secondary/40 p-1">
        {INPUT_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 ${mode === m.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {mode === m.id && (
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            )}
            {m.icon}
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Mode content */}
      <div className="min-h-[200px]">
        {mode === 'record' && (
          <AudioRecorder onRecordingComplete={onAudioRecorded} />
        )}

        {mode === 'upload-audio' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div
              className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border/40 p-8 transition-all hover:border-primary/30 hover:bg-primary/5"
              onClick={() => audioInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') audioInputRef.current?.click() }}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Нажмите для загрузки аудио файла
              </p>
              <p className="text-xs text-muted-foreground/60">
                .webm, .mp3, .wav, .ogg, .m4a
              </p>
            </div>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {mode === 'paste-text' && (
          <div className="flex flex-col gap-3">
            <Textarea
              placeholder="Вставьте транскрипт встречи здесь..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="min-h-[160px] resize-none bg-secondary/30 text-sm leading-relaxed placeholder:text-muted-foreground/40"
            />
            <Button
              onClick={() => {
                if (pastedText.trim()) {
                  onTextProvided(pastedText.trim())
                  setPastedText('')
                  toast.success('Текст сохранён')
                }
              }}
              disabled={!pastedText.trim()}
              className="self-end"
            >
              Сохранить текст
            </Button>
          </div>
        )}

        {mode === 'upload-text' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div
              className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border/40 p-8 transition-all hover:border-primary/30 hover:bg-primary/5"
              onClick={() => textInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') textInputRef.current?.click() }}
            >
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Нажмите для загрузки .txt файла
              </p>
            </div>
            <input
              ref={textInputRef}
              type="file"
              accept=".txt,text/plain"
              onChange={handleTextUpload}
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
