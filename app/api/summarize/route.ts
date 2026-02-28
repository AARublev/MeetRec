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
        max_completion_tokens: 4096,
        messages: [
          {
            role: 'user',
            text: `You are an expert meeting analyst. Analyze this meeting transcript and return a JSON with:
- executiveSummary: 3-4 sentence professional summary of what was discussed and decided
- keyDecisions: array of concrete decisions made (with decision owner if mentioned), e.g. {"decision": "string", "owner": "string or null"}
- actionItems: array of {"task": "string", "assignee": "string or null", "deadline": "string or null", "priority": "high"|"medium"|"low"}
- discussionTopics: array of {"topic": "string", "summary": "string", "duration": "string - estimated"}
- participants: array of {"name": "string (use Speaker N if unknown)", "role": "string - inferred from conversation"}
- meetingEffectiveness: {"score": number 1-10, "explanation": "string"}
- followUpRequired: boolean
- nextSteps: array of strings
- sentiment: {"overall": "positive"|"neutral"|"negative", "explanation": "string"}

Return ONLY valid JSON (no markdown, no \`\`\`). Use null for missing optional fields.

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
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ error: 'Не удалось разобрать ответ ИИ' }, { status: 500 })
    }
  } catch (error) {
    console.error('Summary error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}