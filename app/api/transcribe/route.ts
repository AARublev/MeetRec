import { NextRequest, NextResponse } from 'next/server'

const AMVERA_URL = 'https://kong-proxy.yc.amvera.ru/api/v1/models/gpt'

export async function POST(request: NextRequest) {
  try {
    const token = process.env.AMVERA_TOKEN

    if (!token) {
      return NextResponse.json(
        { error: 'API ключ не настроен на сервере' },
        { status: 500 }
      )
    }

    const { transcript } = await request.json()

    if (!transcript) {
      return NextResponse.json({ error: 'Транскрипт не указан' }, { status: 400 })
    }

    const prompt = `You are a meeting transcription specialist. Format this transcript with timestamps and speaker labels.

Rules:
- Format: [MM:SS] Speaker N: text
- Start at [00:00], estimate timestamps at 150 words per minute
- One turn per line
- Use existing speaker labels if present

Return ONLY the formatted transcript text, no explanations.

Raw transcript:
${transcript}`

    const response = await fetch(AMVERA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      return NextResponse.json(
        { error: `Ошибка API: ${response.status} - ${errorData}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: 'Пустой ответ от ИИ' }, { status: 500 })
    }

    const formatted = content
      .replace(/^```\w*\n?/g, '')
      .replace(/\n?```$/g, '')
      .trim()

    return NextResponse.json({ transcript: formatted })
  } catch (error) {
    console.error('Transcribe error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}