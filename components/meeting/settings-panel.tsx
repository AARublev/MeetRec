'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Key, X, Trash2 } from 'lucide-react'
import { getApiKey, saveApiKey } from '@/lib/meeting-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  onClearAll: () => void
}

export function SettingsPanel({ open, onClose, onClearAll }: SettingsPanelProps) {
  const { theme, setTheme } = useTheme()
  const [apiKey, setApiKeyValue] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      const key = getApiKey()
      setApiKeyValue(key)
      setHasKey(!!key)
    }
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, onClose])

  const handleSaveKey = () => {
    saveApiKey(apiKey.trim())
    setHasKey(!!apiKey.trim())
    toast.success(apiKey.trim() ? 'API ключ сохранён' : 'API ключ удалён')
  }

  const handleClearAll = () => {
    onClearAll()
    onClose()
    toast.success('Все встречи удалены')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/10 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="flex h-full w-full max-w-sm flex-col border-l border-border bg-background/95 shadow-2xl backdrop-blur-md animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-border px-5 py-4">
          <div className="border-shimmer pointer-events-none absolute inset-x-0 bottom-0 h-px" />
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground">Настройки</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
          {/* Theme toggle */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Тема
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-medium transition-all ${
                  theme === 'light'
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border text-muted-foreground hover:border-border hover:bg-secondary'
                }`}
              >
                <Sun className="h-4 w-4" />
                Светлая
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-medium transition-all ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border text-muted-foreground hover:border-border hover:bg-secondary'
                }`}
              >
                <Moon className="h-4 w-4" />
                Тёмная
              </button>
            </div>
          </div>

          <Separator className="bg-border/50" />

          <Separator className="bg-border/50" />

          {/* Danger zone */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-destructive/80">
              Зона опасности
            </label>
            <Button
              onClick={handleClearAll}
              variant="outline"
              size="sm"
              className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Удалить все встречи
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3">
          <p className="text-center text-[10px] text-muted-foreground/50">
            MeetRec v1.0 — Данные хранятся локально
          </p>
        </div>
      </div>
    </div>
  )
}
