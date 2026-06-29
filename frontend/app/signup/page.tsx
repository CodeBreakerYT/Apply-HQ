'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, Lock, User, Mail, ArrowLeft, Briefcase, Building2 } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { ParticleBackground } from '@/components/ParticleBackground'
import { Suspense, useState } from 'react'
import { signUp, type Role } from '@/lib/auth'

function SignupInner() {
  const router = useRouter()
  const params = useSearchParams()
  const nextParam = params.get('next')
  const [role, setRole] = useState<Role>('applicant')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await signUp(username, password, role, email)
      router.push(nextParam ? `/dashboard?${nextParam}` : '/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ParticleBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-20">
        <motion.div className="w-full max-w-md" variants={staggerContainer} initial="initial" animate="animate">
          <Link href="/">
            <motion.button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8" variants={staggerItem} whileHover={{ gap: '0.75rem' }}>
              <ArrowLeft className="w-4 h-4" /> Back to home
            </motion.button>
          </Link>

          <motion.div variants={staggerItem} className="space-y-2 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Zap className="w-6 h-6 text-background" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">ApplyHQ</h1>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Create your account</h2>
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">Sign in</Link>
            </p>
          </motion.div>

          <motion.form
            onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
            className="relative rounded-lg overflow-hidden p-8 space-y-5"
            variants={staggerItem}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
            <div className="absolute inset-0 border border-primary/20" />

            <div className="relative space-y-5">
              {/* Role toggle */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">I am a…</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setRole('applicant')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${role === 'applicant' ? 'border-primary bg-primary/10 text-foreground' : 'border-primary/20 text-muted-foreground hover:bg-muted/30'}`}>
                    <Briefcase className="w-4 h-4" /> Job Seeker
                  </button>
                  <button type="button" onClick={() => setRole('admin')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${role === 'admin' ? 'border-secondary bg-secondary/10 text-foreground' : 'border-primary/20 text-muted-foreground hover:bg-muted/30'}`}>
                    <Building2 className="w-4 h-4" /> Recruiter
                  </button>
                </div>
              </div>

              <Field icon={User} label="Username" type="text" value={username} onChange={setUsername} placeholder="yourusername" />
              <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
              <Field icon={Lock} label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
              <Field icon={Lock} label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />

              {error && <p className="text-sm text-red-400">{error}</p>}

              <motion.button type="submit" disabled={loading}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-primary to-purple-600 text-background font-semibold hover:shadow-lg hover:shadow-primary/50 transition-all disabled:opacity-60"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                {loading ? 'Creating account…' : `Create ${role === 'admin' ? 'recruiter' : 'job seeker'} account`}
              </motion.button>
            </div>
          </motion.form>
        </motion.div>
      </div>
    </>
  )
}

function Field({ icon: Icon, label, type, value, onChange, placeholder }: {
  icon: typeof User; label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-foreground">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
        <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/30 border border-primary/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all" />
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupInner />
    </Suspense>
  )
}
