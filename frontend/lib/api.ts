import { getSessionToken } from './auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

async function api(path: string, options: RequestInit = {}, auth = true) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) }
  if (auth) {
    const token = getSessionToken()
    if (!token) throw new Error('Not signed in.')
    headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(`${BACKEND_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    let detail = `Error ${res.status}`
    try {
      detail = (await res.json()).detail || detail
    } catch {}
    throw new Error(detail)
  }
  return res.json()
}

// ---------- types ----------
export type LocationType = 'remote' | 'onsite' | 'hybrid'

export interface Job {
  id: string
  recruiter: string
  company: string
  role_title: string
  location?: string
  location_type?: LocationType
  description: string
  tags?: string[]
  status: string
  parsed_skills?: string[]
  parsed_requirements?: string[]
  seniority_level?: string
  jd_summary?: string
  created_at?: number
}

export type ApplicationStatus = 'applied' | 'under_review' | 'accepted' | 'rejected'

export interface JobApp {
  id: string
  job_id: string
  job_title: string
  company: string
  applicant: string
  recruiter: string
  status: string
  resume_text?: string
  screening_summary?: string
  screening_suggestions?: string[]
  decision_pending?: boolean
  decision_message?: string
  created_at?: number
}

export interface Message {
  id: string
  app_id: string
  from_user: string
  from_role: string
  body: string
  created_at?: number
}

export interface Task {
  id: string
  app_id: string
  title: string
  instructions: string
  status: string
  submission_text?: string
  submission_url?: string
  file_name?: string
  file_path?: string
  created_at?: number
}

// ---------- session ----------
export const getMe = (): Promise<{ username: string; role: 'applicant' | 'admin' }> => api('/api/me')

// ---------- resume profile ----------
export interface ResumeProfile {
  exists: boolean
  name?: string
  email?: string
  phone?: string
  headline?: string
  skills?: string[]
  education?: string[]
  experience?: string[]
  summary?: string
  source_filename?: string
  updated_at?: number
}

export const getResume = (): Promise<ResumeProfile> => api('/api/resume')

export async function uploadResume(file: File): Promise<ResumeProfile> {
  const token = getSessionToken()
  if (!token) throw new Error('Not signed in.')
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BACKEND_URL}/api/resume/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) {
    let detail = `Error ${res.status}`
    try { detail = (await res.json()).detail || detail } catch {}
    throw new Error(detail)
  }
  return res.json()
}

// ---------- interview history ----------
export interface InterviewPrep {
  id: string
  job_title: string
  company: string
  round_name: string
  format?: string
  prep_notes: string
  likely_questions: string[]
  created_at?: number
}
export const interviewHistory = (): Promise<{ items: InterviewPrep[] }> => api('/api/interview-history')

// ---------- AI interviewer (live mock interview) ----------
export const startInterview = (appId: string): Promise<{ conversation_id: string; message: string; done: boolean }> =>
  api(`/api/applications/${appId}/interview/start`, { method: 'POST' })

export const interviewReply = (conversationId: string, answer: string): Promise<{ message: string; done: boolean }> =>
  api(`/api/interview/${conversationId}/reply`, { method: 'POST', body: JSON.stringify({ answer }) })

export const terminateInterview = (conversationId: string, reason: string): Promise<{ status: string }> =>
  api(`/api/interview/${conversationId}/terminate`, { method: 'POST', body: JSON.stringify({ reason }) })

export interface InterviewSession {
  id: string
  conversation_id: string
  job_title: string
  company: string
  status: string
  feedback?: string
  transcript?: string[]
  created_at?: number
}
export const listInterviewSessions = (): Promise<{ items: InterviewSession[] }> => api('/api/interview-sessions')
export const getInterviewSession = (conversationId: string): Promise<InterviewSession> =>
  api(`/api/interview-sessions/${conversationId}`)

// ---------- public ----------
export const listJobs = (): Promise<{ items: Job[] }> => api('/api/jobs', {}, false)
export const getJob = (id: string): Promise<Job> => api(`/api/jobs/${id}`, {}, false)

// ---------- recruiter ----------
export const createJob = (b: {
  company: string; role_title: string; location?: string; location_type?: LocationType; description: string; tags?: string[]
}): Promise<Job> =>
  api('/api/jobs', { method: 'POST', body: JSON.stringify(b) })
export const updateJob = (jobId: string, b: {
  company: string; role_title: string; location?: string; location_type?: LocationType; description: string; tags?: string[]
}): Promise<Job> =>
  api(`/api/jobs/${jobId}`, { method: 'PATCH', body: JSON.stringify(b) })
export const deleteJob = (jobId: string): Promise<{ status: string }> =>
  api(`/api/jobs/${jobId}`, { method: 'DELETE' })
export const myJobs = (): Promise<{ items: Job[] }> => api('/api/my-jobs')
export const updateApplicationStatus = (appId: string, status: ApplicationStatus): Promise<{ id: string; status: string }> =>
  api(`/api/applications/${appId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
export const parseSkills = (jobId: string): Promise<{ parsed: { skills: string[] } }> =>
  api(`/api/jobs/${jobId}/parse-skills`, { method: 'POST' })
export const jobApplicants = (jobId: string): Promise<{ items: JobApp[] }> => api(`/api/jobs/${jobId}/applicants`)
export const myApplicants = (): Promise<{ items: JobApp[] }> => api('/api/my-applicants')
export const draftMessage = (appId: string): Promise<{ subject: string; body: string }> =>
  api(`/api/applications/${appId}/draft-message`, { method: 'POST' })
export const assignTask = (appId: string, b: { title: string; instructions: string }): Promise<Task> =>
  api(`/api/applications/${appId}/tasks`, { method: 'POST', body: JSON.stringify(b) })

// ---------- applicant ----------
export const applyToJob = (jobId: string): Promise<{ id: string }> =>
  api(`/api/jobs/${jobId}/apply`, { method: 'POST' })
export const myApplications = (): Promise<{ items: JobApp[] }> => api('/api/my-applications')
export const ackDecision = (appId: string): Promise<{ id: string; decision_pending: boolean }> =>
  api(`/api/applications/${appId}/ack-decision`, { method: 'POST' })
export const screenResume = (appId: string): Promise<{ summary: string; suggestions: string[] }> =>
  api(`/api/applications/${appId}/screen-resume`, { method: 'POST' })
export const interviewPrep = (
  appId: string,
  b: { round_name: string; format?: string }
): Promise<{ round_name: string; prep_notes: string; likely_questions: string[] }> =>
  api(`/api/applications/${appId}/interview-prep`, { method: 'POST', body: JSON.stringify(b) })
export const submitTask = (
  taskId: string,
  b: { submission_text?: string; submission_url?: string; file_name?: string; file_base64?: string }
): Promise<{ status: string; has_file: boolean }> =>
  api(`/api/tasks/${taskId}/submit`, { method: 'POST', body: JSON.stringify(b) })

// ---------- shared (both parties on an application) ----------
export const listMessages = (appId: string): Promise<{ items: Message[] }> => api(`/api/applications/${appId}/messages`)
export const sendMessage = (appId: string, body: string): Promise<Message> =>
  api(`/api/applications/${appId}/messages`, { method: 'POST', body: JSON.stringify({ body }) })
export const listTasks = (appId: string): Promise<{ items: Task[] }> => api(`/api/applications/${appId}/tasks`)
export const sendEmailMessage = (appId: string, subject: string, body: string): Promise<{ status: string; recipient_email: string }> =>
  api(`/api/applications/${appId}/send-email-message`, { method: 'POST', body: JSON.stringify({ subject, body }) })

export async function downloadAttachment(taskId: string, fileName: string) {
  const token = getSessionToken()
  const res = await fetch(`${BACKEND_URL}/api/tasks/${taskId}/attachment`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'submission'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
