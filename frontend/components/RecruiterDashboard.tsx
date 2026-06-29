'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Loader2, Building2, FileSearch, Users, MessageSquare, ClipboardList,
  Sparkles, Send, Mail, Paperclip, ExternalLink, CheckCircle2, FileText, Pencil, Trash2, XCircle, Clock3,
} from 'lucide-react'
import {
  myJobs, createJob, updateJob, deleteJob, parseSkills, jobApplicants, myApplicants, draftMessage, assignTask,
  updateApplicationStatus, listMessages, sendMessage, sendEmailMessage, listTasks, downloadAttachment,
  type Job, type JobApp, type Message, type Task, type LocationType, type ApplicationStatus,
} from '@/lib/api'

const SUGGESTED_TAGS = ['ai', 'ml', 'gamedev', 'unity', 'unreal', 'backend', 'frontend', 'fullstack', 'data', 'devops', 'mobile', 'security']
const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'onsite', label: 'Onsite' },
  { value: 'hybrid', label: 'Hybrid' },
]
import { Card, AgentBusy, StatusBadge, TabBar } from '@/components/dash-ui'

type Tab = 'screening' | 'messages' | 'tasks'
type View = 'jobs' | 'messages'

export function RecruiterDashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [applicants, setApplicants] = useState<JobApp[]>([])
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [ready, setReady] = useState(false)
  const [view, setView] = useState<View>('jobs')

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || null
  const selectedApp = applicants.find((a) => a.id === selectedAppId) || null

  const refreshJobs = useCallback(async () => {
    const d = await myJobs()
    setJobs(d.items)
    return d.items
  }, [])

  useEffect(() => { refreshJobs().finally(() => setReady(true)) }, [refreshJobs])

  const loadApplicants = useCallback((jobId: string) => {
    setSelectedJobId(jobId); setSelectedAppId(null)
    jobApplicants(jobId).then((d) => setApplicants(d.items)).catch(() => setApplicants([]))
  }, [])

  const refreshApplicants = useCallback(() => {
    if (selectedJobId) jobApplicants(selectedJobId).then((d) => setApplicants(d.items)).catch(() => {})
  }, [selectedJobId])

  if (!ready) {
    return <div className="max-w-7xl mx-auto px-6 py-12 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…</div>
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recruiter Dashboard</h1>
          <p className="text-muted-foreground text-sm">Post roles, let AI parse skills & screen applicants, message and assign tasks.</p>
        </div>
        <button onClick={() => setPosting(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-background font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> Post a job
        </button>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([['jobs', 'Jobs & Applicants', Users], ['messages', 'Messages', MessageSquare]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setView(k)} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${view === k ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {view === 'jobs' && (
        <section className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* My jobs */}
          <div className="space-y-3">
            <h2 className="font-semibold">My jobs ({jobs.length})</h2>
            {jobs.length === 0 && <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No jobs yet. Click <span className="text-foreground">Post a job</span>.</div>}
            {jobs.map((j) => (
              <button key={j.id} onClick={() => loadApplicants(j.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedJobId === j.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}>
                <span className="font-medium text-sm">{j.role_title}</span>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Building2 className="w-3 h-3" /> {j.company}{j.location_type ? ` · ${j.location_type}` : ''}</p>
                {j.tags && j.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {j.tags.slice(0, 4).map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>)}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Job + applicants workspace */}
          <div>
            {!selectedJob ? (
              <Card className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-16">
                <Users className="w-8 h-8 mb-3 opacity-50" />
                <p>Select a job to manage applicants.</p>
              </Card>
            ) : (
              <JobWorkspace
                job={selectedJob}
                applicants={applicants}
                selectedApp={selectedApp}
                onSelectApp={setSelectedAppId}
                onJobChanged={async () => { await refreshJobs() }}
                onEdit={() => setEditingJob(selectedJob)}
                onDeleted={async () => { setSelectedJobId(null); setApplicants([]); await refreshJobs() }}
                onApplicantChanged={refreshApplicants}
              />
            )}
          </div>
        </section>
      )}

      {view === 'messages' && <RecruiterMessagesView />}

      <AnimatePresence>
        {posting && <PostJobModal onClose={() => setPosting(false)} onPosted={async () => { setPosting(false); await refreshJobs() }} />}
        {editingJob && (
          <PostJobModal
            job={editingJob}
            onClose={() => setEditingJob(null)}
            onPosted={async () => { setEditingJob(null); await refreshJobs() }}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

function RecruiterMessagesView() {
  const [applicants, setApplicants] = useState<JobApp[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => { myApplicants().then((d) => setApplicants(d.items)).catch(() => setApplicants([])) }, [])

  if (applicants === null) {
    return <p className="text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading applicants…</p>
  }

  const selected = applicants.find((a) => a.id === selectedId) || null

  if (applicants.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center text-center text-muted-foreground py-16">
        <Users className="w-8 h-8 mb-3 opacity-50" />
        <p>No one has applied to your jobs yet. You can only message applicants — once someone applies, they&apos;ll show up here.</p>
      </Card>
    )
  }

  return (
    <section className="grid lg:grid-cols-[300px_1fr] gap-6">
      <div className="space-y-2">
        <h2 className="font-semibold text-sm flex items-center gap-1.5"><Users className="w-4 h-4" /> Applicants you can message ({applicants.length})</h2>
        {applicants.map((a) => (
          <button key={a.id} onClick={() => setSelectedId(a.id)}
            className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedId === a.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">@{a.applicant}</span>
              <StatusBadge status={a.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{a.job_title} <span className="opacity-70">· {a.company}</span></p>
          </button>
        ))}
      </div>

      <div>
        {!selected ? (
          <Card className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-16">
            <MessageSquare className="w-8 h-8 mb-3 opacity-50" />
            <p>Select an applicant to message them.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">@{selected.applicant}</h2>
                  <p className="text-muted-foreground text-sm">{selected.job_title} · {selected.company}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
            </Card>
            <RecruiterMessagesTab key={selected.id} appId={selected.id} />
          </div>
        )}
      </div>
    </section>
  )
}

function PostJobModal({ job, onClose, onPosted }: { job?: Job; onClose: () => void; onPosted: () => void }) {
  const isEdit = !!job
  const [company, setCompany] = useState(job?.company || '')
  const [role, setRole] = useState(job?.role_title || '')
  const [location, setLocation] = useState(job?.location || '')
  const [locationType, setLocationType] = useState<LocationType>(job?.location_type || 'remote')
  const [desc, setDesc] = useState(job?.description || '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(job?.tags || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }
  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t))
  }

  async function submit() {
    setError(null)
    if (!company.trim() || !role.trim() || !desc.trim()) { setError('Company, role and description are required.'); return }
    setLoading(true)
    try {
      const body = { company, role_title: role, location, location_type: locationType, description: desc, tags }
      if (isEdit && job) await updateJob(job.id, body)
      else await createJob(body)
      onPosted()
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed.') } finally { setLoading(false) }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 space-y-3 max-h-[85vh] overflow-y-auto" initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="font-semibold">{isEdit ? 'Edit job' : 'Post a job'}</h3><button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button></div>
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className="px-3 py-2 rounded-md bg-muted/40 border border-border text-sm" />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role title" className="px-3 py-2 rounded-md bg-muted/40 border border-border text-sm" />
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional, e.g. city)" className="px-3 py-2 rounded-md bg-muted/40 border border-border text-sm" />
          <select value={locationType} onChange={(e) => setLocationType(e.target.value as LocationType)} className="px-3 py-2 rounded-md bg-muted/40 border border-border text-sm">
            {LOCATION_TYPES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={6} placeholder="Paste the full job description…" className="w-full px-3 py-2 rounded-md bg-muted/40 border border-border text-sm" />

        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Tags — helps applicants filter (e.g. ai, ml, gamedev, unity, unreal)</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                {t}
                <button onClick={() => removeTag(t)} className="hover:text-foreground"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
            placeholder="Type a tag and press Enter…"
            className="w-full px-3 py-2 rounded-md bg-muted/40 border border-border text-sm mb-2"
          />
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_TAGS.filter((s) => !tags.includes(s)).map((s) => (
              <button key={s} onClick={() => addTag(s)} className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground">
                + {s}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <button onClick={submit} disabled={loading} className="w-full py-2 rounded-md bg-primary text-background font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> {isEdit ? 'Saving…' : 'Posting…'}</>
            : (isEdit ? 'Save changes' : 'Post job')}
        </button>
      </motion.div>
    </motion.div>
  )
}

function JobWorkspace({ job, applicants, selectedApp, onSelectApp, onJobChanged, onEdit, onDeleted, onApplicantChanged }: {
  job: Job; applicants: JobApp[]; selectedApp: JobApp | null; onSelectApp: (id: string) => void; onJobChanged: () => Promise<void>
  onEdit: () => void; onDeleted: () => Promise<void>; onApplicantChanged: () => void
}) {
  const [parsing, setParsing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const parsed = job.parsed_skills && job.parsed_skills.length > 0

  async function runParse() {
    setParsing(true)
    try { await parseSkills(job.id); await onJobChanged() } finally { setParsing(false) }
  }

  async function confirmAndDelete() {
    setDeleting(true)
    try { await deleteJob(job.id); await onDeleted() } finally { setDeleting(false) }
  }

  return (
    <div className="space-y-4">
      {/* Job header + skill parsing */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{job.role_title}</h2>
            <p className="text-muted-foreground flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {job.company}{job.location ? ` · ${job.location}` : ''}{job.location_type ? ` · ${job.location_type}` : ''}</p>
            {job.tags && job.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {job.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={onEdit} className="text-xs px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={() => setConfirmDelete(true)} className="text-xs px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:text-red-400 hover:border-red-400/40 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button onClick={runParse} disabled={parsing} className="text-xs px-3 py-1.5 rounded-md bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-60 flex items-center gap-1.5">
              <FileSearch className="w-3.5 h-3.5" /> {parsed ? 'Re-parse skills' : 'Parse skills'}
            </button>
          </div>
        </div>
        {parsing && <AgentBusy label="JD Parser agent" />}
        {!parsing && parsed && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {job.parsed_skills?.map((s) => <span key={s} className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-xs">{s}</span>)}
          </div>
        )}
      </Card>

      {confirmDelete && (
        <Card className="border-red-500/40 bg-red-500/5">
          <p className="text-sm mb-3">
            Delete <span className="font-semibold">{job.role_title}</span> at {job.company}? This removes the posting and
            {applicants.length > 0 ? ` all ${applicants.length} applicant${applicants.length > 1 ? 's' : ''} (messages, tasks, interview data) attached to it` : ' it'} — this cannot be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={confirmAndDelete} disabled={deleting} className="text-xs px-3 py-1.5 rounded-md bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-60 flex items-center gap-1.5">
              {deleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</> : 'Yes, delete it'}
            </button>
            <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* Applicants */}
      <div className="grid sm:grid-cols-[240px_1fr] gap-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-1.5"><Users className="w-4 h-4" /> Applicants ({applicants.length})</h3>
          {applicants.length === 0 && <p className="text-sm text-muted-foreground">No applicants yet.</p>}
          {applicants.map((a) => (
            <button key={a.id} onClick={() => onSelectApp(a.id)}
              className={`w-full text-left rounded-lg border p-2.5 text-sm transition-colors ${selectedApp?.id === a.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}>
              <div className="flex items-center justify-between"><span className="font-medium">@{a.applicant}</span><StatusBadge status={a.status} /></div>
            </button>
          ))}
        </div>

        <div>
          {!selectedApp ? (
            <Card className="text-center text-muted-foreground py-10"><p className="text-sm">Select an applicant.</p></Card>
          ) : (
            <ApplicantWorkspace app={selectedApp} onStatusChanged={onApplicantChanged} />
          )}
        </div>
      </div>
    </div>
  )
}

function DecisionBar({ app, onStatusChanged }: { app: JobApp; onStatusChanged: () => void }) {
  const [loading, setLoading] = useState<ApplicationStatus | null>(null)

  async function setStatus(status: ApplicationStatus) {
    setLoading(status)
    try { await updateApplicationStatus(app.id, status); onStatusChanged() } finally { setLoading(null) }
  }

  const buttons: { status: ApplicationStatus; label: string; icon: typeof CheckCircle2; className: string }[] = [
    { status: 'under_review', label: 'Under Review', icon: Clock3, className: 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30' },
    { status: 'accepted', label: 'Accept', icon: CheckCircle2, className: 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30' },
    { status: 'rejected', label: 'Reject', icon: XCircle, className: 'bg-red-500/20 text-red-200 hover:bg-red-500/30' },
  ]

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Decision:</span>
        <StatusBadge status={app.status} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {buttons.map((b) => (
          <button key={b.status} onClick={() => setStatus(b.status)} disabled={loading !== null || app.status === b.status}
            className={`text-xs px-3 py-1.5 rounded-md disabled:opacity-40 flex items-center gap-1.5 ${b.className}`}>
            {loading === b.status ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <b.icon className="w-3.5 h-3.5" />} {b.label}
          </button>
        ))}
      </div>
    </Card>
  )
}

function ApplicantWorkspace({ app, onStatusChanged }: { app: JobApp; onStatusChanged: () => void }) {
  const [tab, setTab] = useState<Tab>('screening')
  return (
    <div className="space-y-3">
      <DecisionBar app={app} onStatusChanged={onStatusChanged} />
      <TabBar<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'screening', label: 'Resume', icon: FileText },
          { key: 'messages', label: 'Messager', icon: MessageSquare },
          { key: 'tasks', label: 'Tasks', icon: ClipboardList },
        ]}
      />
      {tab === 'screening' && <RecruiterScreeningTab app={app} />}
      {tab === 'messages' && <RecruiterMessagesTab appId={app.id} />}
      {tab === 'tasks' && <RecruiterTasksTab appId={app.id} />}
    </div>
  )
}

function RecruiterScreeningTab({ app }: { app: JobApp }) {
  return (
    <Card>
      <h3 className="font-semibold text-sm mb-2">@{app.applicant}&apos;s resume</h3>
      <p className="text-sm whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto">{app.resume_text || 'No resume text.'}</p>
      {app.screening_summary && (
        <div className="border-t border-border pt-3 mt-3 text-sm">
          <p className="text-xs text-muted-foreground mb-1">AI screening (resume vs role)</p>
          <p>{app.screening_summary}</p>
          {app.screening_suggestions && app.screening_suggestions.length > 0 && (
            <ul className="mt-2 space-y-1">{app.screening_suggestions.map((s, i) => <li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" /><span>{s}</span></li>)}</ul>
          )}
        </div>
      )}
    </Card>
  )
}

function RecruiterMessagesTab({ appId }: { appId: string }) {
  const [msgs, setMsgs] = useState<Message[]>([])
  const [subject, setSubject] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null)

  const load = useCallback(() => listMessages(appId).then((d) => setMsgs(d.items)).catch(() => {}), [appId])
  useEffect(() => { load() }, [load])

  async function send() {
    if (!text.trim()) return
    setSending(true)
    try { await sendMessage(appId, text); setText(''); await load() } finally { setSending(false) }
  }

  async function aiDraft() {
    setDrafting(true)
    try {
      const d = await draftMessage(appId)
      setSubject(d.subject || subject)
      setText(d.body || text)
    } finally { setDrafting(false) }
  }

  async function sendViaEmail() {
    if (!subject.trim() || !text.trim()) { setEmailError('Subject and message are required to send a real email.'); return }
    setEmailError(null); setEmailSentTo(null); setEmailing(true)
    try {
      const res = await sendEmailMessage(appId, subject, text)
      setEmailSentTo(res.recipient_email)
      setSubject(''); setText('')
      await load()
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : 'Failed to send email.')
    } finally { setEmailing(false) }
  }

  return (
    <Card>
      <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
        {msgs.length === 0 && <p className="text-sm text-muted-foreground">No messages yet — start the conversation.</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.from_role === 'admin' ? 'bg-secondary/15 ml-auto' : 'bg-primary/15'}`}>
            <p className="text-[10px] uppercase text-muted-foreground mb-0.5">{m.from_role === 'admin' ? 'You / Recruiter' : 'Applicant'} · @{m.from_user}</p>
            <p className="whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
      </div>
      <button onClick={aiDraft} disabled={drafting} className="text-xs px-3 py-1.5 rounded-md bg-sky-500/20 text-sky-200 hover:bg-sky-500/30 disabled:opacity-60 mb-2 inline-flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" /> {drafting ? 'Drafting…' : 'AI draft message'}
      </button>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (needed to send via email)" className="w-full mb-2 px-3 py-2 rounded-md bg-muted/40 border border-border text-sm" />
      <div className="flex gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Type or AI-draft a message…" className="flex-1 px-3 py-2 rounded-md bg-muted/40 border border-border text-sm" />
        <div className="flex flex-col gap-1.5">
          <button onClick={send} disabled={sending} title="Send in-app" className="px-3 py-2 rounded-md bg-primary text-background disabled:opacity-60"><Send className="w-4 h-4" /></button>
          <button onClick={sendViaEmail} disabled={emailing} title="Send via Gmail" className="px-3 py-2 rounded-md bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-60"><Mail className="w-4 h-4" /></button>
        </div>
      </div>
      {emailing && <AgentBusy label="Sending via Gmail" />}
      {emailError && <p className="text-sm text-red-400 mt-2">{emailError}</p>}
      {emailSentTo && <p className="text-sm text-emerald-400 mt-2">Sent via email to {emailSentTo}</p>}
    </Card>
  )
}

function RecruiterTasksTab({ appId }: { appId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => listTasks(appId).then((d) => setTasks(d.items)).catch(() => {}), [appId])
  useEffect(() => { load() }, [load])

  async function assign() {
    if (!title.trim() || !instructions.trim()) return
    setLoading(true)
    try { await assignTask(appId, { title, instructions }); setTitle(''); setInstructions(''); await load() } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <Card>
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-amber-400" /> Assign a task</h3>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="w-full px-3 py-2 rounded-md bg-muted/40 border border-border text-sm mb-2" />
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} placeholder="Instructions — the applicant submits via link + optional file (≤1MB)." className="w-full px-3 py-2 rounded-md bg-muted/40 border border-border text-sm mb-2" />
        <button onClick={assign} disabled={loading} className="text-xs px-3 py-1.5 rounded-md bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 disabled:opacity-60">
          {loading ? 'Assigning…' : 'Assign task'}
        </button>
      </Card>

      {tasks.map((t) => (
        <Card key={t.id}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{t.title}</h3>
            <StatusBadge status={t.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{t.instructions}</p>
          {t.status === 'submitted' && (
            <div className="border-t border-border pt-3 mt-3 text-sm space-y-1">
              <p className="text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Submission received</p>
              {t.submission_text && <p className="text-muted-foreground">{t.submission_text}</p>}
              {t.submission_url && <a href={t.submission_url} target="_blank" className="text-sky-400 hover:underline flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> {t.submission_url}</a>}
              {t.file_name && <button onClick={() => downloadAttachment(t.id, t.file_name || 'submission')} className="text-sky-400 hover:underline flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> Download {t.file_name}</button>}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
