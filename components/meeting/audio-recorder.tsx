'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WaveformVisualizer } from './waveform-visualizer'

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void
}

export function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const durationRef = useRef(0)

  useEffect(() => {
    durationRef.current = duration
  }, [duration])

  const startRecording = useCallback(async () => {
    try {
      // Включаем все браузерные подавители шума
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      })

      const audioContext = new AudioContext({ sampleRate: 48000 })
      const source = audioContext.createMediaStreamSource(stream)

      // 1. High-pass фильтр — срезает гул, шум кулера, вибрации стола (ниже 80 Hz)
      const highPass = audioContext.createBiquadFilter()
      highPass.type = 'highpass'
      highPass.frequency.value = 80
      highPass.Q.value = 0.7

      // 2. Low-pass фильтр — срезает высокочастотное шипение (выше 8000 Hz)
      const lowPass = audioContext.createBiquadFilter()
      lowPass.type = 'lowpass'
      lowPass.frequency.value = 8000
      lowPass.Q.value = 0.7

      // 3. Компрессор — выравнивает громкость голоса, давит пики
      const compressor = audioContext.createDynamicsCompressor()
      compressor.threshold.value = -24  // начинает сжимать с -24 dB
      compressor.knee.value = 10        // мягкий переход
      compressor.ratio.value = 6        // сжатие 6:1
      compressor.attack.value = 0.003   // быстрая атака
      compressor.release.value = 0.25   // плавный отпуск

      // 4. Gain — умеренное усиление после компрессора
      const gainNode = audioContext.createGain()
      gainNode.gain.value = 1.8

      // 5. Analyser для waveform
      const analyserNode = audioContext.createAnalyser()
      analyserNode.fftSize = 2048
      analyserNode.smoothingTimeConstant = 0.8

      // Цепочка: source → highPass → lowPass → compressor → gain → analyser → dest
      const dest = audioContext.createMediaStreamDestination()
      source.connect(highPass)
      highPass.connect(lowPass)
      lowPass.connect(compressor)
      compressor.connect(gainNode)
      gainNode.connect(analyserNode)
      gainNode.connect(dest)

      audioContextRef.current = audioContext
      setAnalyser(analyserNode)

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(dest.stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        onRecordingComplete(blob, durationRef.current)
        stream.getTracks().forEach((t) => t.stop())
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
        setAnalyser(null)
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setIsPaused(false)
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    } catch (err) {
      console.error('Recording error:', err)
    }
  }, [onRecordingComplete])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setIsRecording(false)
    setIsPaused(false)
  }, [])

  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return
    if (isPaused) {
      mediaRecorderRef.current.resume()
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    } else {
      mediaRecorderRef.current.pause()
      if (timerRef.current) clearInterval(timerRef.current)
    }
    setIsPaused(!isPaused)
  }, [isPaused])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="futuristic-card relative w-full overflow-hidden rounded-xl p-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <WaveformVisualizer analyser={analyser} isActive={isRecording && !isPaused} />
      </div>

      {isRecording && (
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-muted-foreground' : 'animate-ping bg-primary'}`} />
            <span className={`relative inline-flex h-3 w-3 rounded-full ${isPaused ? 'bg-muted-foreground' : 'bg-primary'}`} />
          </span>
          <span className="font-mono text-2xl font-medium tracking-wider text-foreground">
            {formatTime(duration)}
          </span>
          {isPaused && (
            <span className="text-sm text-muted-foreground">{'(пауза)'}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            size="lg"
            className="gap-2 rounded-full bg-primary px-8 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25"
          >
            <Mic className="h-5 w-5" />
            Начать запись
          </Button>
        ) : (
          <>
            <Button
              onClick={togglePause}
              variant="outline"
              size="lg"
              className="gap-2 rounded-full"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {isPaused ? 'Продолжить' : 'Пауза'}
            </Button>
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="gap-2 rounded-full"
            >
              <Square className="h-4 w-4" />
              Остановить
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
