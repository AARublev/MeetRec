export interface Participant {
  id: string
  name: string
  color: string
}

/** New professional AI summary format */
export interface ProfessionalAISummary {
  executiveSummary: string
  keyDecisions: { decision: string; owner: string | null }[]
  actionItems: {
    task: string
    assignee: string | null
    deadline: string | null
    priority: 'high' | 'medium' | 'low'
  }[]
  discussionTopics: { topic: string; summary: string; duration: string }[]
  participants: { name: string; role: string }[]
  meetingEffectiveness: { score: number; explanation: string }
  followUpRequired: boolean
  nextSteps: string[]
  sentiment: { overall: 'positive' | 'neutral' | 'negative'; explanation: string }
}

/** Legacy AI summary format (for backward compatibility) */
export interface LegacyAISummary {
  shortSummary: string
  keyDecisions: string[]
  actionItems: { task: string; assignee: string }[]
  topics: string[]
  sentiment: string
}

export type AISummary = ProfessionalAISummary | LegacyAISummary

/** Type guard for professional summary */
export function isProfessionalSummary(s: AISummary): s is ProfessionalAISummary {
  return 'executiveSummary' in s && 'meetingEffectiveness' in s
}

export interface Meeting {
  id: string
  title: string
  date: string
  duration: number // seconds
  audioBlob?: string // base64 encoded
  audioType?: string
  transcript: string
  participants: Participant[]
  summary?: AISummary
}

export type InputMode = 'record' | 'upload-audio' | 'paste-text' | 'upload-text'

export const PARTICIPANT_COLORS = [
  '#2dd4bf', // teal
  '#60a5fa', // blue
  '#f472b6', // pink
  '#fbbf24', // amber
  '#a78bfa', // violet
  '#34d399', // emerald
  '#fb923c', // orange
  '#e879f9', // fuchsia
]
