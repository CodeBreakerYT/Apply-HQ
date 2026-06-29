'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSearch, FileText, GraduationCap, MessageSquare, ClipboardList,
  Building2, Briefcase, X, Loader2, CheckCircle2, Send, Paperclip, ExternalLink, Plus,
  UploadCloud, History, User, Sparkles,
} from 'lucide-react'
import {
  listJobs, myApplications, applyToJob, getJob, screenResume, interviewPrep, ackDecision,
  listMessages, sendMessage, listTasks, submitTask, downloadAttachment,
  getResume, uploadResume, interviewHistory, listInterviewSessions,
  type Job, type JobApp, type Message, type Task, type ResumeProfile, type InterviewPrep, type InterviewSession, type LocationType,
} from '@/lib/api'
import { Card, AgentBusy, StatusBadge, TabBar, DecisionToast } from '@/components/dash-ui'

type Tab = 'skills' | 'screening' | 'interview' | 'messages' | 'tasks'
type View = 'applications' | 'prep' | 'messages' | 'tasks' | 'history'

export function ApplicantDashboard() {
  const params = useSearchParams()
  const [apps, setApps] = useState<JobApp[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [resume, setResume] = useState<ResumeProfile | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [applyJob, setApplyJob] = useState<Job | null>(null)
  const [browse, setBrowse] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [view, setView] = useState<View>('applications')
  const [ready, setReady] = useState(false)
  const [decisionQueue, setDecisionQueue] = useState<JobApp[]>([])

  const selected = apps.find((a) => a.id === selectedId) || null

  const refresh = useCallback(async () => {
    const [a, j, r] = await Promise.all([myApplications(), listJobs(), getResume()])
    setApps(a.items); setJobs(j.items); setResume(r)
    return a.items
  }, [])

  useEffect(() => {
    refresh().then((items) => {
      const pending = items.filter((a) => a.decision_pending)
      if (pending.length > 0) setDecisionQueue(pending)
    }).finally(() => setReady(true))
    // Only on initial mount — re-fetching elsewhere (e.g. after sending a message) shouldn't re-trigger the toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentDecision = decisionQueue[0] || null

  function dismissDecision() {
    if (!currentDecision) return
    ackDecision(currentDecision.id).catch(() => {})
    setDecisionQueue((q) => q.slice(1))
  }

  useEffect(() => {
    const jobId = params.get('apply')
    if (jobId) getJob(jobId).then(setApplyJob).catch(() => {})
  }, [params])

  if (!ready) {
    return <div className="max-w-7xl mx-auto px-6 py-12 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…</div>
  }

  const appliedJobIds = new Set(apps.map((a) => a.job_id))
  const openJobs = jobs.filter((j) => !appliedJobIds.has(j.id))
  const hasResume = !!resume?.exists

  function tryApply(job: Job) {
    if (!hasResume) { setUploadOpen(true); return }
    setApplyJob(job)
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Job Seeker Dashboard</h1>
          <p className="text-muted-foreground text-sm">Upload your resume once, apply in one click, and let AI screen & prep you.</p>
        </div>
        <button onClick={() => { setBrowse(true) }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-background font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Browse & Apply
        </button>
      </div>

      {/* Resume profile bar */}
      <ProfileBar resume={resume} onUpload={() => setUploadOpen(true)} />

      {/* View toggle */}
      <div className="flex gap-1 border-b border-border">
        {([['applications', 'My Applications', Briefcase], ['prep', 'Interview Prep', GraduationCap], ['messages', 'Messages', MessageSquare], ['tasks', 'Tasks', ClipboardList], ['history', 'Interview History', History]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setView(k)} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${view === k ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {view === 'history' && <InterviewHistoryView />}

      {view === 'prep' && <InterviewPrepView apps={apps} />}

      {view === 'messages' && <MessagesView apps={apps} />}

      {view === 'tasks' && <TasksView apps={apps} />}

      {view === 'applications' && (
        <section className="grid lg:grid-cols-[320px_1fr] gap-6">
          <div className="space-y-3">
            <h2 className="font-semibold">My applications ({apps.length})</h2>
            {apps.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No applications yet. Click <span className="text-foreground">Browse &amp; Apply</span>.
              </div>
            )}
            {apps.map((a) => (
              <button key={a.id} onClick={() => setSelectedId(a.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedId === a.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{a.job_title}</span>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5"><Building2 className="w-3 h-3" /> {a.company}</p>
              </button>
            ))}
          </div>

          <div>
            {!selected ? (
              <Card className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-16">
                <Briefcase className="w-8 h-8 mb-3 opacity-50" />
                <p>Select an application to open its AI workspace.</p>
              </Card>
            ) : (
              <AppWorkspace key={selected.id} app={selected} job={jobs.find((j) => j.id === selected.job_id)} onChanged={refresh} />
            )}
          </div>
        </section>
      )}

      <AnimatePresence>
        {browse && <BrowseModal jobs={openJobs} hasResume={hasResume} onClose={() => setBrowse(false)} onPick={(j) => { setBrowse(false); tryApply(j) }} />}
        {applyJob && <ApplyModal job={applyJob} resume={resume} onClose={() => setApplyJob(null)} onApplied={async (id) => { setApplyJob(null); await refresh(); setView('applications'); setSelectedId(id) }} />}
        {uploadOpen && <ResumeUploadModal onClose={() => setUploadOpen(false)} onUploaded={async () => { setUploadOpen(false); await refresh() }} />}
      </AnimatePresence>

      <AnimatePresence>
        {currentDecision && (
          <DecisionToast
            key={currentDecision.id}
            accepted={currentDecision.status === 'accepted'}
            message={currentDecision.decision_message || (currentDecision.status === 'accepted' ? 'You are accepted for this role.' : 'You have been rejected for this role.')}
            onDone={dismissDecision}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

function ProfileBar({ resume, onUpload }: { resume: ResumeProfile | null; onUpload: () => void }) {
  const has = !!resume?.exists
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          {has ? (
            <>
              <p className="font-semibold">{resume?.name || 'Your resume'} <span className="text-muted-foreground font-normal text-sm">· {resume?.headline}</span></p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(resume?.skills || []).slice(0, 8).map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s}</span>)}
              </div>
            </>
          ) : (
            <>
              <p className="font-semibold">No resume on file</p>
              <p className="text-sm text-muted-foreground">Upload your resume (PDF/DOCX/TXT) — AI extracts your info, then the file is deleted.</p>
            </>
          )}
        </div>
      </div>
      <button onClick={onUpload} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary/40 text-sm hover:bg-primary/10">
        <UploadCloud className="w-4 h-4" /> {has ? 'Update resume' : 'Upload resume'}
      </button>
    </Card>
  )
}

function ResumeUploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<ResumeProfile | null>(null)

  async function upload() {
    setError(null)
    if (!file) { setError('Choose a file.'); return }
    if (file.size > 4 * 1024 * 1024) { setError('File must be ≤ 4 MB.'); return }
    setLoading(true)
    try {
      const profile = await uploadResume(file)
      setDone(profile)
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.') } finally { setLoading(false) }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold flex items-center gap-2"><UploadCloud className="w-4 h-4 text-primary" /> Upload resume</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
      </div>
      {!done ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">PDF, DOCX, or TXT (≤ 4 MB). The AI extracts your details and the uploaded file is then deleted — only your extracted profile is stored.</p>
          <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-lg py-8 cursor-pointer hover:border-primary/40">
            <Paperclip className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">{file ? file.name : 'Click to choose a file'}</span>
            <input type="file" accept=".pdf,.docx,.doc,.txt,.md" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
          <button onClick={upload} disabled={loading} className="w-full mt-3 py-2 rounded-md bg-primary text-background font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting with AI…</> : 'Upload & extract'}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-emerald-400 mb-3"><CheckCircle2 className="w-5 h-5" /> Resume saved</div>
          <div className="space-y-2 text-sm">
            {done.name && <p><span className="text-muted-foreground">Name:</span> {done.name}</p>}
            {done.headline && <p><span className="text-muted-foreground">Headline:</span> {done.headline}</p>}
            <div className="flex flex-wrap gap-1">{(done.skills || []).map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300">{s}</span>)}</div>
          </div>
          <button onClick={onUploaded} className="w-full mt-4 py-2 rounded-md bg-primary text-background font-semibold">Done</button>
        </>
      )}
    </ModalShell>
  )
}

function InterviewPrepView({ apps }: { apps: JobApp[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = apps.find((a) => a.id === selectedId) || null

  if (apps.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center text-center text-muted-foreground py-16">
        <GraduationCap className="w-8 h-8 mb-3 opacity-50" />
        <p>No applications yet. Apply to a job first, then come back here to prepare for its interview.</p>
      </Card>
    )
  }

  return (
    <section className="grid lg:grid-cols-[320px_1fr] gap-6">
      <div className="space-y-3">
        <h2 className="font-semibold">Prepare for an interview ({apps.length})</h2>
        {apps.map((a) => (
          <button key={a.id} onClick={() => setSelectedId(a.id)}
            className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedId === a.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm truncate">{a.job_title}</span>
              <StatusBadge status={a.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5"><Building2 className="w-3 h-3" /> {a.company}</p>
            <p className="text-xs text-primary mt-2">Prepare for this job →</p>
          </button>
        ))}
      </div>

      <div>
        {!selected ? (
          <Card className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-16">
            <GraduationCap className="w-8 h-8 mb-3 opacity-50" />
            <p>Select an application to prepare for its interview.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{selected.job_title}</h2>
                  <p className="text-muted-foreground flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {selected.company}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
            </Card>
            <InterviewTab key={selected.id} app={selected} />
          </div>
        )}
      </div>
    </section>
  )
}

function MessagesView({ apps }: { apps: JobApp[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = apps.find((a) => a.id === selectedId) || null

  if (apps.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center text-center text-muted-foreground py-16">
        <MessageSquare className="w-8 h-8 mb-3 opacity-50" />
        <p>No applications yet. Apply to a job first, then come back here to message its recruiter.</p>
      </Card>
    )
  }

  return (
    <section className="grid lg:grid-cols-[320px_1fr] gap-6">
      <div className="space-y-3">
        <h2 className="font-semibold">Messages ({apps.length})</h2>
        {apps.map((a) => (
          <button key={a.id} onClick={() => setSelectedId(a.id)}
            className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedId === a.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm truncate">{a.job_title}</span>
              <StatusBadge status={a.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5"><Building2 className="w-3 h-3" /> {a.company}</p>
          </button>
        ))}
      </div>

      <div>
        {!selected ? (
          <Card className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-16">
            <MessageSquare className="w-8 h-8 mb-3 opacity-50" />
            <p>Select an application to view messages with its recruiter.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{selected.job_title}</h2>
                  <p className="text-muted-foreground flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {selected.company}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
            </Card>
            <MessagesTab key={selected.id} appId={selected.id} />
          </div>
        )}
      </div>
    </section>
  )
}

function TasksView({ apps }: { apps: JobApp[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = apps.find((a) => a.id === selectedId) || null

  if (apps.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center text-center text-muted-foreground py-16">
        <ClipboardList className="w-8 h-8 mb-3 opacity-50" />
        <p>No applications yet. Apply to a job first — recruiters can assign you tasks once you have.</p>
      </Card>
    )
  }

  return (
    <section className="grid lg:grid-cols-[320px_1fr] gap-6">
      <div className="space-y-3">
        <h2 className="font-semibold">Tasks ({apps.length})</h2>
        {apps.map((a) => (
          <button key={a.id} onClick={() => setSelectedId(a.id)}
            className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedId === a.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm truncate">{a.job_title}</span>
              <StatusBadge status={a.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5"><Building2 className="w-3 h-3" /> {a.company}</p>
          </button>
        ))}
      </div>

      <div>
        {!selected ? (
          <Card className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-16">
            <ClipboardList className="w-8 h-8 mb-3 opacity-50" />
            <p>Select an application to view tasks assigned by its recruiter.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{selected.job_title}</h2>
                  <p className="text-muted-foreground flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {selected.company}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
            </Card>
            <ApplicantTasksTab key={selected.id} appId={selected.id} />
          </div>
        )}
      </div>
    </section>
  )
}

function InterviewHistoryView() {
  const [preps, setPreps] = useState<InterviewPrep[] | null>(null)
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  useEffect(() => {
    interviewHistory().then((d) => setPreps(d.items)).catch(() => setPreps([]))
    listInterviewSessions().then((d) => setSessions(d.items)).catch(() => setSessions([]))
  }, [])

  if (preps === null) return <p className="text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading history…</p>

  const empty = preps.length === 0 && sessions.length === 0
  if (empty) return <Card><p className="text-sm text-muted-foreground">No interview history yet. Open an application → Interview Prep tab → start an AI interview or get prep notes.</p></Card>

  return (
    <div className="space-y-6">
      {sessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground">Live AI interviews ({sessions.length})</h3>
          {sessions.map((s) => <SessionCard key={s.id} session={s} />)}
        </div>
      )}
      {preps.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground">Prep notes ({preps.length})</h3>
          {preps.map((h) => <HistoryCard key={h.id} prep={h} />)}
        </div>
      )}
    </div>
  )
}

function SessionCard({ session }: { session: InterviewSession }) {
  const [open, setOpen] = useState(false)
  return (
    <Card>
      <button onClick={() => setOpen(!open)} className="w-full text-left flex items-center justify-between">
        <div>
          <p className="font-semibold flex items-center gap-2"><GraduationCap className="w-4 h-4 text-emerald-400" /> Mock interview <span className="text-muted-foreground font-normal text-sm">· {session.job_title} @ {session.company}</span></p>
          <p className="text-xs text-muted-foreground">{session.created_at ? new Date(session.created_at * 1000).toLocaleString() : ''}</p>
        </div>
        <span className="text-xs text-primary">{open ? 'Hide' : 'View'}</span>
      </button>
      {open && (
        <div className="mt-3 border-t border-border pt-3 space-y-3 text-sm">
          {session.feedback && <div><p className="text-xs text-muted-foreground mb-1">Feedback</p><p className="whitespace-pre-wrap text-muted-foreground">{session.feedback}</p></div>}
          {session.transcript && session.transcript.length > 0 && (
            <details>
              <summary className="text-xs text-primary cursor-pointer">View transcript</summary>
              <div className="mt-2 space-y-1 max-h-72 overflow-y-auto">
                {session.transcript.map((t, i) => <p key={i} className="text-muted-foreground whitespace-pre-wrap">{t}</p>)}
              </div>
            </details>
          )}
        </div>
      )}
    </Card>
  )
}

function HistoryCard({ prep }: { prep: InterviewPrep }) {
  const [open, setOpen] = useState(false)
  return (
    <Card>
      <button onClick={() => setOpen(!open)} className="w-full text-left flex items-center justify-between">
        <div>
          <p className="font-semibold">{prep.round_name} <span className="text-muted-foreground font-normal text-sm">· {prep.job_title} @ {prep.company}</span></p>
          <p className="text-xs text-muted-foreground">{prep.created_at ? new Date(prep.created_at * 1000).toLocaleString() : ''}</p>
        </div>
        <span className="text-xs text-primary">{open ? 'Hide' : 'View'}</span>
      </button>
      {open && (
        <div className="mt-3 border-t border-border pt-3 space-y-3 text-sm">
          <div><p className="text-xs text-muted-foreground mb-1">Prep notes</p><p className="whitespace-pre-wrap text-muted-foreground max-h-72 overflow-y-auto">{prep.prep_notes}</p></div>
          <div><p className="text-xs text-muted-foreground mb-1">Likely questions</p><ol className="list-decimal list-inside space-y-1">{prep.likely_questions.map((q, i) => <li key={i}>{q}</li>)}</ol></div>
        </div>
      )}
    </Card>
  )
}

// ---------------- Browse + Apply modals ----------------

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 max-h-[85vh] overflow-y-auto" initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} onClick={(e) => e.stopPropagation()}>
        {children}
      </motion.div>
    </motion.div>
  )
}

const LOCATION_TYPE_OPTIONS: { value: LocationType; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'onsite', label: 'Onsite' },
  { value: 'hybrid', label: 'Hybrid' },
]

function BrowseModal({ jobs, hasResume, onClose, onPick }: { jobs: Job[]; hasResume: boolean; onClose: () => void; onPick: (j: Job) => void }) {
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [activeLocationTypes, setActiveLocationTypes] = useState<LocationType[]>([])

  const allTags = Array.from(new Set(jobs.flatMap((j) => j.tags || []))).sort()

  function toggleTag(t: string) {
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }
  function toggleLocationType(t: LocationType) {
    setActiveLocationTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  const filtered = jobs.filter((j) => {
    const tagOk = activeTags.length === 0 || activeTags.every((t) => (j.tags || []).includes(t))
    const locOk = activeLocationTypes.length === 0 || (j.location_type && activeLocationTypes.includes(j.location_type))
    return tagOk && locOk
  })

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Open roles</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
      </div>
      {!hasResume && <p className="text-xs text-amber-300 mb-3 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Upload your resume first — applying uses your stored resume.</p>}

      {jobs.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {LOCATION_TYPE_OPTIONS.map((l) => (
              <button key={l.value} onClick={() => toggleLocationType(l.value)}
                className={`text-[11px] px-2 py-0.5 rounded-full border ${activeLocationTypes.includes(l.value) ? 'bg-primary/20 text-primary border-primary/40' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                {l.label}
              </button>
            ))}
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((t) => (
                <button key={t} onClick={() => toggleTag(t)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border ${activeTags.includes(t) ? 'bg-secondary/20 text-secondary-foreground border-secondary/40' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{jobs.length === 0 ? 'No new roles to apply to right now.' : 'No roles match these filters.'}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((j) => (
            <button key={j.id} onClick={() => onPick(j)} className="w-full text-left rounded-lg border border-border p-3 hover:border-primary/40">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{j.role_title}</span>
                <span className="text-xs text-primary">Apply →</span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Building2 className="w-3 h-3" /> {j.company}{j.location ? ` · ${j.location}` : ''}{j.location_type ? ` · ${j.location_type}` : ''}</p>
              {j.tags && j.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {j.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>)}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  )
}

function ApplyModal({ job, resume, onClose, onApplied }: { job: Job; resume: ResumeProfile | null; onClose: () => void; onApplied: (id: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null); setLoading(true)
    try {
      const res = await applyToJob(job.id)
      onApplied(res.id)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to apply.') } finally { setLoading(false) }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold">Apply: {job.role_title}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
      </div>
      <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {job.company}</p>
      <Card className="bg-muted/20">
        <p className="text-sm font-medium flex items-center gap-1.5"><User className="w-4 h-4 text-primary" /> Applying with your resume</p>
        <p className="text-sm text-muted-foreground mt-1">{resume?.name || 'Your resume'} · {resume?.headline}</p>
        <div className="flex flex-wrap gap-1 mt-2">{(resume?.skills || []).slice(0, 8).map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s}</span>)}</div>
      </Card>
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      <button onClick={submit} disabled={loading} className="w-full mt-3 py-2 rounded-md bg-primary text-background font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Applying…</> : 'Confirm application'}
      </button>
    </ModalShell>
  )
}

// ---------------- Per-application tabbed workspace ----------------

function AppWorkspace({ app, job, onChanged }: { app: JobApp; job?: Job; onChanged: () => Promise<unknown> }) {
  const [tab, setTab] = useState<Tab>('skills')
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{app.job_title}</h2>
            <p className="text-muted-foreground flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {app.company}</p>
          </div>
          <StatusBadge status={app.status} />
        </div>
      </Card>

      <TabBar<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'skills', label: 'Skill Match', icon: FileSearch },
          { key: 'screening', label: 'Resume Screening', icon: FileText },
          { key: 'interview', label: 'Interview Prep', icon: GraduationCap },
          { key: 'messages', label: 'Messages', icon: MessageSquare },
          { key: 'tasks', label: 'Tasks', icon: ClipboardList },
        ]}
      />

      {tab === 'skills' && <SkillsTab job={job} />}
      {tab === 'screening' && <ScreeningTab app={app} onChanged={onChanged} />}
      {tab === 'interview' && <InterviewTab app={app} />}
      {tab === 'messages' && <MessagesTab appId={app.id} />}
      {tab === 'tasks' && <ApplicantTasksTab appId={app.id} />}
    </div>
  )
}

function SkillsTab({ job }: { job?: Job }) {
  if (!job) return <Card><p className="text-sm text-muted-foreground">Job details unavailable.</p></Card>
  const parsed = job.parsed_skills && job.parsed_skills.length > 0
  return (
    <Card>
      <p className="text-sm text-muted-foreground mb-3">What this role needs (parsed by the JD Parser agent):</p>
      {!parsed ? (
        <p className="text-sm text-muted-foreground">The recruiter hasn&apos;t run skill parsing on this role yet.</p>
      ) : (
        <div className="space-y-3 text-sm">
          {job.seniority_level && <p><span className="text-muted-foreground">Seniority:</span> {job.seniority_level}</p>}
          <div className="flex flex-wrap gap-1.5">{job.parsed_skills?.map((s) => <span key={s} className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-xs">{s}</span>)}</div>
          {job.jd_summary && <p className="text-muted-foreground border-t border-border pt-3">{job.jd_summary}</p>}
        </div>
      )}
    </Card>
  )
}

function ScreeningTab({ app, onChanged }: { app: JobApp; onChanged: () => Promise<unknown> }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{ summary: string; suggestions: string[] } | null>(
    app.screening_summary ? { summary: app.screening_summary, suggestions: app.screening_suggestions || [] } : null
  )

  async function run() {
    setError(null); setLoading(true)
    try { const res = await screenResume(app.id); setData(res); await onChanged() }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed.') } finally { setLoading(false) }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">The Resume Advisor agent compares your resume to this role.</p>
        <button onClick={run} disabled={loading} className="text-xs px-3 py-1.5 rounded-md bg-violet-500/20 text-violet-200 hover:bg-violet-500/30 disabled:opacity-60">
          {data ? 'Re-screen' : 'Screen my resume'}
        </button>
      </div>
      {loading && <AgentBusy label="Resume Advisor agent" />}
      {!loading && data && (
        <div className="mt-3 space-y-3 text-sm">
          <p>{data.summary}</p>
          <ul className="space-y-2">{data.suggestions.map((s, i) => <li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" /><span>{s}</span></li>)}</ul>
        </div>
      )}
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </Card>
  )
}

function InterviewTab({ app }: { app: JobApp }) {
  const [round, setRound] = useState('Technical Phone Screen')
  const [format, setFormat] = useState('video')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ prep_notes: string; likely_questions: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setError(null); setLoading(true); setResult(null)
    try { const res = await interviewPrep(app.id, { round_name: round, format }); setResult(res) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed.') } finally { setLoading(false) }
  }

  return (
    <Card>
      {/* Live AI mock interview launcher */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold flex items-center gap-2"><GraduationCap className="w-4 h-4 text-emerald-400" /> Take a live AI interview</p>
          <p className="text-sm text-muted-foreground">A real-time mock interview — the AI asks questions, you answer, and you get scored feedback. Opens in a new tab.</p>
        </div>
        <button onClick={() => window.open(`/interview/${app.id}`, '_blank')} className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-purple-600 text-background font-semibold whitespace-nowrap">
          Start AI Interview →
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-3">Or get one-shot prep notes: the Interview Prep agent researches the company and builds prep notes + likely questions. Saved to your <span className="text-foreground">Interview History</span>.</p>
      <div className="grid sm:grid-cols-2 gap-2 mb-3">
        <input value={round} onChange={(e) => setRound(e.target.value)} placeholder="Round name" className="px-3 py-2 rounded-md bg-muted/40 border border-border text-sm" />
        <select value={format} onChange={(e) => setFormat(e.target.value)} className="px-3 py-2 rounded-md bg-muted/40 border border-border text-sm">
          {['phone', 'video', 'onsite', 'take_home'].map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <button onClick={run} disabled={loading} className="text-xs px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-60">
        Take AI interview prep
      </button>
      {loading && <AgentBusy label="Interview Prep agent" />}
      {!loading && result && (
        <div className="mt-3 space-y-3 text-sm border-t border-border pt-3">
          <div><p className="text-xs text-muted-foreground mb-1">Prep notes</p><p className="whitespace-pre-wrap text-muted-foreground max-h-72 overflow-y-auto">{result.prep_notes}</p></div>
          <div><p className="text-xs text-muted-foreground mb-1">Likely questions</p><ol className="list-decimal list-inside space-y-1">{result.likely_questions.map((q, i) => <li key={i}>{q}</li>)}</ol></div>
        </div>
      )}
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </Card>
  )
}

function MessagesTab({ appId }: { appId: string }) {
  const [msgs, setMsgs] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const load = useCallback(() => listMessages(appId).then((d) => setMsgs(d.items)).catch(() => {}), [appId])
  useEffect(() => { load() }, [load])

  async function send() {
    if (!text.trim()) return
    setSending(true)
    try { await sendMessage(appId, text); setText(''); await load() } finally { setSending(false) }
  }

  return (
    <Card>
      <div className="space-y-2 max-h-72 overflow-y-auto mb-3">
        {msgs.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.from_role === 'admin' ? 'bg-secondary/15' : 'bg-primary/15 ml-auto'}`}>
            <p className="text-[10px] uppercase text-muted-foreground mb-0.5">{m.from_role === 'admin' ? 'Recruiter' : 'You'} · @{m.from_user}</p>
            <p className="whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type a message…" className="flex-1 px-3 py-2 rounded-md bg-muted/40 border border-border text-sm" />
        <button onClick={send} disabled={sending} className="px-3 py-2 rounded-md bg-primary text-background disabled:opacity-60"><Send className="w-4 h-4" /></button>
      </div>
    </Card>
  )
}

function ApplicantTasksTab({ appId }: { appId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const load = useCallback(() => listTasks(appId).then((d) => setTasks(d.items)).catch(() => {}), [appId])
  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-3">
      {tasks.length === 0 && <Card><p className="text-sm text-muted-foreground">No tasks assigned yet. The recruiter may send you a task here.</p></Card>}
      {tasks.map((t) => <TaskCard key={t.id} task={t} onSubmitted={load} />)}
    </div>
  )
}

function TaskCard({ task, onSubmitted }: { task: Task; onSubmitted: () => void }) {
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitted = task.status === 'submitted'

  async function submit() {
    setError(null)
    let file_base64 = ''
    let file_name = ''
    if (file) {
      if (file.size > 1024 * 1024) { setError('File must be ≤ 1 MB.'); return }
      file_base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve((r.result as string).split(',')[1])
        r.onerror = reject
        r.readAsDataURL(file)
      })
      file_name = file.name
    }
    setLoading(true)
    try { await submitTask(task.id, { submission_text: text, submission_url: url, file_base64, file_name }); onSubmitted() }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed.') } finally { setLoading(false) }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><ClipboardList className="w-4 h-4 text-amber-400" /> {task.title}</h3>
        <StatusBadge status={task.status} />
      </div>
      <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{task.instructions}</p>

      {submitted ? (
        <div className="mt-3 border-t border-border pt-3 text-sm space-y-1">
          <p className="text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Submitted</p>
          {task.submission_text && <p className="text-muted-foreground">{task.submission_text}</p>}
          {task.submission_url && <a href={task.submission_url} target="_blank" className="text-sky-400 hover:underline flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> {task.submission_url}</a>}
          {task.file_name && <button onClick={() => downloadAttachment(task.id, task.file_name || 'submission')} className="text-sky-400 hover:underline flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> {task.file_name}</button>}
        </div>
      ) : (
        <div className="mt-3 border-t border-border pt-3 space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Notes about your submission…" className="w-full px-3 py-2 rounded-md bg-muted/40 border border-border text-sm" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Submission link (e.g. GitHub repo)" className="w-full px-3 py-2 rounded-md bg-muted/40 border border-border text-sm" />
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <Paperclip className="w-4 h-4" />
            <span>{file ? file.name : 'Attach a file (≤ 1 MB)'}</span>
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button onClick={submit} disabled={loading} className="text-xs px-3 py-1.5 rounded-md bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 disabled:opacity-60">
            {loading ? 'Submitting…' : 'Submit task'}
          </button>
        </div>
      )}
    </Card>
  )
}
