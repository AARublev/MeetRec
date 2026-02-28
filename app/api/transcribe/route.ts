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

    const response = await fetch(AMVERA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        max_completion_tokens: 8192,
        messages: [
          {
            role: 'user',
            text: `You are a meeting transcription specialist. Take the raw meeting text below and convert it into a professionally formatted transcript with timestamps and speaker labels.

Rules:
- Assign each speaking turn to a speaker (Speaker 1, Speaker 2, etc.)
- Add estimated timestamps in [MM:SS] format at the start of each turn
- Start at [00:00] and estimate timestamps based on typical speaking pace (~150 words/min)
- Preserve the original content; only reorganize and format
- Output format for each turn: [MM:SS] Speaker N: <text>
- Keep one turn per line
- If the input already has speaker labels, use them. Otherwise infer from dialogue.

Return ONLY the formatted transcript text, no JSON, no markdown code blocks, no explanations.

Raw transcript:
${transcript}`,
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