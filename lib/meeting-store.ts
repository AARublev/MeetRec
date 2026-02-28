import type { Meeting } from './types'

const MEETINGS_KEY = 'meetrec_meetings'
const API_KEY_KEY = 'meetrec_anthropic_key'

export function getMeetings(): Meeting[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(MEETINGS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveMeeting(meeting: Meeting): void {
  const meetings = getMeetings()
  const existing = meetings.findIndex((m) => m.id === meeting.id)
  if (existing >= 0) {
    meetings[existing] = meeting
  } else {
    meetings.unshift(meeting)
  }
  localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings))
}

export function deleteMeeting(id: string): void {
  const meetings = getMeetings().filter((m) => m.id !== id)
  localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings))
}

export function getApiKey(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(API_KEY_KEY) || ''
}

export function saveApiKey(key: string): void {
  localStorage.setItem(API_KEY_KEY, key)
}
