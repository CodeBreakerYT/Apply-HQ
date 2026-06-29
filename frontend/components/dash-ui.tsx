'use client'

import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>{children}</div>
}

export function AgentBusy({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-primary py-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{label} is working{hint ? ` — ${hint}` : '…'}</span>
    </div>
  )
}

export function Spinner() {
  return <Loader2 className="w-4 h-4 animate-spin inline" />
}

const STATUS_COLORS: Record<string, string> = {
  saved: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  applied: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  open: 'bg-green-500/20 text-green-300 border-green-500/30',
  assigned: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  submitted: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  screening: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  under_review: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  interviewing: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  offer: 'bg-green-500/20 text-green-300 border-green-500/30',
  accepted: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[status] || STATUS_COLORS.saved}`}>
      {status}
    </span>
  )
}

export function DecisionToast({ accepted, message, onDone }: { accepted: boolean; message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5800)
    return () => clearTimeout(t)
  }, [onDone])

  const edge = accepted ? '#10b981' : '#ef4444'
  const glow = accepted ? 'rgba(16,185,129,0.65)' : 'rgba(239,68,68,0.65)'

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, x: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="fixed top-5 right-5 z-[100] w-[340px]"
    >
      <div className="relative rounded-xl">
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ boxShadow: `-10px 10px 36px 2px ${glow}` }}
          animate={{ boxShadow: '-10px 10px 36px 2px rgba(0,0,0,0)' }}
          transition={{ delay: 1, duration: 2.4, ease: 'easeOut' }}
        />
        <div
          className="relative rounded-xl border border-border bg-card/95 backdrop-blur px-4 py-3.5"
          style={{ borderLeft: `3px solid ${edge}`, borderBottom: `3px solid ${edge}` }}
        >
          <div className="flex items-start gap-2.5">
            {accepted ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
            <p className="text-sm font-medium leading-snug">{message}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function TabBar<T extends string>({ tabs, active, onChange }: {
  tabs: { key: T; label: string; icon?: typeof Loader2 }[]
  active: T
  onChange: (t: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.icon && <t.icon className="w-4 h-4" />} {t.label}
        </button>
      ))}
    </div>
  )
}
