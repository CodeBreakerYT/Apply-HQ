'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkles, FileSearch, FileText, Mail, GraduationCap, MapPin, Building2, ArrowRight, Briefcase } from 'lucide-react'
import { NavBar } from '@/components/NavBar'
import { listJobs, type Job } from '@/lib/api'
import { isLoggedIn, getRole } from '@/lib/auth'

const AGENTS = [
  { name: 'JD Parser', icon: FileSearch, color: 'text-cyan-400' },
  { name: 'Resume Advisor', icon: FileText, color: 'text-violet-400' },
  { name: 'Recruiter Messenger', icon: Mail, color: 'text-sky-400' },
  { name: 'Interview Prep', icon: GraduationCap, color: 'text-emerald-400' },
]

export default function Home() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listJobs().then((d) => setJobs(d.items)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function handleApply(jobId: string) {
    if (!isLoggedIn()) {
      router.push(`/signup?next=apply=${jobId}`)
    } else if (getRole() === 'applicant') {
      router.push(`/dashboard?apply=${jobId}`)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen">
      <NavBar />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-10 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Powered by 4 AI agents
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
            Your AI Job Application
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Command Centre</span>
          </h1>
          <p className="mt-5 text-muted-foreground max-w-2xl mx-auto">
            Browse roles, apply with your resume, and let AI screen your fit, prep you for interviews, and
            draft your recruiter messages. Recruiters post jobs, review applicants, and assign tasks — all in one place.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <button onClick={() => router.push('/signup')} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-primary to-purple-600 text-background font-semibold hover:shadow-lg hover:shadow-primary/40 transition">
              Get started
            </button>
            <a href="#jobs" className="px-5 py-2.5 rounded-lg border border-border hover:bg-muted/40 transition">Browse jobs</a>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {AGENTS.map((a) => (
              <div key={a.name} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-sm">
                <a.icon className={`w-4 h-4 ${a.color}`} /> {a.name}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Job board */}
      <section id="jobs" className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="w-6 h-6 text-primary" /> Open roles</h2>
          <span className="text-sm text-muted-foreground">{jobs.length} job{jobs.length === 1 ? '' : 's'}</span>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading jobs…</p>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No jobs posted yet. Recruiters — <button onClick={() => router.push('/signup')} className="text-primary hover:underline">sign up</button> to post the first one.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <motion.div key={job.id} className="rounded-xl border border-border bg-card p-5 flex flex-col" whileHover={{ y: -3 }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-lg">{job.role_title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {job.company}</p>
                  </div>
                </div>
                {job.location && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</p>}
                <p className="text-sm text-muted-foreground mt-3 line-clamp-3 flex-1">{job.jd_summary || job.description}</p>
                {job.parsed_skills && job.parsed_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {job.parsed_skills.slice(0, 5).map((s) => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s}</span>
                    ))}
                  </div>
                )}
                <button onClick={() => handleApply(job.id)} className="mt-4 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-background font-medium hover:opacity-90 transition">
                  Apply <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          ApplyHQ — AI Job Application Command Centre · built on Lemma + Firebase
        </div>
      </footer>
    </div>
  )
}
