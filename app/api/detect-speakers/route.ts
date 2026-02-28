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
        max_completion_tokens: 512,
        messages: [
          {
            role: 'user',
            text: `Analyze this meeting transcript and detect how many unique speakers there are.

Look for patterns such as:
- "Speaker 1:", "Speaker 2:", "Speaker N:" labels
- Different speaking styles, tone changes, or conversational turns
- Names mentioned in dialogue
- Dialogue attribution patterns (e.g. "John said...", "— Anna: ...")

Return a JSON object with this exact structure (no markdown, no \`\`\`):
{
  "speakerCount": <number>,
  "speakerLabels": ["Speaker 1", "Speaker 2", ...]
}

If uncertain, estimate based on conversational turns. Minimum 1 speaker.

Transcript:
${JSON.stringify(transcript).slice(1, -1)}`,
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

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content)
      const speakerCount = Math.max(1, Math.min(20, parseInt(String(parsed.speakerCount), 10) || 1))
      const speakerLabels = Array.isArray(parsed.speakerLabels)
        ? parsed.speakerLabels.slice(0, speakerCount)
        : Array.from({ length: speakerCount }, (_, i) => `Speaker ${i + 1}`)

      return NextResponse.json({ speakerCount, speakerLabels })
    } catch {
      return NextResponse.json({ error: 'Не удалось разобрать ответ ИИ' }, { status: 500 })
    }
  } catch (error) {
    console.error('Detect speakers error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}