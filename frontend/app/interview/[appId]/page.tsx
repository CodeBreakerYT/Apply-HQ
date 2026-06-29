'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Loader2, Send, Bot, User, CheckCircle2, ArrowLeft, ShieldAlert, Maximize, Ban } from 'lucide-react'
import { isLoggedIn } from '@/lib/auth'
import { startInterview, interviewReply, terminateInterview } from '@/lib/api'

interface ChatMsg { role: 'ai' | 'me'; text: string }

const MAX_VIOLATIONS = 3

export default function InterviewPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = use(params)
  const router = useRouter()
  const [phase, setPhase] = useState<'intro' | 'interview' | 'terminated'>('intro')
  const [convId, setConvId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [violations, setViolations] = useState(0)
  const [warning, setWarning] = useState<string | null>(null)
  const [terminationReason, setTerminationReason] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const convIdRef = useRef<string | null>(null)
  const endedRef = useRef(false)

  useEffect(() => {
    if (!isLoggedIn()) router.push('/login')
  }, [router])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, busy])

  const terminate = useCallback((reason: string) => {
    if (endedRef.current) return
    endedRef.current = true
    setTerminationReason(reason)
    setPhase('terminated')
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    if (convIdRef.current) terminateInterview(convIdRef.current, reason).catch(() => {})
  }, [])

  // ---- Proctoring: fullscreen exit, copy/paste, right-click, Esc ----
  useEffect(() => {
    if (phase !== 'interview') return

    function warn(label: string) {
      setViolations((v) => {
        const next = v + 1
        if (next >= MAX_VIOLATIONS) {
          terminate(`Too many policy violations (${label}).`)
        } else {
          setWarning(`Warning ${next}/${MAX_VIOLATIONS}: ${label} is not allowed during the interview.`)
          setTimeout(() => setWarning(null), 3000)
        }
        return next
      })
    }

    function onContextMenu(e: MouseEvent) { e.preventDefault(); warn('Right-click') }
    function onCopy(e: ClipboardEvent) { e.preventDefault(); warn('Copying') }
    function onPaste(e: ClipboardEvent) { e.preventDefault(); warn('Pasting') }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { terminate('Exited the interview (Esc pressed).'); return }
      const mod = e.ctrlKey || e.metaKey
      if (mod && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); warn('Copying') }
      if (mod && (e.key === 'v' || e.key === 'V')) { e.preventDefault(); warn('Pasting') }
    }
    function onFullscreenChange() {
      if (!document.fullscreenElement) terminate('Exited fullscreen mode.')
    }

    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('copy', onCopy)
    document.addEventListener('paste', onPaste)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [phase, terminate])

  async function begin() {
    setStarting(true)
    setError(null)
    try { await document.documentElement.requestFullscreen() } catch { /* fullscreen optional if unsupported */ }
    setPhase('interview')
    try {
      const res = await startInterview(appId)
      convIdRef.current = res.conversation_id
      setConvId(res.conversation_id)
      setMsgs([{ role: 'ai', text: res.message }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the interview.')
    } finally {
      setStarting(false)
    }
  }

  async function send() {
    if (!answer.trim() || !convId || busy || done) return
    const myAnswer = answer.trim()
    setAnswer('')
    setMsgs((m) => [...m, { role: 'me', text: myAnswer }])
    setBusy(true)
    setError(null)
    try {
      const res = await interviewReply(convId, myAnswer)
      setMsgs((m) => [...m, { role: 'ai', text: res.message }])
      if (res.done) { setDone(true); endedRef.current = true; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}) }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Zap className="w-5 h-5 text-background" />
            </div>
            <h1 className="font-bold">AI Interviewer · 5 questions</h1>
          </div>
          <p className="text-sm text-muted-foreground">This is a proctored mock interview:</p>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-center gap-2"><Maximize className="w-3.5 h-3.5 shrink-0" /> Runs in fullscreen.</li>
            <li className="flex items-center gap-2"><Ban className="w-3.5 h-3.5 shrink-0" /> Copy, paste, and right-click are disabled — 3 strikes ends the interview.</li>
            <li className="flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Pressing Esc ends the interview immediately.</li>
          </ul>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button onClick={begin} disabled={starting} className="w-full py-2.5 rounded-lg bg-primary text-background font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
            {starting ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</> : 'Start interview (fullscreen)'}
          </button>
          <button onClick={() => router.push('/dashboard')} className="w-full text-sm text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      </div>
    )
  }

  if (phase === 'terminated') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-card p-6 space-y-4 text-center">
          <ShieldAlert className="w-8 h-8 text-red-400 mx-auto" />
          <h1 className="font-bold">Interview terminated</h1>
          <p className="text-sm text-muted-foreground">{terminationReason}</p>
          <button onClick={() => router.push('/dashboard')} className="w-full py-2.5 rounded-lg bg-primary text-background font-semibold">Back to dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Zap className="w-5 h-5 text-background" />
            </div>
            <div>
              <h1 className="font-bold leading-tight">AI Interviewer</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Live mock interview · 5 questions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {violations > 0 && !done && (
              <span className="text-xs text-amber-400 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> {violations}/{MAX_VIOLATIONS}</span>
            )}
            <button onClick={() => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); window.close() }} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Close
            </button>
          </div>
        </div>
      </header>

      {warning && (
        <div className="bg-amber-500/15 text-amber-300 text-sm text-center py-2 border-b border-amber-500/30">{warning}</div>
      )}

      {/* Chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'me' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'ai' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}`}>
                {m.role === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm whitespace-pre-wrap select-none ${m.role === 'ai' ? 'bg-card border border-border' : 'bg-primary/15'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0"><Bot className="w-4 h-4" /></div>
              <div className="rounded-2xl px-4 py-2.5 bg-card border border-border text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Thinking…</div>
            </div>
          )}
          {done && (
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm pt-2">
              <CheckCircle2 className="w-4 h-4" /> Interview complete — saved to your Interview History.
            </div>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background/80 backdrop-blur">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {done ? (
            <button onClick={() => router.push('/dashboard')} className="w-full py-2.5 rounded-lg bg-primary text-background font-semibold">
              Back to dashboard
            </button>
          ) : (
            <div className="flex gap-2 items-end">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                onCopy={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                rows={2}
                placeholder={busy ? 'Please wait…' : 'Type your answer… (Enter to send, Shift+Enter for newline)'}
                disabled={busy}
                className="flex-1 px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm resize-none disabled:opacity-60"
              />
              <button onClick={send} disabled={busy || !answer.trim()} className="px-4 py-2.5 rounded-lg bg-primary text-background font-medium disabled:opacity-60">
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
