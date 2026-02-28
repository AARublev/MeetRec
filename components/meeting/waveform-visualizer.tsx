'use client'

import { useRef, useEffect, useCallback } from 'react'

interface WaveformVisualizerProps {
  analyser: AnalyserNode | null
  isActive: boolean
}

export function WaveformVisualizer({ analyser, isActive }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  const getThemeColors = useCallback(() => {
    const root = document.documentElement
    const style = getComputedStyle(root)
    return {
      line: style.getPropertyValue('--wave-line').trim() || 'rgba(45, 212, 191, 0.85)',
      glow: style.getPropertyValue('--wave-glow').trim() || 'rgba(45, 212, 191, 0.3)',
      bgMid: style.getPropertyValue('--wave-bg-mid').trim() || 'rgba(45, 212, 191, 0.08)',
      idle: style.getPropertyValue('--wave-idle').trim() || 'rgba(45, 212, 191, 0.25)',
    }
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteTimeDomainData(dataArray)
    const colors = getThemeColors()

    ctx.clearRect(0, 0, rect.width, rect.height)

    // Background glow
    const gradient = ctx.createLinearGradient(0, 0, rect.width, 0)
    gradient.addColorStop(0, 'transparent')
    gradient.addColorStop(0.5, colors.bgMid)
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Main waveform
    ctx.lineWidth = 2
    ctx.strokeStyle = colors.line
    ctx.shadowColor = colors.line
    ctx.shadowBlur = 10
    ctx.beginPath()

    const sliceWidth = rect.width / bufferLength
    let x = 0

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0
      const y = (v * rect.height) / 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
      x += sliceWidth
    }
    ctx.lineTo(rect.width, rect.height / 2)
    ctx.stroke()
    ctx.shadowBlur = 0

    // Secondary glow line
    ctx.lineWidth = 5
    ctx.strokeStyle = colors.glow
    ctx.beginPath()
    x = 0
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0
      const y = (v * rect.height) / 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
      x += sliceWidth
    }
    ctx.lineTo(rect.width, rect.height / 2)
    ctx.stroke()

    if (isActive) {
      animationRef.current = requestAnimationFrame(draw)
    }
  }, [analyser, isActive, getThemeColors])

  useEffect(() => {
    if (isActive && analyser) {
      animationRef.current = requestAnimationFrame(draw)
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive, analyser, draw])

  // Idle state
  useEffect(() => {
    if (!isActive) {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, rect.width, rect.height)

      const colors = getThemeColors()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = colors.idle
      ctx.beginPath()
      for (let x = 0; x < rect.width; x++) {
        const y = rect.height / 2 + Math.sin(x * 0.02) * 3
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  }, [isActive, getThemeColors])

  return (
    <canvas
      ref={canvasRef}
      className="h-24 w-full rounded-lg"
      style={{ imageRendering: 'crisp-edges' }}
    />
  )
}
